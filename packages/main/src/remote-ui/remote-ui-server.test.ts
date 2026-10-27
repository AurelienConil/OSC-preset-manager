// Tests of RemoteUiServer against a real temporary folder and a local port.
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { Agent, get } from 'node:http'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { RemoteUiServer } from './remote-ui-server'

const PORT = 57_141

describe('RemoteUiServer', () => {
  let root: string
  let server: RemoteUiServer

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'remote-ui-'))
    await writeFile(join(root, 'index.html'), '<html></html>')
    await writeFile(join(root, 'app.js'), 'console.log(1)')
    server = new RemoteUiServer(root)
    server.listen(PORT)
  })

  afterEach(async () => {
    await server.close()
    await rm(root, { recursive: true, force: true })
  })

  it('serves index.html at the root and assets with their type', async () => {
    const index = await fetch(`http://127.0.0.1:${PORT}/`)
    expect(index.status).toBe(200)
    expect(index.headers.get('content-type')).toMatch(/text\/html/)
    const script = await fetch(`http://127.0.0.1:${PORT}/app.js`)
    expect(script.headers.get('content-type')).toMatch(/javascript/)
  })

  it('closes even while a keep-alive connection is still open (quit must not hang)', async () => {
    const agent = new Agent({ keepAlive: true })
    await new Promise<void>((resolve, reject) => {
      get({ port: PORT, agent, path: '/' }, (response) => {
        response.resume()
        response.on('end', () => resolve())
      }).on('error', reject)
    })
    await expect(server.close()).resolves.toBeUndefined()
    agent.destroy()
  })

  it('answers 404 for a missing file and never escapes the root', async () => {
    expect((await fetch(`http://127.0.0.1:${PORT}/missing.js`)).status).toBe(404)
    // A real file next to the root, reached with an encoded "..": must never be served.
    await writeFile(join(root, '..', `${basename(root)}-secret.txt`), 'secret')
    try {
      const escape = await fetch(`http://127.0.0.1:${PORT}/..%2F${basename(root)}-secret.txt`)
      expect([403, 404]).toContain(escape.status)
    } finally {
      await rm(join(root, '..', `${basename(root)}-secret.txt`), { force: true })
    }
  })
})
