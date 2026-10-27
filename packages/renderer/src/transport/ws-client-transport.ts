// ClientTransport over the WebSocket of main; queues messages until the socket opens,
// and reloads the page once main is reachable again after a disconnection.
import type { RequestMessage } from '@template/sdk'
import type { ClientTransport } from '@template/sdk/frontend'

const RECONNECT_DELAY_MS = 1500

export class WsClientTransport implements ClientTransport {
  private readonly socket: WebSocket
  private readonly outbox: string[] = []
  private readonly listeners: ((raw: unknown) => void)[] = []

  constructor(private readonly url: string) {
    this.socket = new WebSocket(url)
    this.socket.addEventListener('open', () => {
      for (const message of this.outbox.splice(0)) this.socket.send(message)
    })
    this.socket.addEventListener('message', (event) => this.receive(event.data))
    this.socket.addEventListener('close', () => this.waitForServer())
  }

  send(message: RequestMessage): void {
    const data = JSON.stringify(message)
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(data)
    else this.outbox.push(data)
  }

  onMessage(listener: (raw: unknown) => void): void {
    this.listeners.push(listener)
  }

  private receive(data: unknown): void {
    let raw: unknown
    try {
      raw = JSON.parse(String(data))
    } catch (error) {
      console.error('Rejected non-JSON message from main:', error)
      return
    }
    for (const listener of this.listeners) listener(raw)
  }

  /**
   * Pending requests and missed pushes cannot be recovered on a new socket:
   * once main answers again (Wi-Fi back, app restarted), a reload rebuilds
   * the whole GUI state from a fresh snapshot.
   */
  private waitForServer(): void {
    setTimeout(() => {
      const probe = new WebSocket(this.url)
      probe.addEventListener('open', () => window.location.reload())
      probe.addEventListener('close', () => this.waitForServer())
    }, RECONNECT_DELAY_MS)
  }
}
