// Picks the renderer transport: WebSocket in dev, IPC in prod.
import { WS_DEV_PORT } from '@template/shared'
import type { ClientTransport } from '@template/sdk/frontend'
import { WsClientTransport } from './ws-client-transport'
import { IpcClientTransport } from './ipc-client-transport'

export function createClientTransport(): ClientTransport {
  return import.meta.env.DEV
    ? new WsClientTransport(`ws://localhost:${WS_DEV_PORT}`)
    : new IpcClientTransport()
}
