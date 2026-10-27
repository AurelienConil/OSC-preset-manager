// Contract tests of the show plugin: real setup, validated against the contract by the SDK harness.
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTestHarness } from '@template/sdk/testing'
import showPlugin from './show-plugin'

describe('show plugin', () => {
  let root: string
  let harness: PluginTestHarness<typeof showPlugin.contract>

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'show-plugin-'))
    harness = new PluginTestHarness(showPlugin, { paths: { resolve: (relative) => join(root, relative) } })
  })

  afterEach(async () => {
    await harness.stop()
    await rm(root, { recursive: true, force: true })
  })

  it('serves a valid snapshot of the default show', async () => {
    const snapshot = await harness.request('getSnapshot')
    expect(snapshot.showName).toBe('default')
    expect(snapshot.setup.parameters.length).toBeGreaterThan(0)
  })

  it('manages presets through the contract', async () => {
    const created = await harness.request('createPreset', { name: 'Intro', description: 'Ouverture', cycleBeats: 16 })
    const intro = created.presets[1]!
    const recalled = await harness.request('recallPreset', { id: intro.id })
    expect(recalled.activePreset.name).toBe('Intro')
    expect(harness.pushesOf('snapshot').length).toBeGreaterThan(0)
  })

  it('rejects an invalid cycle duration (contract)', async () => {
    await expect(
      harness.request('createPreset', { name: 'X', description: '', cycleBeats: 5 as never }),
    ).rejects.toThrow()
  })

  it('rejects an unsynchronized LFO ratio (contract)', async () => {
    await expect(
      harness.request('setParamState', {
        address: '/video/layer1/hue',
        patch: { lfo: { waveform: 'sine', ratio: 3, phase: 0, amplitude: 1, offset: 0.5 } },
      }),
    ).rejects.toThrow()
  })
})
