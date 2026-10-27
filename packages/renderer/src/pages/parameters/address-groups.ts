// Role: groups derived from the OSC address hierarchy (/a/b/c is in groups /a and /a/b), and parameter filtering.
import type { ParamTypeDto, ParameterDeclDto } from '@template/plugin-show/dto'

/** The whole tree: every parameter. */
export const ROOT_GROUP = ''

export interface GroupCrumb {
  path: string
  label: string
}

/** True if `address` is inside `group` (directly or in a subgroup). */
export function isInGroup(address: string, group: string): boolean {
  return group === ROOT_GROUP || address.startsWith(`${group}/`)
}

/** Direct subgroups of `group` that contain at least one of `addresses`, sorted. */
export function childGroups(addresses: readonly string[], group: string): string[] {
  const children = new Set<string>()
  for (const address of addresses) {
    if (!isInGroup(address, group)) continue
    const rest = address.slice(group.length + 1).split('/')
    // The last segment is the parameter itself, not a group.
    if (rest.length > 1) children.add(`${group}/${rest[0]}`)
  }
  return [...children].sort()
}

/** Every group that contains at least one of `addresses`, at any depth, sorted. */
export function allGroups(addresses: readonly string[]): string[] {
  const groups = new Set<string>()
  for (const address of addresses) {
    const segments = address.split('/').filter(Boolean)
    for (let depth = 1; depth < segments.length; depth++) groups.add(`/${segments.slice(0, depth).join('/')}`)
  }
  return [...groups].sort()
}

/** Breadcrumb from the root to `group`. */
export function groupTrail(group: string): GroupCrumb[] {
  const segments = group.split('/').filter(Boolean)
  return [
    { path: ROOT_GROUP, label: 'Tout' },
    ...segments.map((segment, index) => ({ path: `/${segments.slice(0, index + 1).join('/')}`, label: segment })),
  ]
}

/** Last segment of a group path, for display. */
export function groupLabel(group: string): string {
  return group.slice(group.lastIndexOf('/') + 1)
}

export interface AddressSegment {
  label: string
  /** Group opened by this segment; absent on the last one, which is the parameter itself. */
  group?: string
}

/** Segments of an address, each with the group it opens: /video/layer1/hue gives video → /video, layer1 → /video/layer1, hue. */
export function addressSegments(address: string): AddressSegment[] {
  const segments = address.split('/').filter(Boolean)
  return segments.map((label, index) =>
    index < segments.length - 1 ? { label, group: `/${segments.slice(0, index + 1).join('/')}` } : { label },
  )
}

export interface ParameterFilter {
  group: string
  /** Matched against address, description and keywords, case and accent insensitive. */
  text: string
  types: readonly ParamTypeDto[]
}

function fold(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export function matchesFilter(decl: ParameterDeclDto, filter: ParameterFilter): boolean {
  if (!isInGroup(decl.address, filter.group)) return false
  if (filter.types.length > 0 && !filter.types.includes(decl.type)) return false
  const words = fold(filter.text).split(/\s+/).filter(Boolean)
  const haystack = fold([decl.address, decl.description, ...decl.keywords].join(' '))
  return words.every((word) => haystack.includes(word))
}
