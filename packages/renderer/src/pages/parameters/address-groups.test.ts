// Unit tests of the address group helpers and the parameter filter.
import { describe, expect, it } from 'vitest'
import type { ParameterDeclDto } from '@template/plugin-show/dto'
import { addressSegments, allGroups, childGroups, groupTrail, isInGroup, matchesFilter } from './address-groups'

const addresses = ['/toto/param1', '/toto/titi/tata', '/video/opacity', '/solo']

describe('address groups', () => {
  it('finds the direct subgroups of a group', () => {
    expect(childGroups(addresses, '')).toEqual(['/toto', '/video'])
    expect(childGroups(addresses, '/toto')).toEqual(['/toto/titi'])
    expect(childGroups(addresses, '/toto/titi')).toEqual([])
  })

  it('lists every group at any depth', () => {
    expect(allGroups(addresses)).toEqual(['/toto', '/toto/titi', '/video'])
  })

  it('gives each segment of an address the group it opens, except the parameter', () => {
    expect(addressSegments('/video/layer1/hue')).toEqual([
      { label: 'video', group: '/video' },
      { label: 'layer1', group: '/video/layer1' },
      { label: 'hue' },
    ])
    expect(addressSegments('/solo')).toEqual([{ label: 'solo' }])
  })

  it('tells whether an address belongs to a group, subgroups included', () => {
    expect(isInGroup('/toto/titi/tata', '/toto')).toBe(true)
    expect(isInGroup('/totoro/x', '/toto')).toBe(false)
    expect(isInGroup('/solo', '')).toBe(true)
  })

  it('builds the breadcrumb of a group', () => {
    expect(groupTrail('/toto/titi')).toEqual([
      { path: '', label: 'Tout' },
      { path: '/toto', label: 'toto' },
      { path: '/toto/titi', label: 'titi' },
    ])
  })
})

describe('matchesFilter', () => {
  const decl: ParameterDeclDto = {
    address: '/video/layer1/hue',
    type: 'float',
    min: 0,
    max: 360,
    description: 'Teinte du calque',
    keywords: ['couleur'],
  }
  const all = { group: '', text: '', types: [] }

  it('matches every word against address, description and keywords, ignoring accents', () => {
    expect(matchesFilter(decl, { ...all, text: 'layer1 COULEUR' })).toBe(true)
    expect(matchesFilter(decl, { ...all, text: 'teinte' })).toBe(true)
    expect(matchesFilter(decl, { ...all, text: 'audio' })).toBe(false)
  })

  it('filters by group and type', () => {
    expect(matchesFilter(decl, { ...all, group: '/video' })).toBe(true)
    expect(matchesFilter(decl, { ...all, group: '/audio' })).toBe(false)
    expect(matchesFilter(decl, { ...all, types: ['bool'] })).toBe(false)
  })
})
