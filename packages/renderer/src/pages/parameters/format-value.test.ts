// Unit tests of the display of input values: range formatting and saturation of out-of-range values.
import { describe, expect, it } from 'vitest'
import type { InputDeclDto } from '@template/plugin-show/dto'
import { formatInputValue, formatRange } from './format-value'

const fader: InputDeclDto = {
  address: '/fader1', type: 'float', min: 0, max: 1, description: '', keywords: [], maxRateHz: null,
}

describe('formatRange', () => {
  it('shows the range of numeric declarations only', () => {
    expect(formatRange(fader)).toBe('0 → 1')
    expect(formatRange({ ...fader, type: 'bool' })).toBe('—')
    expect(formatRange({ ...fader, type: 'text' })).toBe('—')
  })
})

describe('formatInputValue', () => {
  it('shows an in-range value as is, without saturation', () => {
    expect(formatInputValue(fader, 0.5)).toEqual({ text: '0.500', saturated: false })
    expect(formatInputValue(fader, 1)).toEqual({ text: '1', saturated: false })
  })

  it('shows the bound a value above max is clamped to, flagged with the raw value', () => {
    expect(formatInputValue(fader, 1000)).toEqual({
      text: '1',
      title: 'Valeur reçue 1000, hors de la plage 0 → 1',
      saturated: true,
    })
  })

  it('shows the lower bound for a value below min', () => {
    expect(formatInputValue({ ...fader, type: 'int', min: 0, max: 127 }, 128.5)).toMatchObject({ text: '127', saturated: true })
    expect(formatInputValue(fader, -2)).toMatchObject({ text: '0', saturated: true })
  })

  it('never flags a missing value or a bool / text declaration', () => {
    expect(formatInputValue(fader, undefined)).toEqual({ text: '—', saturated: false })
    expect(formatInputValue({ ...fader, type: 'bool' }, 5)).toMatchObject({ saturated: false })
  })
})
