// Role: display format of an OSC value (live values, pin matrix inputs) and of a declared range.
import type { InputDeclDto, OscValueDto, ParameterDeclDto } from '@template/plugin-show/dto'
import { clampToRange, isSaturated } from '@template/plugin-show/modulation'

export function formatValue(value: OscValueDto | undefined): string {
  if (value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'on' : 'off'
  if (typeof value === 'string') return `"${value}"`
  return Number.isInteger(value) ? String(value) : value.toFixed(3)
}

/** Declared range of a numeric declaration, "—" for bool and text. */
export function formatRange(decl: ParameterDeclDto | InputDeclDto): string {
  return decl.type === 'float' || decl.type === 'int' ? `${decl.min} → ${decl.max}` : '—'
}

/** Live value of an input as used by the engine: clamped to its range, and flagged when the raw value was outside it. */
export function formatInputValue(decl: InputDeclDto, value: OscValueDto | undefined): { text: string; title?: string; saturated: boolean } {
  if (value === undefined || !isSaturated(decl, value)) return { text: formatValue(value), saturated: false }
  return {
    text: formatValue(clampToRange(decl, value)),
    title: `Valeur reçue ${formatValue(value)}, hors de la plage ${formatRange(decl)}`,
    saturated: true,
  }
}
