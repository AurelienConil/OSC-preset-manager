// Unit tests of AppDataPathProvider: every resolved path must stay under the app data root.
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AppDataPathProvider } from './app-data-path-provider'

const ROOT = resolve('/tmp/app-data-root')

describe('AppDataPathProvider', () => {
  const provider = new AppDataPathProvider(ROOT)

  it('resolves a relative path under the root', () => {
    expect(provider.resolve('logs/today.txt')).toBe(join(ROOT, 'logs', 'today.txt'))
  })

  it('resolves an empty path to the root itself', () => {
    expect(provider.resolve('')).toBe(ROOT)
  })

  it('accepts ".." that stays inside the root', () => {
    expect(provider.resolve('logs/../cache')).toBe(join(ROOT, 'cache'))
  })

  it('rejects a path escaping the root', () => {
    expect(() => provider.resolve('../outside')).toThrow(/escapes the app data root/)
    expect(() => provider.resolve('logs/../../..')).toThrow(/escapes the app data root/)
  })

  it('rejects a sibling folder sharing the root prefix', () => {
    expect(() => provider.resolve('../app-data-root-evil/file')).toThrow(/escapes the app data root/)
  })
})
