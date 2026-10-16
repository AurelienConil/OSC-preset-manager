// Test-only fake of the global fetch answering like Open-Meteo, for the client and plugin tests (never bundled).

/** Trimmed copies of real Open-Meteo answers for Lyon. */
const GEOCODING_LYON = {
  results: [{ name: 'Lyon', country: 'France', latitude: 45.74906, longitude: 4.84789 }],
}
const FORECAST_LYON = {
  current: { time: '2026-10-14T17:15', temperature_2m: 21.7 },
  daily: { time: ['2026-10-14'], temperature_2m_min: [15.1], temperature_2m_max: [21.7] },
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** Knows only Lyon; any other city name gets Open-Meteo's "no result" answer. */
export async function fakeOpenMeteoFetch(input: string | URL | Request): Promise<Response> {
  const url = new URL(String(input))
  if (url.hostname.startsWith('geocoding-api')) {
    return jsonResponse(url.searchParams.get('name') === 'Lyon' ? GEOCODING_LYON : {})
  }
  return jsonResponse(FORECAST_LYON)
}

export function failingFetch(status: number): () => Promise<Response> {
  return async () => jsonResponse({ error: true }, status)
}
