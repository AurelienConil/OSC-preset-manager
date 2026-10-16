// Contract tests of the weather plugin: real setup and real client, global fetch stubbed.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PluginTestHarness } from '@template/sdk/testing'
import weatherPlugin from './weather-plugin'
import { fakeOpenMeteoFetch } from './open-meteo.fixtures'

describe('weather plugin', () => {
  let harness: PluginTestHarness<typeof weatherPlugin.contract>

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(fakeOpenMeteoFetch))
    harness = new PluginTestHarness(weatherPlugin)
  })

  afterEach(async () => {
    await harness.stop()
    vi.unstubAllGlobals()
  })

  it('has no report before a city is chosen', async () => {
    expect(await harness.request('getCurrent')).toBeNull()
  })

  it('sets the city (trimmed by the contract) and pushes the report', async () => {
    const report = await harness.request('setCity', { city: '  Lyon ' })

    expect(report).toMatchObject({ city: 'Lyon', currentCelsius: 21.7 })
    expect(await harness.request('getCurrent')).toEqual(report)
    expect(harness.pushesOf('updated')).toEqual([report])
  })

  it('rejects an empty city (contract)', async () => {
    await expect(harness.request('setCity', { city: '   ' })).rejects.toThrow()
  })

  it('rejects an unknown city without pushing', async () => {
    await expect(harness.request('setCity', { city: 'Nowhere' })).rejects.toThrow('City not found')
    expect(harness.pushesOf('updated')).toEqual([])
  })
})
