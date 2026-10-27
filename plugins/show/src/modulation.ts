// Pure modulation math shared by the engine (backend) and the previews (frontend):
// LFO waveforms, curve sampling, and conversions between normalized and parameter values.
import type { LfoSettingsDto, OscValueDto, ParamStateDto, ParameterDeclDto } from './show.dto'

/** What a value conversion needs to know about a declared address. */
export type ValueRange = Pick<ParameterDeclDto, 'type' | 'min' | 'max'>

/** Fractional part, always in [0, 1), negative inputs included. */
export function fract(value: number): number {
  return value - Math.floor(value)
}

export function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** Deterministic pseudo-random value in [0, 1) for an integer step (sample & hold). */
function hashUnit(step: number): number {
  const x = Math.sin(step * 12.9898 + 78.233) * 43758.5453
  return fract(x)
}

/** Raw waveform in [0, 1] at a time expressed in LFO periods. */
export function waveformUnit(waveform: LfoSettingsDto['waveform'], periods: number): number {
  const p = fract(periods)
  switch (waveform) {
    case 'sine':
      return 0.5 + 0.5 * Math.sin(2 * Math.PI * p)
    case 'saw':
      return p
    case 'triangle':
      return p < 0.5 ? 2 * p : 2 - 2 * p
    case 'square':
      return p < 0.5 ? 1 : 0
    case 'random':
      return hashUnit(Math.floor(periods))
  }
}

/** LFO output in [0, 1] (the "percentage" of ofxGuiModulator), at a time expressed in preset cycles. */
export function lfoUnit(lfo: LfoSettingsDto, cycles: number): number {
  const wave = waveformUnit(lfo.waveform, cycles * lfo.ratio + lfo.phase)
  return clampUnit(lfo.offset + lfo.amplitude * (wave - 0.5))
}

/** Curve value in [0, 1] at a cycle position in [0, 1), linearly interpolated and looping. */
export function sampleCurve(points: readonly number[], phase: number): number {
  const count = points.length
  if (count === 0) return 0.5
  const position = fract(phase) * count
  const index = Math.floor(position)
  const from = points[index] ?? 0.5
  const to = points[(index + 1) % count] ?? from
  return from + (to - from) * (position - index)
}

/** Normalized value -> parameter value: scaled on min/max, rounded for int, stepped for bool. */
export function fromUnit(range: ValueRange, unit: number): OscValueDto {
  const u = clampUnit(unit)
  switch (range.type) {
    case 'bool':
      return u >= 0.5
    case 'int':
      return Math.round(range.min + u * (range.max - range.min))
    case 'float':
      return range.min + u * (range.max - range.min)
    case 'text':
      return ''
  }
}

/** Parameter value -> normalized value; undefined when it has no numeric meaning (text). */
export function toUnit(range: ValueRange, value: OscValueDto): number | undefined {
  if (typeof value === 'boolean') return value ? 1 : 0
  const numeric = numericOf(value)
  if (numeric === undefined) return undefined
  if (range.type === 'bool') return numeric >= 0.5 ? 1 : 0
  if (range.type === 'text') return undefined
  return clampUnit((numeric - range.min) / (range.max - range.min))
}

function numericOf(value: OscValueDto): number | undefined {
  if (typeof value === 'boolean') return undefined
  const numeric = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

/** True when a numeric value lies outside the declared min / max (it would be clamped). Never for bool or text. */
export function isSaturated(range: ValueRange, value: OscValueDto): boolean {
  if (range.type !== 'float' && range.type !== 'int') return false
  const numeric = numericOf(value)
  return numeric !== undefined && (numeric < range.min || numeric > range.max)
}

/** The value as the engine uses it: a value outside the range becomes the bound it exceeds. */
export function clampToRange(range: ValueRange, value: OscValueDto): OscValueDto {
  if (!isSaturated(range, value)) return value
  return (numericOf(value) as number) < range.min ? range.min : range.max
}

/** Default fixed value of a type: min for numbers, false, empty text. */
export function defaultValue(range: ValueRange): OscValueDto {
  switch (range.type) {
    case 'bool':
      return false
    case 'text':
      return ''
    case 'int':
      return Math.round(range.min)
    case 'float':
      return range.min
  }
}

/** Brings any value to the declared type and range (clamped, rounded, or default when meaningless). */
export function coerceValue(range: ValueRange, value: OscValueDto): OscValueDto {
  if (range.type === 'text') return String(value)
  const unit = toUnit(range, value)
  return unit === undefined ? defaultValue(range) : fromUnit(range, unit)
}

/** Converts a value received on an input to the units of a parameter (pin matrix). */
export function convertValue(from: ValueRange, to: ValueRange, value: OscValueDto): OscValueDto | undefined {
  if (to.type === 'text') return String(value)
  const unit = toUnit(from, value)
  return unit === undefined ? undefined : fromUnit(to, unit)
}

/** Where the engine is in time, relative to the recall of the active preset. */
export interface CyclePosition {
  /** Beats elapsed since the recall (never negative). */
  beats: number
  /** Duration of the preset cycle, in beats. */
  cycleBeats: number
}

/** Value of a parameter at a cycle position, in parameter units. */
export function evaluateParam(decl: ValueRange, state: ParamStateDto, position: CyclePosition): OscValueDto {
  if (decl.type === 'text' || state.mode === 'fixed') return coerceValue(decl, state.fixed)
  const cycles = position.beats / position.cycleBeats
  const unit = state.mode === 'curve' ? sampleCurve(state.curve, cycles) : lfoUnit(state.lfo, cycles)
  return fromUnit(decl, unit)
}
