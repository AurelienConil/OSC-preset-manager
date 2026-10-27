// Unit tests of ShowDocument: preset 0 rules, preset management and normalization against the setup.
import { describe, expect, it } from 'vitest'
import type { ParameterDeclDto } from '../../show.dto'
import { createDefaultShow } from './show-defaults'
import { ShowDocument } from './show-document'

function createDocument() {
  let next = 0
  const createId = () => `id-${next++}`
  return new ShowDocument(createDefaultShow(createId), createId)
}

const OPACITY = '/video/master/opacity'

describe('ShowDocument presets', () => {
  it('creates a new preset as a copy of preset 0, at the end', () => {
    const doc = createDocument()
    doc.setParamState(doc.presetZero().id, { address: OPACITY, patch: { fixed: 0.4 } })

    const preset = doc.createPreset({ name: 'Intro', description: '', cycleBeats: 8 })

    expect(doc.presetSummaries().map((p) => p.name)).toEqual(['Preset 0', 'Intro'])
    expect(preset.cycleBeats).toBe(8)
    expect(preset.params[OPACITY]?.fixed).toBe(0.4)
    expect(preset.id).not.toBe(doc.presetZero().id)
  })

  it('duplicates a preset right after its source, as an independent copy', () => {
    const doc = createDocument()
    const a = doc.createPreset({ name: 'A', description: '', cycleBeats: 4 })
    doc.createPreset({ name: 'B', description: '', cycleBeats: 4 })

    const copy = doc.duplicatePreset(a.id)
    doc.setParamState(copy.id, { address: OPACITY, patch: { fixed: 1 } })

    expect(doc.presetSummaries().map((p) => p.name)).toEqual(['Preset 0', 'A', 'A (copie)', 'B'])
    expect(doc.preset(a.id).params[OPACITY]?.fixed).toBe(0)
  })

  it('moves presets but never preset 0 nor before it', () => {
    const doc = createDocument()
    const a = doc.createPreset({ name: 'A', description: '', cycleBeats: 4 })
    const b = doc.createPreset({ name: 'B', description: '', cycleBeats: 4 })

    doc.movePreset(b.id, 1)
    expect(doc.presetSummaries().map((p) => p.name)).toEqual(['Preset 0', 'B', 'A'])
    doc.movePreset(a.id, 99)
    expect(doc.presetSummaries().map((p) => p.name)).toEqual(['Preset 0', 'B', 'A'])
    expect(() => doc.movePreset(doc.presetZero().id, 2)).toThrow(/preset 0/)
  })

  it('deletes a preset but never preset 0', () => {
    const doc = createDocument()
    const a = doc.createPreset({ name: 'A', description: '', cycleBeats: 4 })
    doc.deletePreset(a.id)
    expect(doc.presetSummaries()).toHaveLength(1)
    expect(() => doc.deletePreset(doc.presetZero().id)).toThrow(/preset 0/)
  })
})

describe('ShowDocument parameters', () => {
  it('keeps every parameter visible in preset 0', () => {
    const doc = createDocument()
    const state = doc.setParamState(doc.presetZero().id, { address: OPACITY, patch: { visible: false } })
    expect(state.visible).toBe(true)
  })

  it('hides a parameter in a regular preset', () => {
    const doc = createDocument()
    const preset = doc.createPreset({ name: 'A', description: '', cycleBeats: 4 })
    expect(doc.setParamState(preset.id, { address: OPACITY, patch: { visible: false } }).visible).toBe(false)
  })

  it('clamps and coerces a fixed value to the declared type', () => {
    const doc = createDocument()
    const zero = doc.presetZero().id
    expect(doc.setParamState(zero, { address: OPACITY, patch: { fixed: 7 } }).fixed).toBe(1)
    expect(doc.setParamState(zero, { address: '/video/layer1/speed', patch: { fixed: 3.6 } }).fixed).toBe(4)
    expect(doc.setParamState(zero, { address: '/video/title', patch: { mode: 'lfo' } }).mode).toBe('fixed')
  })

  it('rejects an undeclared parameter', () => {
    const doc = createDocument()
    expect(() => doc.setParamState(doc.presetZero().id, { address: '/nope', patch: {} })).toThrow(/non déclaré/)
  })
})

describe('ShowDocument setup changes', () => {
  it('adds new parameters to every preset and drops removed ones', () => {
    const doc = createDocument()
    const preset = doc.createPreset({ name: 'A', description: '', cycleBeats: 4 })
    const added: ParameterDeclDto = { address: '/new', type: 'int', min: 2, max: 9, description: '', keywords: [] }

    doc.replaceSetup({ ...doc.setup, parameters: [added] })

    expect(Object.keys(doc.preset(preset.id).params)).toEqual(['/new'])
    expect(doc.preset(preset.id).params['/new']?.fixed).toBe(2)
  })

  it('keeps only pin links between declared, distinct addresses', () => {
    const doc = createDocument()
    const zero = doc.presetZero().id
    doc.setLinks(zero, [
      { input: '/fader1', output: OPACITY },
      { input: '/fader1', output: OPACITY },
      { input: '/unknown', output: OPACITY },
      { input: '/fader1', output: '/unknown' },
    ])
    expect(doc.presetZero().links).toEqual([{ input: '/fader1', output: OPACITY }])

    doc.replaceSetup({ ...doc.setup, inputs: [] })
    expect(doc.presetZero().links).toEqual([])
  })
})
