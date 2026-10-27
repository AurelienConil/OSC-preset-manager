// Vue composable of the show plugin: the live GUI state (snapshot + patches + throttled frames) and every action.
import { onScopeDispose, shallowRef } from 'vue'
import { usePluginClient } from '@template/sdk/frontend'
import { showContract } from '../show.contract'
import type {
  OscValueDto,
  PinLinkDto,
  PresetInfoDto,
  SetParamStateDto,
  SetTransportDto,
  SetupDto,
  SnapshotDto,
  TransportDto,
} from '../show.dto'

export interface Playhead {
  beat: number
  phase: number
}

export function useShow() {
  const client = usePluginClient(showContract)
  // shallowRef everywhere: the state is replaced, never mutated in place, and
  // deep reactivity on 256-point curves would cost for nothing.
  const snapshot = shallowRef<SnapshotDto>()
  const transport = shallowRef<TransportDto>()
  const playhead = shallowRef<Playhead>({ beat: 0, phase: 0 })
  const values = shallowRef<Record<string, OscValueDto>>({})
  const inputs = shallowRef<Record<string, OscValueDto>>({})

  function applySnapshot(next: SnapshotDto): SnapshotDto {
    snapshot.value = next
    transport.value = next.transport
    values.value = { ...values.value, ...next.values }
    return next
  }

  onScopeDispose(client.on('snapshot', applySnapshot))
  onScopeDispose(client.on('transportChanged', (next) => (transport.value = next)))
  onScopeDispose(
    client.on('paramStateChanged', ({ presetId, address, state }) => {
      const current = snapshot.value
      if (!current || current.activePreset.id !== presetId) return
      const activePreset = { ...current.activePreset, params: { ...current.activePreset.params, [address]: state } }
      snapshot.value = { ...current, activePreset }
    }),
  )
  onScopeDispose(
    client.on('liveFrame', (frame) => {
      playhead.value = { beat: frame.beat, phase: frame.phase }
      if (Object.keys(frame.values).length > 0) values.value = { ...values.value, ...frame.values }
      if (Object.keys(frame.inputs).length > 0) inputs.value = { ...inputs.value, ...frame.inputs }
    }),
  )

  // Pushes only report changes: ask once for the whole state, unless a
  // (fresher) snapshot push arrived meanwhile.
  client
    .request('getSnapshot')
    .then((initial) => {
      if (!snapshot.value) applySnapshot(initial)
    })
    .catch((error: unknown) => console.error('Show: cannot read the initial state:', error))

  return {
    snapshot,
    transport,
    playhead,
    values,
    inputs,
    openShow: (name: string) => client.request('openShow', { name }).then(applySnapshot),
    createShow: (name: string) => client.request('createShow', { name }).then(applySnapshot),
    updateSetup: (setup: SetupDto) => client.request('updateSetup', setup).then(applySnapshot),
    recallPreset: (id: string) => client.request('recallPreset', { id }).then(applySnapshot),
    createPreset: (info: PresetInfoDto) => client.request('createPreset', info).then(applySnapshot),
    duplicatePreset: (id: string) => client.request('duplicatePreset', { id }).then(applySnapshot),
    updatePresetInfo: (id: string, info: PresetInfoDto) =>
      client.request('updatePresetInfo', { id, ...info }).then(applySnapshot),
    movePreset: (id: string, toIndex: number) => client.request('movePreset', { id, toIndex }).then(applySnapshot),
    deletePreset: (id: string) => client.request('deletePreset', { id }).then(applySnapshot),
    setParamState: (request: SetParamStateDto) => client.request('setParamState', request),
    setLinks: (links: PinLinkDto[]) => client.request('setLinks', { links }).then(applySnapshot),
    setTransport: (request: SetTransportDto) => client.request('setTransport', request),
  }
}

export type ShowApi = ReturnType<typeof useShow>
