// OpenMeteoClient: WeatherApi implementation over the free, key-less Open-Meteo HTTP API.
//
// Runs in the main process, which is why this plugin needs a backend: the
// renderer stays offline-only (no network access to grant, no CORS, and the
// API could later require a key that must never reach the renderer).
import type { CityLocation, TodayTemperatures, WeatherApi } from './weather-api.types'
import { ForecastResponse, GeocodingResponse } from './open-meteo.schemas'

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const REQUEST_TIMEOUT_MS = 10_000

async function fetchJson(baseUrl: string, query: Record<string, string>): Promise<unknown> {
  const url = `${baseUrl}?${new URLSearchParams(query).toString()}`
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`Open-Meteo answered HTTP ${response.status} (${baseUrl})`)
  return response.json()
}

export class OpenMeteoClient implements WeatherApi {
  async findCity(name: string): Promise<CityLocation> {
    const query = { name, count: '1', language: 'fr', format: 'json' }
    const { results } = GeocodingResponse.parse(await fetchJson(GEOCODING_URL, query))
    const match = results?.[0]
    if (!match) throw new Error(`City not found: "${name}"`)
    return { name: match.name, country: match.country ?? null, latitude: match.latitude, longitude: match.longitude }
  }

  async fetchTodayTemperatures({ latitude, longitude }: CityLocation): Promise<TodayTemperatures> {
    const query = {
      latitude: String(latitude),
      longitude: String(longitude),
      current: 'temperature_2m',
      daily: 'temperature_2m_min,temperature_2m_max',
      // 'auto': "today" is the city's local day, not the user's.
      timezone: 'auto',
      forecast_days: '1',
    }
    const { current, daily } = ForecastResponse.parse(await fetchJson(FORECAST_URL, query))
    return {
      date: daily.time[0],
      currentCelsius: current.temperature_2m,
      minCelsius: daily.temperature_2m_min[0],
      maxCelsius: daily.temperature_2m_max[0],
    }
  }
}
