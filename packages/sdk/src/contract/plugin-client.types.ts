// Typed client of one plugin, identical whether called from the renderer or from main.
import type { PluginContract } from './plugin-contract'
import type { PushData, PushName, RequestArgs, RequestName, ResponseData } from './contract-types'

export interface PluginClient<C extends PluginContract> {
  request<N extends RequestName<C>>(name: N, ...args: RequestArgs<C, N>): Promise<ResponseData<C, N>>

  /** Returns an unsubscribe function. */
  on<N extends PushName<C>>(name: N, listener: (payload: PushData<C, N>) => void): () => void
}
