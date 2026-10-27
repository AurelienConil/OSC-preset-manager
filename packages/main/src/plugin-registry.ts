// Backend plugins enabled in this app: one entry per plugin.
import type { PluginContract } from '@template/sdk'
import type { BackendPlugin } from '@template/sdk/backend'
import showPlugin from '@template/plugin-show/backend'

export const enabledPlugins: readonly BackendPlugin<PluginContract>[] = [showPlugin]
