// Main-side PluginClient: lets app wiring call plugins with the same API as the renderer.
import type {
  PluginClient,
  PluginContract,
  PushData,
  PushName,
  RequestArgs,
  RequestName,
  ResponseData,
} from '@template/sdk'
import type { RequestRouter } from './request-router'
import type { PushHub } from './push-hub'

const IN_PROCESS_REQUEST_ID = 0

export class InProcessPluginClient<C extends PluginContract> implements PluginClient<C> {
  constructor(
    private readonly contract: C,
    private readonly router: RequestRouter,
    private readonly pushHub: PushHub,
  ) {}

  async request<N extends RequestName<C>>(
    name: N,
    ...args: RequestArgs<C, N>
  ): Promise<ResponseData<C, N>> {
    const response = await this.router.dispatch({
      kind: 'request',
      id: IN_PROCESS_REQUEST_ID,
      plugin: this.contract.id,
      name,
      payload: args[0],
    })
    if (response.error !== undefined) throw new Error(response.error)
    return response.payload as ResponseData<C, N>
  }

  on<N extends PushName<C>>(name: N, listener: (payload: PushData<C, N>) => void): () => void {
    return this.pushHub.on(this.contract.id, name, (payload) => listener(payload as PushData<C, N>))
  }
}
