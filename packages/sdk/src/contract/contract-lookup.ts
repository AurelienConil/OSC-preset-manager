// Looks up a request spec or push schema in a contract, failing loudly on unknown names.
import type { z } from 'zod'
import type { PluginContract, RequestSpec } from './plugin-contract'

export function requestSpecOf(contract: PluginContract, name: string): RequestSpec {
  const spec = contract.requests[name]
  if (!spec) throw new Error(`Plugin "${contract.id}" declares no request "${name}"`)
  return spec
}

export function pushSchemaOf(contract: PluginContract, name: string): z.ZodTypeAny {
  const schema = contract.pushes[name]
  if (!schema) throw new Error(`Plugin "${contract.id}" declares no push "${name}"`)
  return schema
}
