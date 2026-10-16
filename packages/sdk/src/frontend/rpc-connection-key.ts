// Vue injection key of the app-wide RpcConnection.
import type { InjectionKey } from 'vue'
import type { RpcConnection } from './rpc-connection'

export const RPC_CONNECTION_KEY: InjectionKey<RpcConnection> = Symbol('rpc-connection')
