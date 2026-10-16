// What the plugin host needs from a transport (WS in dev, IPC in prod).
import type { PushMessage, ResponseMessage } from '@template/sdk'

export type HostMessageListener = (raw: unknown, reply: (message: ResponseMessage) => void) => void

export interface HostTransport {
  /** `reply` answers only the sender of `raw`. */
  onMessage(listener: HostMessageListener): void
  broadcast(message: PushMessage): void
}
