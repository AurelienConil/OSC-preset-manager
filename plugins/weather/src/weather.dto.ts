// Public DTOs of the weather plugin (zod schemas + inferred types), shared by backend and frontend.
//
// EXAMPLE PLUGIN — see plugins/README.md. One DTO = one zod schema; the
// TypeScript type is derived with z.infer so the two can never drift apart.
import { z } from 'zod'

// trim() is a transform: the handler receives the trimmed name, so " Lyon "
// typed in the GUI or sent over OSC is the same city.
export const SetCityRequestDto = z.object({ city: z.string().trim().min(1).max(100) })
export type SetCityRequestDto = z.infer<typeof SetCityRequestDto>

export const WeatherReportDto = z.object({
  /** City name as resolved by the geocoding API (may differ from what was typed). */
  city: z.string(),
  /** Null for places outside any country. */
  country: z.string().nullable(),
  /** Day of the report, YYYY-MM-DD in the city's own timezone. */
  date: z.string(),
  currentCelsius: z.number(),
  minCelsius: z.number(),
  maxCelsius: z.number(),
  /** ISO timestamp of the API call. */
  fetchedAt: z.string(),
})
export type WeatherReportDto = z.infer<typeof WeatherReportDto>
