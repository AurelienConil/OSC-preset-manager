// Unit tests of OpenMeteoClient with a stubbed global fetch: request building and response validation.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OpenMeteoClient } from './open-meteo-client'
import { failingFetch, fakeOpenMeteoFetch } from './open-meteo.fixtures'

const LYON = { name: 'Lyon', country: 'France', latitude: 45.74906, longitude: 4.84789 }

describe('OpenMeteoClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('finds a city', async () => {
    vi.stubGlobal('fetch', vi.fn(fakeOpenMeteoFetch))
    expect(await new OpenMeteoClient().findCity('Lyon')).toEqual(LYON)
  })

  it('rejects an unknown city', async () => {
    vi.stubGlobal('fetch', vi.fn(fakeOpenMeteoFetch))
    await expect(new OpenMeteoClient().findCity('Nowhere')).rejects.toThrow('City not found: "Nowhere"')
  })

  it('reads today temperatures in the city timezone', async () => {
    const fetch = vi.fn(fakeOpenMeteoFetch)
    vi.stubGlobal('fetch', fetch)

    expect(await new OpenMeteoClient().fetchTodayTemperatures(LYON)).toEqual({
      date: '2026-10-14',
      currentCelsius: 21.7,
      minCelsius: 15.1,
      maxCelsius: 21.7,
    })
    const url = new URL(String(fetch.mock.calls[0]?.[0]))
    expect(url.searchParams.get('timezone')).toBe('auto')
    expect(url.searchParams.get('latitude')).toBe('45.74906')
  })

  it('rejects an HTTP error explicitly', async () => {
    vi.stubGlobal('fetch', vi.fn(failingFetch(503)))
    await expect(new OpenMeteoClient().findCity('Lyon')).rejects.toThrow(/HTTP 503/)
  })

  it('rejects an answer that does not match the expected format', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ current: {} }))))
    await expect(new OpenMeteoClient().fetchTodayTemperatures(LYON)).rejects.toThrow()
  })
})
