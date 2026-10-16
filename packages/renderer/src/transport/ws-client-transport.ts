// Development ClientTransport over the dev WebSocket; queues messages until the socket opens.
import type { RequestMessage } from '@template/sdk'
import type { ClientTransport } from '@template/sdk/frontend'

export class WsClientTransport implements ClientTransport {
  private readonly socket: WebSocket
  private readonly outbox: string[] = []
  private readonly listeners: ((raw: unknown) => void)[] = []

  constructor(url: string) {
    this.socket = new WebSocket(url)
    this.socket.addEventListener('open', () => {
      for (const message of this.outbox.splice(0)) this.socket.send(message)
    })
    this.socket.addEventListener('message', (event) => {
      const raw: unknown = JSON.parse(event.data as string)
      for (const listener of this.listeners) listener(raw)
    })
  }

  send(message: RequestMessage): void {
    const data = JSON.stringify(message)
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(data)
    else this.outbox.push(data)
  }

  onMessage(listener: (raw: unknown) => void): void {
    this.listeners.push(listener)
  }
}
