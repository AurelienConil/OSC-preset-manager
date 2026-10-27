// Validates plugin pushes, then hands them to main-side listeners and, if the mediator forwards them, to the GUI.
import { eventKey, type PushMessage } from '@template/sdk'
import type { z } from 'zod'
import type { GuiForwarding } from './gui-forwarding'

type PushListener = (payload: unknown) => void

export class PushHub {
  private readonly listeners = new Map<string, Set<PushListener>>()
  /** Pushes already reported as reaching nobody: warn once per push, not at every emission. */
  private readonly reportedUnheard = new Set<string>()

  constructor(
    private readonly broadcast: (message: PushMessage) => void,
    private readonly gui: GuiForwarding,
  ) {}

  publish(pluginId: string, name: string, schema: z.ZodTypeAny, payload: unknown): void {
    const data: unknown = schema.parse(payload)
    const key = eventKey(pluginId, name)
    const listeners = this.listeners.get(key)
    listeners?.forEach((listener) => listener(data))
    const forwarded = this.gui.isForwarded(pluginId, name)
    if (forwarded) this.broadcast({ kind: 'push', plugin: pluginId, name, payload: data })
    if (!forwarded && !listeners?.size) this.reportUnheard(key)
  }

  /** Returns an unsubscribe function. */
  on(pluginId: string, name: string, listener: PushListener): () => void {
    const key = eventKey(pluginId, name)
    const listeners = this.listeners.get(key) ?? new Set<PushListener>()
    this.listeners.set(key, listeners)
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  /** The likely cause is a forgotten host.gui.forward(): say so, since the GUI just stays silent. */
  private reportUnheard(key: string): void {
    if (this.reportedUnheard.has(key)) return
    this.reportedUnheard.add(key)
    console.warn(`Push "${key}" reaches nobody: forward it to the GUI in app-wiring.ts (host.gui.forward) or listen to it`)
  }
}
