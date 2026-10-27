// ShowDocument: the in-memory show and every edit rule on it (preset 0, normalization against the setup).
import { randomUUID } from 'node:crypto'
import type {
  ParamStateDto,
  PinLinkDto,
  PresetDto,
  PresetInfoDto,
  PresetSummaryDto,
  SetParamStateDto,
  SetupDto,
  ShowDto,
} from '../../show.dto'
import { coerceValue } from '../../modulation'
import { defaultParamState } from './show-defaults'

function normalizeState(decl: SetupDto['parameters'][number], state: ParamStateDto, isZero: boolean): ParamStateDto {
  return {
    ...state,
    // A text parameter can only hold a fixed value.
    mode: decl.type === 'text' ? 'fixed' : state.mode,
    visible: isZero || state.visible,
    fixed: coerceValue(decl, state.fixed),
  }
}

function normalizeLinks(setup: SetupDto, links: readonly PinLinkDto[]): PinLinkDto[] {
  const inputs = new Set(setup.inputs.map((input) => input.address))
  const outputs = new Set(setup.parameters.map((parameter) => parameter.address))
  const seen = new Set<string>()
  return links.filter((link) => {
    const key = `${link.input} ${link.output}`
    if (!inputs.has(link.input) || !outputs.has(link.output) || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Gives a preset exactly one valid state per declared parameter, and only valid links. */
function normalizePreset(preset: PresetDto, setup: SetupDto, isZero: boolean): PresetDto {
  const params = Object.fromEntries(
    setup.parameters.map((decl) => {
      const existing = preset.params[decl.address]
      return [decl.address, existing ? normalizeState(decl, existing, isZero) : defaultParamState(decl)]
    }),
  )
  return { ...preset, params, links: normalizeLinks(setup, preset.links) }
}

export class ShowDocument {
  private show: ShowDto

  constructor(
    show: ShowDto,
    private readonly createId: () => string = randomUUID,
  ) {
    this.show = structuredClone(show)
    this.normalize()
  }

  /** The show as saved to disk. Treat as read-only. */
  toJSON(): ShowDto {
    return this.show
  }

  get setup(): SetupDto {
    return this.show.setup
  }

  presetZero(): PresetDto {
    return this.show.presets[0] as PresetDto
  }

  presetSummaries(): PresetSummaryDto[] {
    return this.show.presets.map(({ id, name, description, cycleBeats }) => ({ id, name, description, cycleBeats }))
  }

  preset(id: string): PresetDto {
    const preset = this.show.presets.find((candidate) => candidate.id === id)
    if (!preset) throw new Error(`Preset introuvable : ${id}`)
    return preset
  }

  replaceSetup(setup: SetupDto): void {
    this.show = { ...this.show, setup }
    this.normalize()
  }

  /** A new preset is always a copy of preset 0, appended at the end. */
  createPreset(info: PresetInfoDto): PresetDto {
    const preset: PresetDto = { ...structuredClone(this.presetZero()), ...info, id: this.createId() }
    this.show.presets.push(preset)
    return preset
  }

  /** The copy is inserted right after its source. */
  duplicatePreset(id: string): PresetDto {
    const source = this.preset(id)
    const copy: PresetDto = { ...structuredClone(source), id: this.createId(), name: `${source.name} (copie)` }
    this.show.presets.splice(this.indexOf(id) + 1, 0, copy)
    return copy
  }

  updatePresetInfo(id: string, info: PresetInfoDto): void {
    Object.assign(this.preset(id), info)
  }

  /** Moves a preset to `toIndex` (clamped); preset 0 never moves and nothing moves before it. */
  movePreset(id: string, toIndex: number): void {
    const from = this.assertNotZero(id, 'déplacé')
    const [preset] = this.show.presets.splice(from, 1)
    const to = Math.min(Math.max(1, toIndex), this.show.presets.length)
    this.show.presets.splice(to, 0, preset as PresetDto)
  }

  deletePreset(id: string): void {
    this.show.presets.splice(this.assertNotZero(id, 'supprimé'), 1)
  }

  setParamState(presetId: string, { address, patch }: SetParamStateDto): ParamStateDto {
    const preset = this.preset(presetId)
    const decl = this.show.setup.parameters.find((parameter) => parameter.address === address)
    const current = preset.params[address]
    if (!decl || !current) throw new Error(`Paramètre non déclaré : ${address}`)
    const next = normalizeState(decl, { ...current, ...patch }, presetId === this.presetZero().id)
    preset.params[address] = next
    return next
  }

  setLinks(presetId: string, links: readonly PinLinkDto[]): void {
    this.preset(presetId).links = normalizeLinks(this.show.setup, links)
  }

  private indexOf(id: string): number {
    const index = this.show.presets.findIndex((preset) => preset.id === id)
    if (index === -1) throw new Error(`Preset introuvable : ${id}`)
    return index
  }

  private assertNotZero(id: string, verb: string): number {
    const index = this.indexOf(id)
    if (index === 0) throw new Error(`Le preset 0 ne peut pas être ${verb}`)
    return index
  }

  private normalize(): void {
    const { setup } = this.show
    this.show.presets = this.show.presets.map((preset, index) => normalizePreset(preset, setup, index === 0))
  }
}
