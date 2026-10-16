// Validates plugin pushes, then fans them out to the GUI and to main-side listeners.
import { eventKey, type PushMessage } from '@template/sdk'
import type { z } from 'zod'

type PushListener = (payload: unknown) => void

export class PushHub {
  private readonly listeners = new Map<string, Set<PushListener>>()

  constructor(private readonly broadcast: (message: PushMessage) => void) {}

  publish(pluginId: string, name: string, schema: z.ZodTypeAny, payload: unknown): void {
    const data: unknown = schema.parse(payload)
    this.broadcast({ kind: 'push', plugin: pluginId, name, payload: data })
    this.listeners.get(eventKey(pluginId, name))?.forEach((listener) => listener(data))
  }

  /** Returns an unsubscribe function. */
  on(pluginId: string, name: string, listener: PushListener): () => void {
    const key = eventKey(pluginId, name)
    const listeners = this.listeners.get(key) ?? new Set<PushListener>()
    this.listeners.set(key, listeners)
    listeners.add(listener)
    return () => listeners.delete(listener)
  }
}
