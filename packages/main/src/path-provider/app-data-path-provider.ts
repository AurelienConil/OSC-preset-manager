// Project-specific concrete PathProvider implementation: resolves every
// relative path under Electron's per-user app data folder, and rejects any
// attempt to escape it (e.g. via "..").
import { join, resolve, sep } from 'node:path'
import type { PathProvider } from '@template/sdk'

export class AppDataPathProvider implements PathProvider {
  private readonly root: string

  constructor(root: string) {
    this.root = resolve(root)
  }

  resolve(relativePath: string): string {
    const resolved = resolve(join(this.root, relativePath))
    if (resolved !== this.root && !resolved.startsWith(this.root + sep)) {
      throw new Error(`Path escapes the app data root: ${relativePath}`)
    }
    return resolved
  }
}
