// Production HostTransport over the single generic IPC channel.
import { BrowserWindow, ipcMain } from 'electron'
import type { PushMessage } from '@template/sdk'
import { APP_IPC_CHANNEL } from '@template/shared'
import type { HostMessageListener, HostTransport } from './host-transport.types'

export class IpcHostTransport implements HostTransport {
  onMessage(listener: HostMessageListener): void {
    ipcMain.on(APP_IPC_CHANNEL, (event, raw: unknown) => {
      listener(raw, (message) => {
        if (!event.sender.isDestroyed()) event.sender.send(APP_IPC_CHANNEL, message)
      })
    })
  }

  broadcast(message: PushMessage): void {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(APP_IPC_CHANNEL, message)
    }
  }
}
