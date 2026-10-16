// Barrel export of the SDK parts shared by backend and frontend.

export { SDK_VERSION } from './sdk-version'
export { defineContract, type PluginContract, type RequestSpec } from './contract/plugin-contract'
export type {
  PushData,
  PushInput,
  PushName,
  RequestArgs,
  RequestData,
  RequestInput,
  RequestName,
  ResponseData,
  ResponseInput,
} from './contract/contract-types'
export type { PluginClient } from './contract/plugin-client.types'
export { pushSchemaOf, requestSpecOf } from './contract/contract-lookup'
export { HostMessage, PushMessage, RequestMessage, ResponseMessage } from './protocol/wire-message'
export { eventKey } from './protocol/event-key'
export type { PathProvider } from './capabilities/path-provider.types'
export type { StoppableManager } from './capabilities/stoppable-manager.types'
