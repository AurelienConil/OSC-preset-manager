// Vue plugin installing the app-wide RpcConnection, consumed by usePluginClient().
import type { Plugin } from 'vue'
import { RpcConnection } from './rpc-connection'
import { RPC_CONNECTION_KEY } from './rpc-connection-key'
import type { ClientTransport } from './client-transport.types'

export function createPluginConnection(transport: ClientTransport): Plugin {
  return {
    install(app) {
      app.provide(RPC_CONNECTION_KEY, new RpcConnection(transport))
    },
  }
}
