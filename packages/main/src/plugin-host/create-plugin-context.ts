// Builds the PluginContext handed to one plugin, scoped to its own contract namespace.
import { pushSchemaOf, requestSpecOf, type PathProvider, type PluginContract } from '@template/sdk'
import type { PluginContext } from '@template/sdk/backend'
import type { RequestRouter } from './request-router'
import type { PushHub } from './push-hub'

export interface PluginContextDeps {
  router: RequestRouter
  pushHub: PushHub
  paths: PathProvider
}

export function createPluginContext<C extends PluginContract>(
  contract: C,
  deps: PluginContextDeps,
): PluginContext<C> {
  return {
    paths: deps.paths,
    handle(name, handler) {
      deps.router.register(contract.id, name, {
        spec: requestSpecOf(contract, name),
        // The router validates the payload with spec.request before calling it.
        handler: handler as (payload: unknown) => unknown,
      })
    },
    push(name, payload) {
      deps.pushHub.publish(contract.id, name, pushSchemaOf(contract, name), payload)
    },
  }
}
