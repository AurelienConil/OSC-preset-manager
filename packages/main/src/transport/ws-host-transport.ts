// Development HostTransport: local WebSocket server, JSON messages.
import { WebSocketServer, type RawData, type WebSocket } from 'ws'
import type { PushMessage } from '@template/sdk'
import type { HostMessageListener, HostTransport } from './host-transport.types'

export class WsHostTransport implements HostTransport {
  private readonly clients = new Set<WebSocket>()
  private readonly listeners: HostMessageListener[] = []

  constructor(port: number) {
    const server = new WebSocketServer({ port })
    server.on('connection', (socket) => this.accept(socket))
  }

  onMessage(listener: HostMessageListener): void {
    this.listeners.push(listener)
  }

  broadcast(message: PushMessage): void {
    const data = JSON.stringify(message)
    for (const client of this.clients) client.send(data)
  }

  private accept(socket: WebSocket): void {
    this.clients.add(socket)
    socket.on('close', () => this.clients.delete(socket))
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
      listener(raw, (message) => socket.send(JSON.stringify(message)))
    }
  }
}
