// App mediator: the only place that knows several plugins and decides how they react to each other,
// and which of their pushes reach the GUI.
//
// KEYSTONE OF THE PROJECT. Plugins never import each other: each one only
// exposes its contract (requests it answers, pushes it emits). Turning "when
// plugin A emits X, plugin B must do Y" into code is an *application* rule,
// so it lives here, not in A nor in B. That keeps every plugin reusable in
// another app, and gathers every cross-plugin behaviour in one readable file.
//
// host.client(contract) gives, from the main process, the same typed API as
// the renderer composables: request(name, payload) and on(push, listener).
// host.gui.forward(contract, ...pushes) sends pushes to the GUI: none reaches
// it otherwise, so a plugin can push internal, high-rate events freely.
// One function per rule; wireApp() only lists them.
import { showContract } from '@template/plugin-show'
import type { GuiForwarding } from './plugin-host/gui-forwarding'
import type { PluginHost } from './plugin-host/plugin-host'

/** Every push of the show plugin feeds the GUI (liveFrame is already throttled by the plugin). */
export function forwardShowToGui(gui: Pick<GuiForwarding, 'forward'>): void {
  gui.forward(showContract, 'snapshot', 'paramStateChanged', 'transportChanged', 'liveFrame')
}

export function wireApp(host: PluginHost): void {
  forwardShowToGui(host.gui)
}
