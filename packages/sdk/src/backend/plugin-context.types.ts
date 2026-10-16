// What a plugin receives from the host at setup: request handling, pushes, capabilities.
import type { PluginContract } from '../contract/plugin-contract'
import type {
  PushInput,
  PushName,
  RequestData,
  RequestName,
  ResponseInput,
} from '../contract/contract-types'
import type { PathProvider } from '../capabilities/path-provider.types'

export type RequestHandler<C extends PluginContract, N extends RequestName<C>> = (
  payload: RequestData<C, N>,
) => ResponseInput<C, N> | Promise<ResponseInput<C, N>>

export interface PluginContext<C extends PluginContract> {
  readonly paths: PathProvider

  /** Payload and result are validated by the host against the contract. */
  handle<N extends RequestName<C>>(name: N, handler: RequestHandler<C, N>): void

  /** Payload is validated against the contract, then sent to the GUI and to main listeners. */
  push<N extends PushName<C>>(name: N, payload: PushInput<C, N>): void
}
