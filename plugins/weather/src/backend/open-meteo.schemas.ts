// zod schemas of the Open-Meteo API responses, limited to the fields this plugin reads.
//
// Not part of the plugin contract: these describe a third-party format. They
// exist because an external API is a trust boundary like IPC: if Open-Meteo
// changes its format, we want a clear validation error, not a NaN on screen.
import { z } from 'zod'

export const GeocodingResponse = z.object({
  // Absent (not empty) when no city matches.
  results: z
    .array(
      z.object({
        name: z.string(),
        country: z.string().optional(),
        latitude: z.number(),
        longitude: z.number(),
      }),
    )
    .optional(),
})

export const ForecastResponse = z.object({
  current: z.object({ temperature_2m: z.number() }),
  // Daily series are parallel arrays; forecast_days=1 gives exactly one entry.
  daily: z.object({
    time: z.array(z.string()).nonempty(),
    temperature_2m_min: z.array(z.number()).nonempty(),
    temperature_2m_max: z.array(z.number()).nonempty(),
  }),
})
