// Public DTOs of the OSC plugin (zod schemas + inferred types), shared by backend and frontend.
//
// EXAMPLE PLUGIN — see plugins/README.md. One DTO = one zod schema; the
// TypeScript type is derived with z.infer so the two can never drift apart.
import { z } from 'zod'

/** Port suggested by the GUI; 9000 is a common default in OSC tools (TouchOSC, Max...). */
export const DEFAULT_OSC_PORT = 9000

/** OSC argument types this plugin decodes: int32 / float32 (number), string, true / false. */
export const OscArgumentDto = z.union([z.number(), z.string(), z.boolean()])
export type OscArgumentDto = z.infer<typeof OscArgumentDto>

export const OscMessageDto = z.object({
  address: z.string().startsWith('/'),
  args: z.array(OscArgumentDto),
  /** ISO timestamp set by the backend when the packet arrived. */
  receivedAt: z.string(),
})
export type OscMessageDto = z.infer<typeof OscMessageDto>

// Ports below 1024 need admin rights on most systems: rejecting them here
// gives the user a clear validation error instead of a cryptic EACCES.
export const OscStartRequestDto = z.object({ port: z.number().int().min(1024).max(65535) })
export type OscStartRequestDto = z.infer<typeof OscStartRequestDto>

export const OscStatusDto = z.object({
  running: z.boolean(),
  /** Listening port, null while stopped. */
  port: z.number().int().nullable(),
  /** Last runtime socket error, null if none since the last start. */
  error: z.string().nullable(),
})
export type OscStatusDto = z.infer<typeof OscStatusDto>
