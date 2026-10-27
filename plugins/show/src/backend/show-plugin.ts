// Backend entry point of the show plugin, loaded by the host.
import { definePlugin } from '@template/sdk/backend'
import { showContract } from '../show.contract'
import { InternalClock } from './clock/internal-clock'
import { OscUdpIo } from './osc/osc-udp-io'
import { ShowManager } from './show-manager'
import { ShowStore } from './show/show-store'

export default definePlugin({
  sdkVersion: 1,
  contract: showContract,
  setup(context) {
    const manager = new ShowManager({
      store: new ShowStore(context.paths),
      clock: new InternalClock(),
      createIo: (listeners) => new OscUdpIo(listeners),
      listeners: {
        onSnapshot: (snapshot) => context.push('snapshot', snapshot),
        onParamStateChanged: (event) => context.push('paramStateChanged', event),
        onTransportChanged: (transport) => context.push('transportChanged', transport),
        onLiveFrame: (frame) => context.push('liveFrame', frame),
      },
    })

    // setup() is synchronous but opening the show reads the disk: every
    // handler waits for it. init() never rejects (a bad file opens a new show).
    const ready = manager.init()
    const whenReady =
      <P, R>(handler: (payload: P) => R) =>
      async (payload: P): Promise<Awaited<R>> => {
        await ready
        return await handler(payload)
      }

    context.handle('getSnapshot', whenReady(() => manager.getSnapshot()))
    context.handle('openShow', whenReady(({ name }) => manager.openShow(name)))
    context.handle('createShow', whenReady(({ name }) => manager.createShow(name)))
    context.handle('updateSetup', whenReady((setup) => manager.updateSetup(setup)))
    context.handle('recallPreset', whenReady(({ id }) => manager.recallPreset(id)))
    context.handle('createPreset', whenReady((info) => manager.createPreset(info)))
    context.handle('duplicatePreset', whenReady(({ id }) => manager.duplicatePreset(id)))
    context.handle('updatePresetInfo', whenReady(({ id, ...info }) => manager.updatePresetInfo(id, info)))
    context.handle('movePreset', whenReady(({ id, toIndex }) => manager.movePreset(id, toIndex)))
    context.handle('deletePreset', whenReady(({ id }) => manager.deletePreset(id)))
    context.handle('setParamState', whenReady((request) => manager.setParamState(request)))
    context.handle('setLinks', whenReady(({ links }) => manager.setLinks(links)))
    context.handle('setTransport', whenReady((request) => manager.setTransport(request)))

    return {
      stop: async () => {
        await ready
        await manager.stop()
      },
    }
  },
})
