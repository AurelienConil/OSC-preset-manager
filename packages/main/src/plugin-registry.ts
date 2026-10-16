// Backend plugins enabled in this app: one entry per plugin.
import type { PluginContract } from '@template/sdk'
import type { BackendPlugin } from '@template/sdk/backend'
// EXAMPLE PLUGINS — replace them with your own (CLAUDE.md §5.1).
import oscPlugin from '@template/plugin-osc/backend'
import weatherPlugin from '@template/plugin-weather/backend'

export const enabledPlugins: readonly BackendPlugin<PluginContract>[] = [oscPlugin, weatherPlugin]
