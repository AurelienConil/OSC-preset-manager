// What the renderer-side RPC connection needs from a transport (WS in dev, IPC in prod).
import type { RequestMessage } from '../protocol/wire-message'

export interface ClientTransport {
  send(message: RequestMessage): void
  onMessage(listener: (raw: unknown) => void): void
}
