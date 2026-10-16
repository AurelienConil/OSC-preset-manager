// Backend entry point of the OSC plugin, loaded by the host.
//
// EXAMPLE PLUGIN — this file only connects the Manager to the contract:
// - context.handle(name, handler): one handler per request of the contract.
//   The payload is already validated and typed; the returned value is
//   validated against the response schema by the host.
// - context.push(name, payload): validated, then sent to every window and to
//   main-side listeners (the app mediator, packages/main/src/app-wiring.ts).
// It must `export default` the result of definePlugin.
import { definePlugin } from '@template/sdk/backend'
import { oscContract } from '../osc.contract'
import { OscServerManager } from './osc-server-manager'

export default definePlugin({
  // A literal, never the imported SDK_VERSION: the host refuses a plugin
  // written for another SDK major version.
  sdkVersion: 1,
  contract: oscContract,
  setup(context) {
    const manager = new OscServerManager({
      onMessage: (message) => context.push('message', message),
      onStatusChanged: (status) => context.push('statusChanged', status),
    })

    context.handle('getStatus', () => manager.getStatus())
    context.handle('start', async ({ port }) => {
      await manager.start(port)
      return manager.getStatus()
    })
    context.handle('stop', async () => {
      await manager.stop()
      return manager.getStatus()
    })

    // The server is not started here: the user chooses the port from the GUI.
    // Returning the Manager lets the host call stop() before the app quits.
    return manager
  },
})
