// ShowStore: reads and writes show files under the app data folder (shows/<name>.json).
//
// A show file is third-party data (hand-edited, versioned in git, older
// version of the app): it is validated explicitly on load. Writes are atomic
// (temp file + rename) and debounced, so dragging a slider does not hammer the
// disk and a crash never leaves a half-written show.
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { PathProvider } from '@template/sdk'
import { ShowDto } from '../../show.dto'

const SHOWS_FOLDER = 'shows'
const LAST_SHOW_FILE = 'last-show.json'
const SHOW_EXTENSION = '.json'

function isMissingFile(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'ENOENT'
}

async function writeAtomically(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.tmp`
  await writeFile(temporary, content, 'utf-8')
  await rename(temporary, path)
}

export class ShowStore {
  private pending: { name: string; show: ShowDto } | undefined
  private timer: ReturnType<typeof setTimeout> | undefined
  /** Tail of the write queue: writes never overlap, and flush() waits for the one in flight. */
  private writing: Promise<void> = Promise.resolve()

  constructor(
    private readonly paths: PathProvider,
    private readonly debounceMs = 500,
  ) {}

  async list(): Promise<string[]> {
    try {
      const files = await readdir(this.paths.resolve(SHOWS_FOLDER))
      return files
        .filter((file) => file.endsWith(SHOW_EXTENSION))
        .map((file) => file.slice(0, -SHOW_EXTENSION.length))
        .sort()
    } catch (error) {
      if (isMissingFile(error)) return []
      throw error
    }
  }

  /** undefined if the show does not exist; throws an explicit error if it is unreadable or invalid. */
  async load(name: string): Promise<ShowDto | undefined> {
    let text: string
    try {
      text = await readFile(this.showPath(name), 'utf-8')
    } catch (error) {
      if (isMissingFile(error)) return undefined
      throw error
    }
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch (error) {
      throw new Error(`Show "${name}" : JSON invalide (${(error as Error).message})`)
    }
    const parsed = ShowDto.safeParse(json)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      throw new Error(`Show "${name}" invalide : ${issue?.path.join('.')} — ${issue?.message}`)
    }
    return parsed.data
  }

  /** Writes now (after any write in flight), cancelling a pending debounced save of the same show. */
  save(name: string, show: ShowDto): Promise<void> {
    if (this.pending?.name === name) this.cancelPending()
    const content = `${JSON.stringify(show, null, 2)}\n`
    const write = this.writing.then(() => writeAtomically(this.showPath(name), content))
    this.writing = write.catch(() => {})
    return write
  }

  /** Debounced save; the latest content wins. */
  scheduleSave(name: string, show: ShowDto): void {
    if (this.pending && this.pending.name !== name) void this.flush()
    this.pending = { name, show }
    clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.flush(), this.debounceMs)
  }

  async flush(): Promise<void> {
    const { pending } = this
    this.cancelPending()
    if (!pending) return this.writing
    try {
      await this.save(pending.name, pending.show)
    } catch (error) {
      console.error(`Show "${pending.name}": save failed:`, error)
    }
  }

  async readLastShowName(): Promise<string | undefined> {
    try {
      const json: unknown = JSON.parse(await readFile(this.paths.resolve(LAST_SHOW_FILE), 'utf-8'))
      const name = (json as { name?: unknown } | null)?.name
      return typeof name === 'string' && /^[\w-]{1,64}$/.test(name) ? name : undefined
    } catch {
      // Missing or corrupt: only a convenience, fall back to the default show.
      return undefined
    }
  }

  async writeLastShowName(name: string): Promise<void> {
    await writeAtomically(this.paths.resolve(LAST_SHOW_FILE), JSON.stringify({ name }))
  }

  private cancelPending(): void {
    clearTimeout(this.timer)
    this.timer = undefined
    this.pending = undefined
  }

  private showPath(name: string): string {
    return this.paths.resolve(`${SHOWS_FOLDER}/${name}${SHOW_EXTENSION}`)
  }
}
