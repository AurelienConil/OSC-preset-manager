// Role: form model of an OSC declaration, and the declaration proposed for an address seen on the input.
import type { InputDeclDto, OscValueDto } from '@template/plugin-show/dto'

/** Common form of a parameter and an input; maxRateHz is ignored for a parameter. */
export type DeclarationForm = InputDeclDto

export function guessInputDeclaration(address: string, value: OscValueDto | undefined): DeclarationForm {
  const base = { address, min: 0, max: 1, description: '', keywords: [], maxRateHz: null }
  if (typeof value === 'boolean') return { ...base, type: 'bool' }
  if (typeof value === 'string') return { ...base, type: 'text' }
  // Integer above 1: probably a MIDI-like 0..127 controller.
  if (typeof value === 'number' && Number.isInteger(value) && value > 1) return { ...base, type: 'int', max: 127 }
  return { ...base, type: 'float' }
}
