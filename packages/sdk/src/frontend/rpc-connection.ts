// Renderer-side RPC connection: correlates responses to requests and dispatches pushes.
import { HostMessage, type ResponseMessage } from '../protocol/wire-message'
import { eventKey } from '../protocol/event-key'
import type { ClientTransport } from './client-transport.types'

interface PendingRequest {
  resolve: (payload: unknown) => void
  reject: (error: Error) => void
}

type PushListener = (payload: unknown) => void

export class RpcConnection {
  private nextId = 1
  private readonly pending = new Map<number, PendingRequest>()
  private readonly pushListeners = new Map<string, Set<PushListener>>()

  constructor(private readonly transport: ClientTransport) {
    transport.onMessage((raw) => this.receive(raw))
  }

  request(pluginId: string, name: string, payload: unknown): Promise<unknown> {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.transport.send({ kind: 'request', id, plugin: pluginId, name, payload })
    })
  }

  /** Returns an unsubscribe function. */
  on(pluginId: string, name: string, listener: PushListener): () => void {
    const key = eventKey(pluginId, name)
    const listeners = this.pushListeners.get(key) ?? new Set<PushListener>()
    this.pushListeners.set(key, listeners)
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  private receive(raw: unknown): void {
    const parsed = HostMessage.safeParse(raw)
    if (!parsed.success) {
      console.error('Rejected malformed message from main:', parsed.error.message)
      return
    }
    const message = parsed.data
    if (message.kind === 'response') this.settle(message)
    else this.pushListeners.get(eventKey(message.plugin, message.name))?.forEach((l) => l(message.payload))
  }

  private settle(message: ResponseMessage): void {
    const request = this.pending.get(message.id)
    if (!request) return
    this.pending.delete(message.id)
    if (message.error !== undefined) request.reject(new Error(message.error))
    else request.resolve(message.payload)
  }
}
