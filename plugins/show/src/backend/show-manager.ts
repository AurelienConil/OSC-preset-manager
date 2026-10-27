// ShowManager: runs the show. Owns the open show, the active preset, the engine loop that sends
// modulated parameters, the pin matrix routing of OSC inputs, and the throttled GUI frames.
//
// Two rates, on purpose (spec §9): the engine sends OSC at setup.outputRateHz
// and forwards inputs as soon as they arrive (minus their own rate limit),
// while the GUI only receives a coalesced frame GUI_FRAME_RATE_HZ times per
// second, so a slow screen or phone never slows the OSC output down.
import { randomUUID } from 'node:crypto'
import type { StoppableManager } from '@template/sdk'
import type {
  LiveFrameDto,
  OscValueDto,
  ParamStateChangedDto,
  ParamStateDto,
  ParameterDeclDto,
  PinLinkDto,
  PresetDto,
  PresetInfoDto,
  SetParamStateDto,
  SetTransportDto,
  SetupDto,
  SnapshotDto,
  TransportDto,
} from '../show.dto'
import { evaluateParam, fract } from '../modulation'
import type { TransportClock } from './clock/transport-clock.types'
import { FixedRateLoop } from './engine/fixed-rate-loop'
import { InputRouter } from './engine/input-router'
import type { OscIo, OscIoListeners } from './osc/osc-io.types'
import { typedArgument } from './osc/osc-typed-argument'
import { createDefaultShow } from './show/show-defaults'
import { ShowDocument } from './show/show-document'
import type { ShowStore } from './show/show-store'

/** Stage 2 of the rate limiting: how many live frames per second the GUI receives. */
export const GUI_FRAME_RATE_HZ = 25

const DEFAULT_SHOW_NAME = 'default'

export interface ShowManagerListeners {
  onSnapshot: (snapshot: SnapshotDto) => void
  onParamStateChanged: (event: ParamStateChangedDto) => void
  onTransportChanged: (transport: TransportDto) => void
  onLiveFrame: (frame: LiveFrameDto) => void
}

export interface ShowManagerDeps {
  store: ShowStore
  clock: TransportClock
  /** Factory, because the network layer calls back into the manager. */
  createIo: (listeners: OscIoListeners) => OscIo
  listeners: ShowManagerListeners
  /** Monotonic time source (performance.now). */
  now?: () => number
  createId?: () => string
}

interface OpenShow {
  name: string
  doc: ShowDocument
}

export class ShowManager implements StoppableManager {
  private readonly io: OscIo
  private readonly router: InputRouter
  private readonly engineLoop: FixedRateLoop
  private readonly guiLoop: FixedRateLoop
  private show: OpenShow | undefined
  private shows: string[] = []
  private activePresetId = ''
  private warning: string | null = null
  /** Clock beat at which the active preset was recalled: every cycle restarts from there. */
  private beatOrigin = 0
  private readonly lastSent = new Map<string, OscValueDto>()
  private dirtyValues = new Map<string, OscValueDto>()
  private dirtyInputs = new Map<string, OscValueDto>()

  constructor(private readonly deps: ShowManagerDeps) {
    const now = deps.now ?? (() => performance.now())
    this.io = deps.createIo({
      onMessage: (address, args) => this.receive(address, args),
      onStatusChanged: () => this.pushSnapshot(),
    })
    this.router = new InputRouter((output, value) => this.send(output, value), now)
    this.engineLoop = new FixedRateLoop(60, () => this.tick(), now)
    this.guiLoop = new FixedRateLoop(GUI_FRAME_RATE_HZ, () => this.frame(), now)
  }

  /** Opens the last show (or the default one) and starts the engine. Never rejects on a bad show file. */
  async init(): Promise<void> {
    const name = (await this.deps.store.readLastShowName()) ?? DEFAULT_SHOW_NAME
    try {
      await this.openOrCreate(name)
    } catch (error) {
      // Never overwrite a show we could not read: start on a fresh one under another name.
      this.warning = `${(error as Error).message}. Un nouveau show a été créé à la place.`
      await this.activate(`${name}-secours-${Date.now()}`, this.newDocument())
    }
    this.engineLoop.start()
    this.guiLoop.start()
  }

  getSnapshot(): SnapshotDto {
    const { doc, name } = this.requireShow()
    return {
      showName: name,
      shows: this.shows,
      setup: doc.setup,
      presets: doc.presetSummaries(),
      activePreset: this.activePreset(),
      transport: this.deps.clock.state(),
      io: this.io.status(),
      values: Object.fromEntries(this.lastSent),
      warning: this.warning,
    }
  }

  // ------------------------------------------------------------ show files

  async openShow(name: string): Promise<SnapshotDto> {
    await this.deps.store.flush()
    const show = await this.deps.store.load(name)
    if (!show) throw new Error(`Show introuvable : ${name}`)
    this.warning = null
    await this.activate(name, new ShowDocument(show, this.deps.createId))
    return this.getSnapshot()
  }

  async createShow(name: string): Promise<SnapshotDto> {
    if ((await this.deps.store.list()).includes(name)) throw new Error(`Le show "${name}" existe déjà`)
    await this.deps.store.flush()
    this.warning = null
    await this.activate(name, this.newDocument())
    return this.getSnapshot()
  }

  async updateSetup(setup: SetupDto): Promise<SnapshotDto> {
    const { doc } = this.requireShow()
    doc.replaceSetup(setup)
    this.persist()
    await this.applySetup()
    return this.getSnapshot()
  }

  // ------------------------------------------------------------ presets

  recallPreset(id: string): SnapshotDto {
    this.requireShow().doc.preset(id)
    this.activePresetId = id
    // Spec §6: on recall, every curve and LFO restarts from beat 1, without quantization.
    this.beatOrigin = this.deps.clock.beats()
    this.lastSent.clear()
    this.configureRouter()
    this.pushSnapshot()
    return this.getSnapshot()
  }

  /** Structural edits never recall: the live output only changes on an explicit recall. */
  createPreset(info: PresetInfoDto): SnapshotDto {
    this.requireShow().doc.createPreset(info)
    return this.commitStructure()
  }

  duplicatePreset(id: string): SnapshotDto {
    this.requireShow().doc.duplicatePreset(id)
    return this.commitStructure()
  }

  updatePresetInfo(id: string, info: PresetInfoDto): SnapshotDto {
    this.requireShow().doc.updatePresetInfo(id, info)
    return this.commitStructure()
  }

  movePreset(id: string, toIndex: number): SnapshotDto {
    this.requireShow().doc.movePreset(id, toIndex)
    return this.commitStructure()
  }

  deletePreset(id: string): SnapshotDto {
    const { doc } = this.requireShow()
    doc.deletePreset(id)
    if (id === this.activePresetId) return this.recallPresetAfterEdit(doc.presetZero().id)
    return this.commitStructure()
  }

  // ------------------------------------------------------------ live editing

  setParamState(request: SetParamStateDto): ParamStateDto {
    const state = this.requireShow().doc.setParamState(this.activePresetId, request)
    this.persist()
    this.deps.listeners.onParamStateChanged({ presetId: this.activePresetId, address: request.address, state })
    return state
  }

  setLinks(links: readonly PinLinkDto[]): SnapshotDto {
    this.requireShow().doc.setLinks(this.activePresetId, links)
    this.configureRouter()
    return this.commitStructure()
  }

  setTransport({ playing, bpm }: SetTransportDto): TransportDto {
    const { clock } = this.deps
    if (bpm !== undefined) clock.setBpm(bpm)
    if (playing === true && !clock.state().playing) {
      clock.play()
      this.beatOrigin = clock.beats()
    }
    if (playing === false) clock.stop()
    const state = clock.state()
    this.deps.listeners.onTransportChanged(state)
    return state
  }

  async stop(): Promise<void> {
    this.engineLoop.stop()
    this.guiLoop.stop()
    this.router.dispose()
    await this.io.stop()
    await this.deps.store.flush()
  }

  // ------------------------------------------------------------ engine

  private tick(): void {
    if (!this.show) return
    const preset = this.activePreset()
    const position = { beats: this.elapsedBeats(), cycleBeats: preset.cycleBeats }
    const driven = this.router.drivenOutputs()
    for (const decl of this.show.doc.setup.parameters) {
      const state = preset.params[decl.address]
      if (!state || driven.has(decl.address)) continue
      const value = evaluateParam(decl, state, position)
      // Only changes go on the wire: a fixed value is sent once per recall.
      if (this.lastSent.get(decl.address) !== value) this.send(decl, value)
    }
  }

  private send(decl: ParameterDeclDto, value: OscValueDto): void {
    this.io.send(decl.address, [typedArgument(decl.type, value)])
    this.lastSent.set(decl.address, value)
    this.dirtyValues.set(decl.address, value)
  }

  private receive(address: string, args: OscValueDto[]): void {
    const [first] = args
    if (first !== undefined) this.dirtyInputs.set(address, first)
    this.router.receive(address, args)
  }

  private frame(): void {
    if (!this.show) return
    const playing = this.deps.clock.state().playing
    if (!playing && this.dirtyValues.size === 0 && this.dirtyInputs.size === 0) return
    const beat = this.elapsedBeats()
    const frame: LiveFrameDto = {
      beat,
      phase: fract(beat / this.activePreset().cycleBeats),
      values: Object.fromEntries(this.dirtyValues),
      inputs: Object.fromEntries(this.dirtyInputs),
    }
    this.dirtyValues = new Map()
    this.dirtyInputs = new Map()
    this.deps.listeners.onLiveFrame(frame)
  }

  private elapsedBeats(): number {
    return Math.max(0, this.deps.clock.beats() - this.beatOrigin)
  }

  // ------------------------------------------------------------ internals

  private newDocument(): ShowDocument {
    const createId = this.deps.createId ?? randomUUID
    return new ShowDocument(createDefaultShow(createId), createId)
  }

  private async openOrCreate(name: string): Promise<void> {
    const show = await this.deps.store.load(name)
    await this.activate(name, show ? new ShowDocument(show, this.deps.createId) : this.newDocument())
  }

  private async activate(name: string, doc: ShowDocument): Promise<void> {
    this.show = { name, doc }
    await this.deps.store.save(name, doc.toJSON())
    await this.deps.store.writeLastShowName(name)
    this.shows = await this.deps.store.list()
    this.activePresetId = doc.presetZero().id
    this.beatOrigin = this.deps.clock.beats()
    this.lastSent.clear()
    await this.applySetup()
  }

  /** Applies the setup to the network and the engine, then publishes the new state. */
  private async applySetup(): Promise<void> {
    const { setup } = this.requireShow().doc
    this.engineLoop.setRate(setup.outputRateHz)
    this.configureRouter()
    await this.io.configure(setup.inputPort, setup.output)
    this.pushSnapshot()
  }

  private configureRouter(): void {
    const { doc } = this.requireShow()
    this.router.configure(doc.setup, this.activePreset().links)
  }

  private recallPresetAfterEdit(id: string): SnapshotDto {
    this.persist()
    return this.recallPreset(id)
  }

  private commitStructure(): SnapshotDto {
    this.persist()
    this.pushSnapshot()
    return this.getSnapshot()
  }

  private persist(): void {
    const { name, doc } = this.requireShow()
    this.deps.store.scheduleSave(name, doc.toJSON())
  }

  private pushSnapshot(): void {
    if (this.show) this.deps.listeners.onSnapshot(this.getSnapshot())
  }

  private activePreset(): PresetDto {
    return this.requireShow().doc.preset(this.activePresetId)
  }

  private requireShow(): OpenShow {
    if (!this.show) throw new Error('Aucun show ouvert')
    return this.show
  }
}
