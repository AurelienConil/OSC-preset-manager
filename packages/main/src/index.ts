// Electron app bootstrap: window, lifecycle, plugin host and transport selection.
// Wiring only, no business logic (CLAUDE.md §4).
import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { WS_DEV_PORT } from '@template/shared'
import { AppDataPathProvider } from './path-provider/app-data-path-provider'
import { PluginHost } from './plugin-host/plugin-host'
import { enabledPlugins } from './plugin-registry'
import { wireApp } from './app-wiring'
import { IpcHostTransport } from './transport/ipc-host-transport'
import { WsHostTransport } from './transport/ws-host-transport'
import type { HostTransport } from './transport/host-transport.types'

// Only `electron-vite dev` sets this env var (live Vite dev server for the
// renderer); it is absent both for `electron-vite preview` (local prod check)
// and for a real packaged build, so it is the one reliable dev/prod signal —
// `app.isPackaged` alone stays false in the preview case too.
const isDevServer = Boolean(process.env['ELECTRON_RENDERER_URL'])

function createWindow(): void {
  const window = new BrowserWindow({
    width: 900,
    height: 670,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDevServer) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'] as string)
    window.webContents.openDevTools()
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTransport(): HostTransport {
  return isDevServer ? new WsHostTransport(WS_DEV_PORT) : new IpcHostTransport()
}

function bootstrap(): PluginHost {
  const host = new PluginHost({
    transport: createTransport(),
    paths: new AppDataPathProvider(app.getPath('userData')),
  })
  host.load(enabledPlugins)
  wireApp(host)
  return host
}

let pluginHost: PluginHost | undefined
let isShuttingDown = false

app.whenReady().then(() => {
  pluginHost = bootstrap()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', (event) => {
  if (isShuttingDown || !pluginHost) return
  event.preventDefault()
  isShuttingDown = true
  pluginHost.stop().finally(() => app.quit())
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
