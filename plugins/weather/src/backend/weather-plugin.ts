// Backend entry point of the weather plugin, loaded by the host.
//
// EXAMPLE PLUGIN — see osc-plugin.ts for the role of each call.
import { definePlugin } from '@template/sdk/backend'
import { weatherContract } from '../weather.contract'
import { OpenMeteoClient } from './open-meteo-client'
import { WeatherManager } from './weather-manager'

export default definePlugin({
  sdkVersion: 1,
  contract: weatherContract,
  setup(context) {
    // Composition: the concrete API client is chosen here, the Manager only
    // sees the WeatherApi interface.
    const manager = new WeatherManager(new OpenMeteoClient(), (report) => context.push('updated', report))

    context.handle('getCurrent', () => manager.getCurrent())
    // A rejection (unknown city, network down) reaches the caller as a
    // rejected Promise carrying the error message: never return a fake report.
    context.handle('setCity', ({ city }) => manager.setCity(city))

    // Nothing returned: the Manager owns no resource to stop.
  },
})
