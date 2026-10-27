// Wire protocol between renderer and main (any transport): zod schemas of every message.
import { z } from 'zod'

export const RequestMessage = z.object({
  kind: z.literal('request'),
  id: z.number().int(),
  plugin: z.string(),
  name: z.string(),
  payload: z.unknown(),
})
export type RequestMessage = z.infer<typeof RequestMessage>

export const ResponseMessage = z.object({
  kind: z.literal('response'),
  id: z.number().int(),
  payload: z.unknown(),
  /** Present only when the request failed. */
  error: z.string().optional(),
})
export type ResponseMessage = z.infer<typeof ResponseMessage>

export const PushMessage = z.object({
  kind: z.literal('push'),
  plugin: z.string(),
  name: z.string(),
  payload: z.unknown(),
})
export type PushMessage = z.infer<typeof PushMessage>

export const HostMessage = z.discriminatedUnion('kind', [ResponseMessage, PushMessage])
export type HostMessage = z.infer<typeof HostMessage>
