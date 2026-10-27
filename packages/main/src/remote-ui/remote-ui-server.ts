// Static HTTP server of the built GUI, so a phone or tablet on the LAN can open it in a browser.
// Production only: in development the Vite dev server already serves the GUI on the LAN.
import { createServer, type Server } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
}

export class RemoteUiServer {
  private readonly root: string
  private readonly server: Server

  constructor(root: string) {
    this.root = resolve(root)
    this.server = createServer((request, response) => {
      void this.serve(request.url ?? '/').then(({ status, type, body }) => {
        response.writeHead(status, { 'Content-Type': type })
        response.end(body)
      })
    })
    this.server.on('error', (error) => console.error('Remote GUI server:', error))
  }

  listen(port: number): void {
    // No host: every interface, so the LAN can reach it.
    this.server.listen(port)
  }

  close(): Promise<void> {
    // server.close() waits for every open connection: a phone's keep-alive socket would block the quit.
    return new Promise((resolve) => {
      this.server.close(() => resolve())
      this.server.closeAllConnections()
    })
  }

  private async serve(url: string): Promise<{ status: number; type: string; body: Buffer | string }> {
    let pathname: string
    try {
      pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname)
    } catch {
      return { status: 400, type: 'text/plain', body: 'Bad request' }
    }
    const relative = pathname === '/' ? 'index.html' : normalize(pathname).replace(/^[/\\]+/, '')
    const file = resolve(join(this.root, relative))
    // Refuse anything outside the GUI folder ("..", absolute paths).
    if (!file.startsWith(this.root + sep)) return { status: 403, type: 'text/plain', body: 'Forbidden' }
    try {
      const type = CONTENT_TYPES[extname(file)] ?? 'application/octet-stream'
      return { status: 200, type, body: await readFile(file) }
    } catch {
      return { status: 404, type: 'text/plain', body: 'Not found' }
    }
  }
}
