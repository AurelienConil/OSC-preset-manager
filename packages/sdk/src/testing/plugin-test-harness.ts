// Test harness of a backend plugin: runs its setup against an in-memory context that validates like the host.
import { SDK_VERSION } from '../sdk-version'
import { pushSchemaOf, requestSpecOf } from '../contract/contract-lookup'
import type { PluginContract } from '../contract/plugin-contract'
import type {
  PushData,
  PushName,
  RequestArgs,
  RequestName,
  ResponseData,
} from '../contract/contract-types'
import type { PathProvider } from '../capabilities/path-provider.types'
import type { StoppableManager } from '../capabilities/stoppable-manager.types'
import type { BackendPlugin } from '../backend/define-plugin'
import type { PluginContext } from '../backend/plugin-context.types'

export interface PluginTestHarnessOptions {
  /** Required only by plugins that use `context.paths`. */
  paths?: PathProvider
}

const missingPaths: PathProvider = {
  resolve() {
    throw new Error('PluginTestHarness: pass `paths` in the options to test a plugin that uses context.paths')
  },
}

export class PluginTestHarness<C extends PluginContract> {
  private readonly handlers = new Map<string, (payload: unknown) => unknown>()
  private readonly recordedPushes = new Map<string, unknown[]>()
  private readonly manager: StoppableManager | void

  /** Fails like the host would: wrong SDK version, or a contract request without handler. */
  constructor(
    private readonly plugin: BackendPlugin<C>,
    options: PluginTestHarnessOptions = {},
  ) {
    const { id } = plugin.contract
    if (plugin.sdkVersion !== SDK_VERSION) {
      throw new Error(`Plugin "${id}" targets SDK v${plugin.sdkVersion}, SDK is v${SDK_VERSION}`)
    }
    this.manager = plugin.setup(this.createContext(options.paths ?? missingPaths))
    const missing = Object.keys(plugin.contract.requests).filter((name) => !this.handlers.has(name))
    if (missing.length > 0) throw new Error(`Plugin "${id}" has no handler for: ${missing.join(', ')}`)
  }

  /** Validates the payload and the handler result against the contract, as the host does. */
  async request<N extends RequestName<C>>(name: N, ...args: RequestArgs<C, N>): Promise<ResponseData<C, N>> {
    const spec = requestSpecOf(this.plugin.contract, name)
    const handler = this.handlers.get(name) as (payload: unknown) => unknown
    const result = await handler(spec.request.parse(args[0]))
    return spec.response.parse(result) as ResponseData<C, N>
  }

  /** Validated payloads pushed so far under `name`, oldest first. */
  pushesOf<N extends PushName<C>>(name: N): PushData<C, N>[] {
    return [...(this.recordedPushes.get(name) ?? [])] as PushData<C, N>[]
  }

  async stop(): Promise<void> {
    await this.manager?.stop()
  }

  private createContext(paths: PathProvider): PluginContext<C> {
    const { contract } = this.plugin
    return {
      paths,
      handle: (name, handler) => {
        if (this.handlers.has(name)) throw new Error(`Request "${contract.id}:${name}" already has a handler`)
        requestSpecOf(contract, name)
        this.handlers.set(name, handler as (payload: unknown) => unknown)
      },
      push: (name, payload) => {
        const data: unknown = pushSchemaOf(contract, name).parse(payload)
        const pushes = this.recordedPushes.get(name) ?? []
        this.recordedPushes.set(name, [...pushes, data])
      },
    }
  }
}
