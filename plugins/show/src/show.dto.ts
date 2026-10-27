// Public DTOs of the show plugin (zod schemas + inferred types), shared by backend and frontend.
//
// A show is one JSON file: a setup (ports, declared OSC parameters and inputs)
// and an ordered list of presets. presets[0] is always "preset 0", the neutral
// state every new preset is copied from.
import { z } from 'zod'

/** Number of normalized points of a drawn curve (ofxGuiModulator legacy). */
export const CURVE_POINT_COUNT = 256

/** Allowed curve / cycle durations of a preset, in beats. */
export const CYCLE_BEAT_OPTIONS = [4, 8, 16] as const

/** LFO frequency, as a ratio of the preset cycle: never a free value (always synced). */
export const LFO_RATIOS = [1 / 16, 1 / 8, 1 / 4, 1 / 2, 1, 2, 4, 8, 16] as const

export const DEFAULT_INPUT_PORT = 9000
export const DEFAULT_OUTPUT_HOST = '127.0.0.1'
export const DEFAULT_OUTPUT_PORT = 9001
export const DEFAULT_OUTPUT_RATE_HZ = 60
export const DEFAULT_BPM = 120

// ---------------------------------------------------------------- primitives

/** OSC address: `/segment/segment...`, no empty segment, no OSC pattern character. */
export const OscAddressDto = z
  .string()
  .regex(/^(\/[^\s/#*,?[\]{}]+)+$/, 'Adresse OSC invalide (ex. : /video/layer1/opacity)')
export type OscAddressDto = z.infer<typeof OscAddressDto>

/** A value sent or received over OSC. */
export const OscValueDto = z.union([z.number(), z.string(), z.boolean()])
export type OscValueDto = z.infer<typeof OscValueDto>

export const ParamTypeDto = z.enum(['float', 'int', 'bool', 'text'])
export type ParamTypeDto = z.infer<typeof ParamTypeDto>

/** Non-privileged UDP port: rejecting < 1024 gives a clear error instead of EACCES. */
export const UdpPortDto = z.number().int().min(1024).max(65535)

const ShowIdDto = z.string().min(1)

// ---------------------------------------------------------------- setup

/** Shared shape of a declared OSC address (output parameter or input). */
const declarationShape = {
  address: OscAddressDto,
  type: ParamTypeDto,
  /** Ignored for bool and text. */
  min: z.number(),
  /** Ignored for bool and text. */
  max: z.number(),
  description: z.string(),
  keywords: z.array(z.string()),
}

function hasValidRange(decl: { type: ParamTypeDto; min: number; max: number }): boolean {
  return decl.type === 'bool' || decl.type === 'text' || decl.max > decl.min
}
const RANGE_ERROR = { message: 'Le max doit être supérieur au min', path: ['max'] }

/** An output parameter: an OSC value the app drives on the target software. */
export const ParameterDeclDto = z.object(declarationShape).refine(hasValidRange, RANGE_ERROR)
export type ParameterDeclDto = z.infer<typeof ParameterDeclDto>

/** An OSC input the app listens to, routable to parameters through the pin matrix. */
export const InputDeclDto = z
  .object({
    ...declarationShape,
    /** Backend rate limit of this input, null = unlimited. */
    maxRateHz: z.number().positive().max(1000).nullable(),
  })
  .refine(hasValidRange, RANGE_ERROR)
export type InputDeclDto = z.infer<typeof InputDeclDto>

export const OutputTargetDto = z.object({ host: z.string().min(1), port: UdpPortDto })
export type OutputTargetDto = z.infer<typeof OutputTargetDto>

function findDuplicate(values: readonly string[]): string | undefined {
  return values.find((value, index) => values.indexOf(value) !== index)
}

/** Fixed for the whole show: ports, output rate, declared parameters and inputs. */
export const SetupDto = z
  .object({
    inputPort: UdpPortDto,
    output: OutputTargetDto,
    /** Engine rate: how many times per second modulated parameters are sent. */
    outputRateHz: z.number().int().min(1).max(500),
    parameters: z.array(ParameterDeclDto),
    inputs: z.array(InputDeclDto),
  })
  .superRefine((setup, ctx) => {
    const duplicateParam = findDuplicate(setup.parameters.map((p) => p.address))
    if (duplicateParam) ctx.addIssue({ code: 'custom', message: `Paramètre déclaré deux fois : ${duplicateParam}` })
    const duplicateInput = findDuplicate(setup.inputs.map((i) => i.address))
    if (duplicateInput) ctx.addIssue({ code: 'custom', message: `Entrée déclarée deux fois : ${duplicateInput}` })
  })
export type SetupDto = z.infer<typeof SetupDto>

// ---------------------------------------------------------------- presets

export const WaveformDto = z.enum(['sine', 'saw', 'triangle', 'square', 'random'])
export type WaveformDto = z.infer<typeof WaveformDto>

const unit = z.number().min(0).max(1)

export const LfoSettingsDto = z.object({
  waveform: WaveformDto,
  /** Cycles of the LFO per preset cycle, one of LFO_RATIOS. */
  ratio: z.number().refine((ratio) => (LFO_RATIOS as readonly number[]).includes(ratio), 'Rapport non synchronisé'),
  /** Phase offset, in LFO periods. */
  phase: unit,
  /** Peak-to-peak amplitude, as a fraction of the parameter range. */
  amplitude: unit,
  /** Centre of the oscillation, as a fraction of the parameter range. */
  offset: unit,
})
export type LfoSettingsDto = z.infer<typeof LfoSettingsDto>

export const ParamModeDto = z.enum(['fixed', 'curve', 'lfo'])
export type ParamModeDto = z.infer<typeof ParamModeDto>

/**
 * State of one parameter in one preset. Every mode keeps its settings, so
 * switching mode back and forth never loses a drawn curve or an LFO setting.
 */
export const ParamStateDto = z.object({
  mode: ParamModeDto,
  /** Shown on the parameters page in this preset (always true in preset 0). */
  visible: z.boolean(),
  /** Value in parameter units (number, boolean or text, according to the type). */
  fixed: OscValueDto,
  /** CURVE_POINT_COUNT normalized points, played in loop over the preset cycle. */
  curve: z.array(unit).length(CURVE_POINT_COUNT),
  lfo: LfoSettingsDto,
})
export type ParamStateDto = z.infer<typeof ParamStateDto>

/** One wire of the pin matrix: an input address drives a parameter address. */
export const PinLinkDto = z.object({ input: OscAddressDto, output: OscAddressDto })
export type PinLinkDto = z.infer<typeof PinLinkDto>

export const CycleBeatsDto = z.union([z.literal(4), z.literal(8), z.literal(16)])
export type CycleBeatsDto = z.infer<typeof CycleBeatsDto>

export const PresetDto = z.object({
  id: ShowIdDto,
  name: z.string(),
  description: z.string(),
  cycleBeats: CycleBeatsDto,
  /** One entry per declared parameter, keyed by address. */
  params: z.record(OscAddressDto, ParamStateDto),
  links: z.array(PinLinkDto),
})
export type PresetDto = z.infer<typeof PresetDto>

/** Content of a show file. */
export const ShowDto = z.object({
  version: z.literal(1),
  setup: SetupDto,
  /** presets[0] is preset 0. */
  presets: z.array(PresetDto).min(1),
})
export type ShowDto = z.infer<typeof ShowDto>

// ---------------------------------------------------------------- live state

export const TransportDto = z.object({
  playing: z.boolean(),
  bpm: z.number().min(20).max(400),
})
export type TransportDto = z.infer<typeof TransportDto>

export const IoStatusDto = z.object({
  /** Port actually listened to, null if the input socket could not be bound. */
  listeningPort: z.number().int().nullable(),
  output: OutputTargetDto,
  /** Last OSC I/O error, null if none. */
  error: z.string().nullable(),
})
export type IoStatusDto = z.infer<typeof IoStatusDto>

export const PresetSummaryDto = z.object({
  id: ShowIdDto,
  name: z.string(),
  description: z.string(),
  cycleBeats: CycleBeatsDto,
})
export type PresetSummaryDto = z.infer<typeof PresetSummaryDto>

/** Everything a GUI needs to render, sent at connection and after any structural change. */
export const SnapshotDto = z.object({
  showName: z.string(),
  shows: z.array(z.string()),
  setup: SetupDto,
  presets: z.array(PresetSummaryDto),
  activePreset: PresetDto,
  transport: TransportDto,
  io: IoStatusDto,
  /** Last value sent per parameter address. */
  values: z.record(z.string(), OscValueDto),
  /** Non-blocking problem to show to the user (e.g. a show file that could not be read). */
  warning: z.string().nullable(),
})
export type SnapshotDto = z.infer<typeof SnapshotDto>

export const ParamStateChangedDto = z.object({
  presetId: ShowIdDto,
  address: OscAddressDto,
  state: ParamStateDto,
})
export type ParamStateChangedDto = z.infer<typeof ParamStateChangedDto>

/** GUI-throttled frame: playhead plus the values that changed since the previous frame. */
export const LiveFrameDto = z.object({
  /** Beats elapsed since the active preset was recalled. */
  beat: z.number(),
  /** Position in the preset cycle, 0..1. */
  phase: unit,
  values: z.record(z.string(), OscValueDto),
  /** First argument of every OSC message received, declared or not, keyed by address. */
  inputs: z.record(z.string(), OscValueDto),
})
export type LiveFrameDto = z.infer<typeof LiveFrameDto>

// ---------------------------------------------------------------- requests

/** File-safe show name: it becomes `shows/<name>.json`. */
export const ShowNameDto = z.object({
  name: z.string().regex(/^[\w-]{1,64}$/, 'Nom de show : lettres, chiffres, - et _ uniquement'),
})
export type ShowNameDto = z.infer<typeof ShowNameDto>

export const PresetIdDto = z.object({ id: ShowIdDto })
export type PresetIdDto = z.infer<typeof PresetIdDto>

export const PresetInfoDto = z.object({
  name: z.string().min(1),
  description: z.string(),
  cycleBeats: CycleBeatsDto,
})
export type PresetInfoDto = z.infer<typeof PresetInfoDto>

export const UpdatePresetInfoDto = PresetInfoDto.extend({ id: ShowIdDto })
export type UpdatePresetInfoDto = z.infer<typeof UpdatePresetInfoDto>

export const MovePresetDto = z.object({
  id: ShowIdDto,
  /** New index; 0 is reserved for preset 0. */
  toIndex: z.number().int().min(1),
})
export type MovePresetDto = z.infer<typeof MovePresetDto>

/** Partial update of one parameter of the active preset. */
export const SetParamStateDto = z.object({
  address: OscAddressDto,
  patch: ParamStateDto.partial(),
})
export type SetParamStateDto = z.infer<typeof SetParamStateDto>

export const SetLinksDto = z.object({ links: z.array(PinLinkDto) })
export type SetLinksDto = z.infer<typeof SetLinksDto>

export const SetTransportDto = z.object({
  playing: z.boolean().optional(),
  bpm: TransportDto.shape.bpm.optional(),
})
export type SetTransportDto = z.infer<typeof SetTransportDto>
