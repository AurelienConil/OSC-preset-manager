// WeatherManager: holds the current city's weather report and announces every new one.
//
// EXAMPLE PLUGIN — like every Manager, it receives what it needs in its
// constructor (a WeatherApi, a callback) and knows nothing about the SDK,
// the transport or Electron. Tests give it a fake WeatherApi: no network.
import type { WeatherReportDto } from '../weather.dto'
import type { WeatherApi } from './weather-api.types'

// Not a StoppableManager: it owns no resource (no timer, no socket) to
// release when the app quits. Implementing stop() would only be noise.
export class WeatherManager {
  private report: WeatherReportDto | null = null
  private latestRequestNumber = 0

  constructor(
    private readonly api: WeatherApi,
    private readonly onUpdated: (report: WeatherReportDto) => void,
  ) {}

  getCurrent(): WeatherReportDto | null {
    return this.report
  }

  /** Fetches today's temperatures of `city`. Rejects if the city is unknown or the API fails. */
  async setCity(city: string): Promise<WeatherReportDto> {
    const requestNumber = ++this.latestRequestNumber
    const location = await this.api.findCity(city)
    const today = await this.api.fetchTodayTemperatures(location)
    const report = { city: location.name, country: location.country, ...today, fetchedAt: new Date().toISOString() }

    // Cities can be requested faster than the API answers (OSC sliders...):
    // only the latest request may become the current report, whatever the
    // order in which the answers come back.
    if (requestNumber === this.latestRequestNumber) {
      this.report = report
      this.onUpdated(report)
    }
    return report
  }
}
