// Electron app bootstrap: window, lifecycle, plugin host, WebSocket transport and remote GUI server.
// Wiring only, no business logic (CLAUDE.md §4).
import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { REMOTE_UI_HTTP_PORT, WS_PORT } from '@template/shared'
import { AppDataPathProvider } from './path-provider/app-data-path-provider'
import { PluginHost } from './plugin-host/plugin-host'
import { enabledPlugins } from './plugin-registry'
import { wireApp } from './app-wiring'
import { RemoteUiServer } from './remote-ui/remote-ui-server'
import { WsHostTransport } from './transport/ws-host-transport'

// Only `electron-vite dev` sets this env var (live Vite dev server for the
// renderer); it is absent both for `electron-vite preview` (local prod check)
// and for a real packaged build, so it is the one reliable dev/prod signal —
// `app.isPackaged` alone stays false in the preview case too.
const isDevServer = Boolean(process.env['ELECTRON_RENDERER_URL'])
const rendererFolder = join(__dirname, '../renderer')

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
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
    window.loadFile(join(rendererFolder, 'index.html'))
  }
}

interface Services {
  host: PluginHost
  transport: WsHostTransport
  remoteUi: RemoteUiServer | undefined
}

// The GUI always talks to main over WebSocket, in development and production
// (spec §10, the original template used IPC in production):
// the Electron window and any phone on the LAN are equal clients.
function bootstrap(): Services {
  const transport = new WsHostTransport(WS_PORT)
  const host = new PluginHost({ transport, paths: new AppDataPathProvider(app.getPath('userData')) })
  host.load(enabledPlugins)
  wireApp(host)

  let remoteUi: RemoteUiServer | undefined
  if (!isDevServer) {
    remoteUi = new RemoteUiServer(rendererFolder)
    remoteUi.listen(REMOTE_UI_HTTP_PORT)
  }
  return { host, transport, remoteUi }
}

let services: Services | undefined
let isShuttingDown = false

app.whenReady().then(() => {
  services = bootstrap()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', (event) => {
  if (isShuttingDown || !services) return
  event.preventDefault()
  isShuttingDown = true
  const { host, transport, remoteUi } = services
  host
    .stop()
    .then(() => Promise.all([transport.close(), remoteUi?.close()]))
    .finally(() => app.quit())
})

// Closing the window quits on every platform, macOS included: the host (WebSocket, remote GUI) must not
// keep running headless. `before-quit` then stops the plugins and servers before exiting.
app.on('window-all-closed', () => {
  app.quit()
})
