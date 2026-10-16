// Plugin contract: the public API of a plugin (requests and pushes) as zod schemas.
import type { z } from 'zod'

export interface RequestSpec {
  request: z.ZodTypeAny
  response: z.ZodTypeAny
}

export interface PluginContract {
  id: string
  requests: Record<string, RequestSpec>
  pushes: Record<string, z.ZodTypeAny>
}

export function defineContract<C extends PluginContract>(contract: C): C {
  return contract
}
