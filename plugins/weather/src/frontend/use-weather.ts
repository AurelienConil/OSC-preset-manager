// Vue composable of the weather plugin: the live weather report and the city setter.
//
// EXAMPLE PLUGIN — see use-osc.ts for the composable pattern.
import { onScopeDispose, ref } from 'vue'
import { usePluginClient } from '@template/sdk/frontend'
import { weatherContract } from '../weather.contract'
import type { WeatherReportDto } from '../weather.dto'

export function useWeather() {
  const client = usePluginClient(weatherContract)
  const report = ref<WeatherReportDto | null>(null)

  // The single source of display updates: whether the city was set from this
  // window, another one, or an OSC message, the backend pushes `updated`.
  onScopeDispose(client.on('updated', (event) => (report.value = event)))

  // Initial state; ??= so a push that arrived meanwhile (fresher) is kept.
  client
    .request('getCurrent')
    .then((current) => (report.value ??= current))
    .catch((error: unknown) => console.error('Weather: cannot read the current report:', error))

  return {
    report,
    setCity: (city: string) => client.request('setCity', { city }),
  }
}
