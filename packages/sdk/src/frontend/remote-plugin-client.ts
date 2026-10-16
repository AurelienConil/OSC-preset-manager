// Renderer implementation of PluginClient: validates every payload against the contract.
import type { PluginContract } from '../contract/plugin-contract'
import type { PluginClient } from '../contract/plugin-client.types'
import type {
  PushData,
  PushName,
  RequestArgs,
  RequestName,
  ResponseData,
} from '../contract/contract-types'
import { pushSchemaOf, requestSpecOf } from '../contract/contract-lookup'
import type { RpcConnection } from './rpc-connection'

export class RemotePluginClient<C extends PluginContract> implements PluginClient<C> {
  constructor(
    private readonly contract: C,
    private readonly connection: RpcConnection,
  ) {}

  async request<N extends RequestName<C>>(
    name: N,
    ...args: RequestArgs<C, N>
  ): Promise<ResponseData<C, N>> {
    const spec = requestSpecOf(this.contract, name)
    const payload: unknown = spec.request.parse(args[0])
    const response = await this.connection.request(this.contract.id, name, payload)
    return spec.response.parse(response) as ResponseData<C, N>
  }

  on<N extends PushName<C>>(name: N, listener: (payload: PushData<C, N>) => void): () => void {
    const schema = pushSchemaOf(this.contract, name)
    return this.connection.on(this.contract.id, name, (raw) => {
      listener(schema.parse(raw) as PushData<C, N>)
    })
  }
}
