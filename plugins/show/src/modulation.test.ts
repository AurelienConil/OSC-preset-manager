// Unit tests of the shared modulation math.
import { describe, expect, it } from 'vitest'
import type { LfoSettingsDto, ParamStateDto } from './show.dto'
import {
  clampToRange,
  coerceValue,
  convertValue,
  evaluateParam,
  fromUnit,
  isSaturated,
  lfoUnit,
  sampleCurve,
  waveformUnit,
} from './modulation'

const float = { type: 'float', min: 0, max: 10 } as const
const int = { type: 'int', min: 0, max: 4 } as const
const bool = { type: 'bool', min: 0, max: 1 } as const
const text = { type: 'text', min: 0, max: 1 } as const

const lfo: LfoSettingsDto = { waveform: 'saw', ratio: 1, phase: 0, amplitude: 1, offset: 0.5 }

describe('waveforms', () => {
  it('produce the expected shapes over one period', () => {
    expect(waveformUnit('saw', 0.25)).toBeCloseTo(0.25)
    expect(waveformUnit('triangle', 0.25)).toBeCloseTo(0.5)
    expect(waveformUnit('triangle', 0.5)).toBeCloseTo(1)
    expect(waveformUnit('square', 0.25)).toBe(1)
    expect(waveformUnit('square', 0.75)).toBe(0)
    expect(waveformUnit('sine', 0.25)).toBeCloseTo(1)
  })

  it('holds the random value for a whole period', () => {
    expect(waveformUnit('random', 3.1)).toBe(waveformUnit('random', 3.9))
    expect(waveformUnit('random', 3.1)).not.toBe(waveformUnit('random', 4.1))
  })
})

describe('lfoUnit', () => {
  it('applies ratio, phase, amplitude and offset', () => {
    expect(lfoUnit({ ...lfo, ratio: 2 }, 0.25)).toBeCloseTo(0.5)
    expect(lfoUnit({ ...lfo, phase: 0.5 }, 0)).toBeCloseTo(0.5)
    expect(lfoUnit({ ...lfo, amplitude: 0.5, offset: 0.5 }, 0)).toBeCloseTo(0.25)
    expect(lfoUnit({ ...lfo, offset: 1 }, 0.9)).toBe(1)
  })
})

describe('sampleCurve', () => {
  it('interpolates linearly and loops to the first point', () => {
    expect(sampleCurve([0, 1], 0.25)).toBeCloseTo(0.5)
    expect(sampleCurve([0, 1], 0.75)).toBeCloseTo(0.5)
    expect(sampleCurve([0.2, 0.4], 1)).toBeCloseTo(0.2)
  })
})

describe('conversions', () => {
  it('scales, rounds and steps normalized values', () => {
    expect(fromUnit(float, 0.25)).toBe(2.5)
    expect(fromUnit(int, 0.6)).toBe(2)
    expect(fromUnit(bool, 0.49)).toBe(false)
    expect(fromUnit(bool, 0.5)).toBe(true)
  })

  it('coerces fixed values to the declared type', () => {
    expect(coerceValue(float, 42)).toBe(10)
    expect(coerceValue(int, 'nope')).toBe(0)
    expect(coerceValue(bool, 1)).toBe(true)
    expect(coerceValue(text, 3)).toBe('3')
  })

  it('converts an input value to a parameter range', () => {
    expect(convertValue({ type: 'int', min: 0, max: 127 }, float, 127)).toBe(10)
    expect(convertValue(bool, float, true)).toBe(10)
    expect(convertValue(text, float, 'abc')).toBeUndefined()
    expect(convertValue(float, text, 5)).toBe('5')
  })
})

describe('range saturation', () => {
  it('flags a numeric value outside min / max, and only those', () => {
    expect(isSaturated(float, 10)).toBe(false)
    expect(isSaturated(float, 10.5)).toBe(true)
    expect(isSaturated(float, -0.1)).toBe(true)
    expect(isSaturated(int, 128.5)).toBe(true)
    expect(isSaturated(float, '12')).toBe(true)
    expect(isSaturated(float, 'abc')).toBe(false)
    expect(isSaturated(bool, 5)).toBe(false)
    expect(isSaturated(text, 5)).toBe(false)
  })

  it('clamps a saturated value to the bound it exceeds', () => {
    expect(clampToRange(int, 128.5)).toBe(4)
    expect(clampToRange(float, -3)).toBe(0)
    expect(clampToRange(float, 7)).toBe(7)
    expect(clampToRange(float, 'abc')).toBe('abc')
  })
})

describe('evaluateParam', () => {
  const state: ParamStateDto = {
    mode: 'curve',
    visible: true,
    fixed: 3,
    curve: [0, 1],
    lfo,
  }

  it('follows the mode of the parameter', () => {
    const position = { beats: 1, cycleBeats: 4 }
    expect(evaluateParam(float, { ...state, mode: 'fixed' }, position)).toBe(3)
    expect(evaluateParam(float, state, position)).toBeCloseTo(5)
    expect(evaluateParam(float, { ...state, mode: 'lfo' }, position)).toBeCloseTo(2.5)
    expect(evaluateParam(text, { ...state, fixed: 'hi' }, position)).toBe('hi')
  })
})
