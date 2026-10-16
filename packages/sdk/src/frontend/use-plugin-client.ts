// Composable giving a typed client of one plugin; building block of every plugin composable.
import { inject } from 'vue'
import type { PluginContract } from '../contract/plugin-contract'
import type { PluginClient } from '../contract/plugin-client.types'
import { RemotePluginClient } from './remote-plugin-client'
import { RPC_CONNECTION_KEY } from './rpc-connection-key'

export function usePluginClient<C extends PluginContract>(contract: C): PluginClient<C> {
  const connection = inject(RPC_CONNECTION_KEY)
  if (!connection) {
    throw new Error('usePluginClient() needs app.use(createPluginConnection(transport)) first')
  }
  return new RemotePluginClient(contract, connection)
}
