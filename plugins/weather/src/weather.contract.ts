// Public contract of the weather plugin: its requests and pushes, shared by backend and frontend.
//
// EXAMPLE PLUGIN — see osc.contract.ts for how a contract is used.
import { z } from 'zod'
import { defineContract } from '@template/sdk'
import { SetCityRequestDto, WeatherReportDto } from './weather.dto'

export const weatherContract = defineContract({
  id: 'weather',
  requests: {
    // Null until a city has been chosen.
    getCurrent: { request: z.undefined(), response: WeatherReportDto.nullable() },
    setCity: { request: SetCityRequestDto, response: WeatherReportDto },
  },
  pushes: {
    // Needed even though setCity already returns the report: the city can be
    // changed by someone else than the window that displays it (another
    // window, or an OSC message through the app mediator).
    updated: WeatherReportDto,
  },
})
