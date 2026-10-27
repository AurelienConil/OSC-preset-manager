// Unit tests of ShowStore against a real temporary folder.
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PathProvider } from '@template/sdk'
import { createDefaultShow } from './show-defaults'
import { ShowStore } from './show-store'

describe('ShowStore', () => {
  let root: string
  let paths: PathProvider
  let store: ShowStore

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'show-store-'))
    paths = { resolve: (relative) => join(root, relative) }
    store = new ShowStore(paths, 10)
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('returns undefined for a missing show and lists nothing', async () => {
    expect(await store.load('nope')).toBeUndefined()
    expect(await store.list()).toEqual([])
  })

  it('saves, lists and loads a show', async () => {
    const show = createDefaultShow(() => 'zero')
    await store.save('concert', show)
    expect(await store.list()).toEqual(['concert'])
    expect(await store.load('concert')).toEqual(show)
  })

  it('debounces saves and keeps the latest content', async () => {
    const show = createDefaultShow(() => 'zero')
    store.scheduleSave('concert', show)
    store.scheduleSave('concert', { ...show, presets: [{ ...show.presets[0]!, name: 'Renamed' }] })
    expect(await store.load('concert')).toBeUndefined()
    await store.flush()
    expect((await store.load('concert'))?.presets[0]?.name).toBe('Renamed')
  })

  it('rejects an invalid show file with an explicit error', async () => {
    await mkdir(join(root, 'shows'))
    await writeFile(join(root, 'shows/broken.json'), '{"version": 1}')
    await expect(store.load('broken')).rejects.toThrow(/Show "broken" invalide/)
    await writeFile(join(root, 'shows/garbage.json'), 'not json')
    await expect(store.load('garbage')).rejects.toThrow(/JSON invalide/)
  })

  it('remembers the last opened show', async () => {
    expect(await store.readLastShowName()).toBeUndefined()
    await store.writeLastShowName('concert')
    expect(await store.readLastShowName()).toBe('concert')
  })
})
