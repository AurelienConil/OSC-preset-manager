// Vue composable of the OSC plugin: server status, last received messages, start / stop.
//
// EXAMPLE PLUGIN — the composable is the plugin's frontend API: functions and
// reactive state, never any DOM. Components (in packages/renderer) decide how
// to display it. Call it synchronously inside a component's setup.
import { onScopeDispose, ref } from 'vue'
import { usePluginClient } from '@template/sdk/frontend'
import { oscContract } from '../osc.contract'
import type { OscMessageDto, OscStatusDto } from '../osc.dto'

/** How many received messages the composable keeps, newest first. */
const MESSAGE_HISTORY_SIZE = 20

export function useOsc() {
  const client = usePluginClient(oscContract)
  const status = ref<OscStatusDto>()
  const messages = ref<OscMessageDto[]>([])

  // client.on() returns an unsubscribe function: onScopeDispose runs it when
  // the component unmounts. Subscribing in setup (not onMounted) means no
  // push is missed between setup and mount.
  onScopeDispose(client.on('statusChanged', (event) => (status.value = event)))
  onScopeDispose(
    client.on('message', (message) => {
      messages.value = [message, ...messages.value].slice(0, MESSAGE_HISTORY_SIZE)
    }),
  )

  // Pushes only report changes: ask once for the state at mount time.
  // ??= so a status push that arrived meanwhile (fresher) is kept.
  client
    .request('getStatus')
    .then((current) => (status.value ??= current))
    .catch((error: unknown) => console.error('OSC: cannot read the server status:', error))

  return {
    status,
    messages,
    start: (port: number) => client.request('start', { port }),
    stop: () => client.request('stop'),
  }
}
