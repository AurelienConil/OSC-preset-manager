// Port between WeatherManager and any weather data source (Open-Meteo in production, a fake in tests).
//
// The Manager depends on this interface, not on OpenMeteoClient: swapping the
// provider, or testing without network, never touches the business logic.

export interface CityLocation {
  name: string
  country: string | null
  latitude: number
  longitude: number
}

export interface TodayTemperatures {
  /** YYYY-MM-DD in the city's own timezone. */
  date: string
  currentCelsius: number
  minCelsius: number
  maxCelsius: number
}

export interface WeatherApi {
  /** Rejects if no city matches `name`. */
  findCity(name: string): Promise<CityLocation>
  fetchTodayTemperatures(location: CityLocation): Promise<TodayTemperatures>
}
