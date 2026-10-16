// Namespaced key of a plugin request or push ("<pluginId>:<name>").

export function eventKey(pluginId: string, name: string): string {
  return `${pluginId}:${name}`
}
