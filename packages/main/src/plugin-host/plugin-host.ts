// Plugin host: loads backend plugins, serves renderer requests, stops plugins on quit.
import {
  RequestMessage,
  SDK_VERSION,
  type PathProvider,
  type PluginClient,
  type PluginContract,
  type ResponseMessage,
  type StoppableManager,
} from '@template/sdk'
import type { BackendPlugin } from '@template/sdk/backend'
import type { HostTransport } from '../transport/host-transport.types'
import { RequestRouter } from './request-router'
import { PushHub } from './push-hub'
import { createPluginContext } from './create-plugin-context'
import { InProcessPluginClient } from './in-process-plugin-client'
import { GuiForwarding } from './gui-forwarding'

export interface PluginHostOptions {
  transport: HostTransport
  paths: PathProvider
}

export class PluginHost {
  private readonly router = new RequestRouter()
  private readonly pushHub: PushHub
  private readonly loadedIds = new Set<string>()
  private readonly stoppables: StoppableManager[] = []
  /** Which pushes reach the GUI: none until the mediator forwards them. */
  readonly gui = new GuiForwarding((pluginId) => this.loadedIds.has(pluginId))

  constructor(private readonly options: PluginHostOptions) {
    this.pushHub = new PushHub((message) => options.transport.broadcast(message), this.gui)
    options.transport.onMessage((raw, reply) => void this.receive(raw, reply))
  }

  load(plugins: readonly BackendPlugin<PluginContract>[]): void {
    for (const plugin of plugins) this.loadOne(plugin)
  }

  client<C extends PluginContract>(contract: C): PluginClient<C> {
    return new InProcessPluginClient(contract, this.router, this.pushHub)
  }

  async stop(): Promise<void> {
    await Promise.all(this.stoppables.map((stoppable) => stoppable.stop()))
  }

  private loadOne(plugin: BackendPlugin<PluginContract>): void {
    const { id } = plugin.contract
    if (plugin.sdkVersion !== SDK_VERSION) {
      throw new Error(`Plugin "${id}" targets SDK v${plugin.sdkVersion}, host runs v${SDK_VERSION}`)
    }
    if (this.loadedIds.has(id)) throw new Error(`Plugin "${id}" is loaded twice`)
    this.loadedIds.add(id)

    const { router, pushHub } = this
    const stoppable = plugin.setup(createPluginContext(plugin.contract, { router, pushHub, paths: this.options.paths }))
    if (stoppable) this.stoppables.push(stoppable)
    this.assertAllRequestsHandled(plugin.contract)
  }

  private assertAllRequestsHandled(contract: PluginContract): void {
    const missing = Object.keys(contract.requests).filter((name) => !this.router.has(contract.id, name))
    if (missing.length > 0) {
      throw new Error(`Plugin "${contract.id}" has no handler for: ${missing.join(', ')}`)
    }
  }

  private async receive(raw: unknown, reply: (message: ResponseMessage) => void): Promise<void> {
    const parsed = RequestMessage.safeParse(raw)
    if (!parsed.success) {
      console.error('Rejected malformed message from renderer:', parsed.error.message)
      return
    }
    reply(await this.router.dispatch(parsed.data))
  }
}
