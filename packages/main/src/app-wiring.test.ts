// Tests of the app mediator: an OSC `/weather/city` message must set the weather plugin's city.
// EXAMPLE — tests the example rule only: delete with it (CLAUDE.md §5.1), then test your own rules here.
import { describe, expect, it, vi } from 'vitest'
import { definePlugin, type PluginContext } from '@template/sdk/backend'
import { oscContract } from '@template/plugin-osc'
import { weatherContract } from '@template/plugin-weather'
import { PluginHost } from './plugin-host/plugin-host'
import { WEATHER_CITY_OSC_ADDRESS, wireApp } from './app-wiring'

type OscPush = PluginContext<typeof oscContract>['push']

const STOPPED = { running: false, port: null, error: null }

// Stand-ins for the real plugins: the test controls OSC messages without a
// socket, and records weather requests without network.
function createFakeOscPlugin() {
  let push: OscPush = () => {}
  const plugin = definePlugin({
    sdkVersion: 1,
    contract: oscContract,
    setup(context) {
      context.handle('getStatus', () => STOPPED)
      context.handle('start', () => STOPPED)
      context.handle('stop', () => STOPPED)
      push = context.push
    },
  })
  const receive = (address: string, args: (string | number)[]) =>
    push('message', { address, args, receivedAt: new Date().toISOString() })
  return { plugin, receive }
}

function createFakeWeatherPlugin() {
  const setCity = vi.fn((city: string) => ({
    city,
    country: null,
    date: '2026-10-14',
    currentCelsius: 20,
    minCelsius: 10,
    maxCelsius: 25,
    fetchedAt: new Date().toISOString(),
  }))
  const plugin = definePlugin({
    sdkVersion: 1,
    contract: weatherContract,
    setup(context) {
      context.handle('getCurrent', () => null)
      context.handle('setCity', ({ city }) => setCity(city))
    },
  })
  return { plugin, setCity }
}

function createWiredApp() {
  const host = new PluginHost({
    transport: { onMessage: () => {}, broadcast: () => {} },
    paths: { resolve: () => { throw new Error('paths are not used in these tests') } },
  })
  const osc = createFakeOscPlugin()
  const weather = createFakeWeatherPlugin()
  host.load([osc.plugin, weather.plugin])
  wireApp(host)
  return { osc, weather }
}

describe('wireApp', () => {
  it('sets the weather city from an OSC /weather/city message', async () => {
    const { osc, weather } = createWiredApp()

    osc.receive(WEATHER_CITY_OSC_ADDRESS, ['Lyon'])

    await vi.waitFor(() => expect(weather.setCity).toHaveBeenCalledWith('Lyon'))
  })

  it('ignores other OSC addresses and non-string arguments', async () => {
    const { osc, weather } = createWiredApp()

    osc.receive('/other', ['Lyon'])
    osc.receive(WEATHER_CITY_OSC_ADDRESS, [42])
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(weather.setCity).not.toHaveBeenCalled()
  })
})
