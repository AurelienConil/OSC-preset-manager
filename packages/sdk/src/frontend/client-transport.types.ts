// What the renderer-side RPC connection needs from a transport (WebSocket in this app).
import type { RequestMessage } from '../protocol/wire-message'

export interface ClientTransport {
  send(message: RequestMessage): void
  onMessage(listener: (raw: unknown) => void): void
}
