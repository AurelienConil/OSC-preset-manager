// Which plugin pushes reach the GUI. Nothing does by default: the app mediator
// (app-wiring.ts) forwards each push explicitly, so a high-rate internal push
// never floods the WebSocket.
import { eventKey, pushSchemaOf, type PluginContract, type PushName } from '@template/sdk'

export class GuiForwarding {
  private readonly forwarded = new Set<string>()

  /** @param isLoaded tells whether a plugin id is loaded, to reject a forward of an unknown plugin. */
  constructor(private readonly isLoaded: (pluginId: string) => boolean) {}

  /** Sends these pushes of `contract` to every GUI client. Throws on an unloaded plugin or an undeclared push. */
  forward<C extends PluginContract>(contract: C, ...names: PushName<C>[]): void {
    if (!this.isLoaded(contract.id)) throw new Error(`Cannot forward pushes of "${contract.id}": plugin not loaded`)
    for (const name of names) {
      pushSchemaOf(contract, name)
      this.forwarded.add(eventKey(contract.id, name))
    }
  }

  isForwarded(pluginId: string, name: string): boolean {
    return this.forwarded.has(eventKey(pluginId, name))
  }
}
