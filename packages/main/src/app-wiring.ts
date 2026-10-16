// App mediator: the only place that knows several plugins and decides how they react to each other.
//
// KEYSTONE OF THE PROJECT. Plugins never import each other: each one only
// exposes its contract (requests it answers, pushes it emits). Turning "when
// plugin A emits X, plugin B must do Y" into code is an *application* rule,
// so it lives here, not in A nor in B. That keeps every plugin reusable in
// another app, and gathers every cross-plugin behaviour in one readable file.
//
// host.client(contract) gives, from the main process, the same typed API as
// the renderer composables: request(name, payload) and on(push, listener).
// One function per rule; wireApp() only lists them.
//
// EXAMPLE RULE — everything about osc / weather below is a demonstration.
// When the example plugins are removed (CLAUDE.md §5.1), empty this file of
// it: delete forwardOscCityToWeather, WEATHER_CITY_OSC_ADDRESS and the two
// contract imports, and leave wireApp() with an empty body. Never delete the
// file nor wireApp(): it is where your own rules go.
import type { PluginClient } from '@template/sdk'
import { oscContract } from '@template/plugin-osc'
import { weatherContract } from '@template/plugin-weather'
import type { PluginHost } from './plugin-host/plugin-host'

/** OSC address that changes the weather city, e.g. `/weather/city "Lyon"`. */
export const WEATHER_CITY_OSC_ADDRESS = '/weather/city'

/** An OSC message `/weather/city <string>` sets the city of the weather plugin. */
function forwardOscCityToWeather(
  osc: PluginClient<typeof oscContract>,
  weather: PluginClient<typeof weatherContract>,
): void {
  osc.on('message', ({ address, args }) => {
    const [city] = args
    if (address !== WEATHER_CITY_OSC_ADDRESS || typeof city !== 'string') return
    // Nobody awaits a push listener: the error must be reported here, or it is lost.
    weather
      .request('setCity', { city })
      .catch((error: unknown) => console.error(`OSC ${address} "${city}": weather update failed:`, error))
  })
}

export function wireApp(host: PluginHost): void {
  forwardOscCityToWeather(host.client(oscContract), host.client(weatherContract))
}
