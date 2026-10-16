// Production ClientTransport: the generic message bridge exposed by the preload script.
import type { RequestMessage } from '@template/sdk'
import type { ClientTransport } from '@template/sdk/frontend'

interface ElectronApi {
  send: (message: unknown) => void
  onMessage: (listener: (raw: unknown) => void) => () => void
}

declare global {
  interface Window {
    electronApi: ElectronApi
  }
}

export class IpcClientTransport implements ClientTransport {
  send(message: RequestMessage): void {
    window.electronApi.send(message)
  }

  onMessage(listener: (raw: unknown) => void): void {
    window.electronApi.onMessage(listener)
  }
}
