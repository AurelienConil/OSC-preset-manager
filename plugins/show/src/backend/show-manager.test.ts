// Unit tests of ShowManager with a fake network, a hand-driven clock and fake timers.
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IoStatusDto, OscValueDto, OutputTargetDto, SnapshotDto } from '../show.dto'
import { InternalClock } from './clock/internal-clock'
import type { OscIo, OscIoListeners } from './osc/osc-io.types'
import type { OscTypedArgument } from './osc/osc-packet-encoder'
import { ShowManager, type ShowManagerListeners } from './show-manager'
import { ShowStore } from './show/show-store'

const OPACITY = '/video/master/opacity'
const HUE = '/video/layer1/hue'

class FakeIo implements OscIo {
  readonly sent: { address: string; args: readonly OscTypedArgument[] }[] = []
  listeners!: OscIoListeners
  private target: OutputTargetDto = { host: '127.0.0.1', port: 9001 }

  async configure(_inputPort: number, output: OutputTargetDto): Promise<void> {
    this.target = output
  }
  send(address: string, args: readonly OscTypedArgument[]): void {
    this.sent.push({ address, args })
  }
  status(): IoStatusDto {
    return { listeningPort: 9000, output: this.target, error: null }
  }
  async stop(): Promise<void> {}

  valuesOf(address: string): OscValueDto[] {
    return this.sent.filter((message) => message.address === address).map(({ args }) => args[0]!.value)
  }
}

describe('ShowManager', () => {
  let root: string
  let io: FakeIo
  let listeners: { [K in keyof ShowManagerListeners]: ReturnType<typeof vi.fn> }
  let manager: ShowManager

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'show-manager-'))
    vi.useFakeTimers()
    io = new FakeIo()
    listeners = {
      onSnapshot: vi.fn(),
      onParamStateChanged: vi.fn(),
      onTransportChanged: vi.fn(),
      onLiveFrame: vi.fn(),
    }
    let nextId = 0
    manager = new ShowManager({
      store: new ShowStore({ resolve: (relative) => join(root, relative) }, 10),
      clock: new InternalClock(() => Date.now()),
      createIo: (ioListeners) => {
        io.listeners = ioListeners
        return io
      },
      listeners,
      now: () => Date.now(),
      createId: () => `id-${nextId++}`,
    })
    await manager.init()
  })

  afterEach(async () => {
    await manager.stop()
    vi.useRealTimers()
    await rm(root, { recursive: true, force: true })
  })

  it('opens a default show on preset 0 and publishes a snapshot', () => {
    const snapshot = listeners.onSnapshot.mock.lastCall?.[0] as SnapshotDto
    expect(snapshot.showName).toBe('default')
    expect(snapshot.shows).toEqual(['default'])
    expect(snapshot.activePreset.name).toBe('Preset 0')
  })

  it('sends a fixed value once, then again only when it changes', () => {
    vi.advanceTimersByTime(100)
    expect(io.valuesOf(OPACITY)).toEqual([0])

    manager.setParamState({ address: OPACITY, patch: { fixed: 0.5 } })
    vi.advanceTimersByTime(100)
    expect(io.valuesOf(OPACITY)).toEqual([0, 0.5])
    expect(listeners.onParamStateChanged).toHaveBeenCalledWith(
      expect.objectContaining({ address: OPACITY, state: expect.objectContaining({ fixed: 0.5 }) }),
    )
  })

  it('sends a moving LFO while the transport plays', () => {
    manager.setParamState({ address: HUE, patch: { mode: 'lfo', lfo: { waveform: 'saw', ratio: 1, phase: 0, amplitude: 1, offset: 0.5 } } })
    manager.setTransport({ playing: true, bpm: 120 })

    vi.advanceTimersByTime(1000) // 2 beats of a 4-beat cycle: the saw is half-way

    const values = io.valuesOf(HUE) as number[]
    expect(values.length).toBeGreaterThan(30)
    expect(values.at(-1)).toBeCloseTo(180, -1)
  })

  it('restarts the cycle and resends every parameter on recall', () => {
    const preset = manager.createPreset({ name: 'A', description: '', cycleBeats: 8 }).presets[1]!
    vi.advanceTimersByTime(100)
    const before = io.sent.length

    manager.recallPreset(preset.id)
    vi.advanceTimersByTime(20)

    expect(io.sent.length - before).toBe(7) // every declared parameter, once
  })

  it('drives a linked parameter from its input and stops modulating it', () => {
    manager.setLinks([{ input: '/fader1', output: OPACITY }])
    manager.setParamState({ address: OPACITY, patch: { mode: 'lfo' } })
    manager.setTransport({ playing: true })
    vi.advanceTimersByTime(100)
    expect(io.valuesOf(OPACITY)).toEqual([])

    io.listeners.onMessage('/fader1', [0.25])
    expect(io.valuesOf(OPACITY)).toEqual([0.25])

    vi.advanceTimersByTime(40)
    expect(listeners.onLiveFrame).toHaveBeenCalledWith(
      expect.objectContaining({ inputs: { '/fader1': 0.25 } }),
    )
  })

  it('falls back to preset 0 when the active preset is deleted', () => {
    const preset = manager.createPreset({ name: 'A', description: '', cycleBeats: 4 }).presets[1]!
    manager.recallPreset(preset.id)
    expect(manager.deletePreset(preset.id).activePreset.name).toBe('Preset 0')
  })

  it('creates and reopens shows', async () => {
    await manager.createShow('concert')
    expect(manager.getSnapshot().shows).toEqual(['concert', 'default'])
    await expect(manager.createShow('concert')).rejects.toThrow(/existe déjà/)
    expect((await manager.openShow('default')).showName).toBe('default')
    await expect(manager.openShow('missing')).rejects.toThrow(/introuvable/)
  })
})
