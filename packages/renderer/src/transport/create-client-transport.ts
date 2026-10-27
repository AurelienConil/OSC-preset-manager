// Creates the renderer transport: always the WebSocket of main (dev and prod, CLAUDE.md §4).
import { WS_PORT } from '@template/shared'
import type { ClientTransport } from '@template/sdk/frontend'
import { WsClientTransport } from './ws-client-transport'

export function createClientTransport(): ClientTransport {
  // Same machine that served the page: localhost in Electron (file:// has no
  // hostname), the computer's LAN address on a phone.
  const host = window.location.hostname || 'localhost'
  return new WsClientTransport(`ws://${host}:${WS_PORT}`)
}
