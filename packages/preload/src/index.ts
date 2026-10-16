// Exposes a generic message bridge through contextBridge; main validates every message.
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { APP_IPC_CHANNEL } from '@template/shared'

contextBridge.exposeInMainWorld('electronApi', {
  send: (message: unknown) => ipcRenderer.send(APP_IPC_CHANNEL, message),
  onMessage: (listener: (raw: unknown) => void) => {
    const handler = (_event: IpcRendererEvent, raw: unknown) => listener(raw)
    ipcRenderer.on(APP_IPC_CHANNEL, handler)
    return () => ipcRenderer.off(APP_IPC_CHANNEL, handler)
  },
})
