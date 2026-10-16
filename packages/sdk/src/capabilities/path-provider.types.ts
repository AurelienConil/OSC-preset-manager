// PathProvider capability: resolves a safe, writable location without knowing Electron.
// The concrete implementation is provided by the host (main/), never by a plugin.

export interface PathProvider {
  /** Resolves a relative sub-path to an absolute, writable path. */
  resolve(relativePath: string): string
}
