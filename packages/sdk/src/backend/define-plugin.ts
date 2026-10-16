// Backend plugin definition: the entry point the host loads, one per plugin.
import type { PluginContract } from '../contract/plugin-contract'
import type { StoppableManager } from '../capabilities/stoppable-manager.types'
import type { PluginContext } from './plugin-context.types'

export interface BackendPlugin<C extends PluginContract> {
  /** SDK major version the plugin was written against, as a literal (not SDK_VERSION). */
  readonly sdkVersion: number
  readonly contract: C
  setup(context: PluginContext<C>): StoppableManager | void
}

export function definePlugin<C extends PluginContract>(plugin: BackendPlugin<C>): BackendPlugin<C> {
  return plugin
}
