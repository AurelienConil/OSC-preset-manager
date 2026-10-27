// HostTransport over a WebSocket server, JSON messages. Used in development AND production:
// several GUI clients (the Electron window, a phone on the LAN) can be connected at once.
import { WebSocketServer, type RawData, type WebSocket } from 'ws'
import type { PushMessage } from '@template/sdk'
import type { HostMessageListener, HostTransport } from './host-transport.types'

/** A client with more than this queued is too slow: its pushes are dropped instead of piling up. */
const MAX_BUFFERED_BYTES = 1024 * 1024

export class WsHostTransport implements HostTransport {
  private readonly server: WebSocketServer
  private readonly clients = new Set<WebSocket>()
  private readonly listeners: HostMessageListener[] = []

  constructor(port: number) {
    // No host: every interface, so the LAN can reach it.
    this.server = new WebSocketServer({ port })
    this.server.on('connection', (socket) => this.accept(socket))
    this.server.on('error', (error) => console.error(`WebSocket server (port ${port}):`, error))
  }

  onMessage(listener: HostMessageListener): void {
    this.listeners.push(listener)
  }

  broadcast(message: PushMessage): void {
    const data = JSON.stringify(message)
    for (const client of this.clients) {
      // A slow client (phone on a weak Wi-Fi) must never delay the others nor fill main's memory.
      if (client.readyState === client.OPEN && client.bufferedAmount < MAX_BUFFERED_BYTES) client.send(data)
    }
  }

  close(): Promise<void> {
    for (const client of this.clients) client.terminate()
    return new Promise((resolve) => this.server.close(() => resolve()))
  }

  private accept(socket: WebSocket): void {
    this.clients.add(socket)
    socket.on('close', () => this.clients.delete(socket))
    socket.on('error', (error) => console.error('WebSocket client:', error))
    socket.on('message', (data) => this.receive(socket, data))
  }

  private receive(socket: WebSocket, data: RawData): void {
    let raw: unknown
    try {
      raw = JSON.parse(data.toString())
    } catch (error) {
      console.error('Rejected non-JSON WebSocket message:', error)
      return
    }
    for (const listener of this.listeners) {
      listener(raw, (message) => {
        if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message))
      })
    }
  }
}
