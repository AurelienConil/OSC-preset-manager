// Unit tests of WeatherManager with a fake WeatherApi: no network.
import { describe, expect, it, vi } from 'vitest'
import type { CityLocation, WeatherApi } from './weather-api.types'
import { WeatherManager } from './weather-manager'

const LYON: CityLocation = { name: 'Lyon', country: 'France', latitude: 45.75, longitude: 4.85 }
const TODAY = { date: '2026-10-14', currentCelsius: 21.7, minCelsius: 15.1, maxCelsius: 21.7 }

function createFakeApi(overrides: Partial<WeatherApi> = {}): WeatherApi {
  return {
    findCity: async (name) => ({ ...LYON, name }),
    fetchTodayTemperatures: async () => TODAY,
    ...overrides,
  }
}

describe('WeatherManager', () => {
  it('has no report until a city is set', () => {
    expect(new WeatherManager(createFakeApi(), () => {}).getCurrent()).toBeNull()
  })

  it('builds the report of the city and announces it', async () => {
    const onUpdated = vi.fn()
    const manager = new WeatherManager(createFakeApi(), onUpdated)

    const report = await manager.setCity('Lyon')

    expect(report).toEqual({ city: 'Lyon', country: 'France', ...TODAY, fetchedAt: expect.any(String) })
    expect(manager.getCurrent()).toEqual(report)
    expect(onUpdated).toHaveBeenCalledWith(report)
  })

  it('keeps the previous report when the city is unknown', async () => {
    const api = createFakeApi({
      findCity: async (name) => {
        if (name === 'Nowhere') throw new Error(`City not found: "${name}"`)
        return { ...LYON, name }
      },
    })
    const onUpdated = vi.fn()
    const manager = new WeatherManager(api, onUpdated)
    await manager.setCity('Lyon')

    await expect(manager.setCity('Nowhere')).rejects.toThrow('City not found: "Nowhere"')
    expect(manager.getCurrent()?.city).toBe('Lyon')
    expect(onUpdated).toHaveBeenCalledOnce()
  })

  it('keeps the latest requested city when answers come back out of order', async () => {
    let answerSlowCity: () => void = () => {}
    const api = createFakeApi({
      findCity: (name) =>
        name === 'Slow'
          ? new Promise((resolve) => (answerSlowCity = () => resolve({ ...LYON, name })))
          : Promise.resolve({ ...LYON, name }),
    })
    const onUpdated = vi.fn()
    const manager = new WeatherManager(api, onUpdated)

    const slow = manager.setCity('Slow')
    await manager.setCity('Fast')
    answerSlowCity()
    await slow

    expect(manager.getCurrent()?.city).toBe('Fast')
    expect(onUpdated).toHaveBeenCalledOnce()
  })
})
