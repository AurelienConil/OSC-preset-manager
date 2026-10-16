// Routes renderer/main requests to plugin handlers, validating payload and result.
import { eventKey, type RequestMessage, type RequestSpec, type ResponseMessage } from '@template/sdk'

export interface Route {
  spec: RequestSpec
  handler: (payload: unknown) => unknown
}

function errorResponse(id: number, error: unknown): ResponseMessage {
  const message = error instanceof Error ? error.message : String(error)
  return { kind: 'response', id, payload: undefined, error: message }
}

export class RequestRouter {
  private readonly routes = new Map<string, Route>()

  register(pluginId: string, name: string, route: Route): void {
    const key = eventKey(pluginId, name)
    if (this.routes.has(key)) throw new Error(`Request "${key}" already has a handler`)
    this.routes.set(key, route)
  }

  has(pluginId: string, name: string): boolean {
    return this.routes.has(eventKey(pluginId, name))
  }

  async dispatch(message: RequestMessage): Promise<ResponseMessage> {
    const key = eventKey(message.plugin, message.name)
    const route = this.routes.get(key)
    if (!route) return errorResponse(message.id, `Unknown request "${key}"`)
    try {
      const payload: unknown = route.spec.request.parse(message.payload)
      const result = await route.handler(payload)
      return { kind: 'response', id: message.id, payload: route.spec.response.parse(result) }
    } catch (error) {
      return errorResponse(message.id, error)
    }
  }
}
