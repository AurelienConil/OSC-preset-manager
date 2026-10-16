// OscServerManager: owns the UDP socket receiving OSC packets and reports messages and status changes.
//
// EXAMPLE PLUGIN — a Manager holds the business logic of a plugin. It knows
// nothing about the SDK, the transport or Electron: it receives callbacks in
// its constructor and calls them. That is what makes it testable with plain
// Node (see osc-server-manager.test.ts) and reusable outside this app.
import { createSocket, type Socket } from 'node:dgram'
import type { StoppableManager } from '@template/sdk'
import type { OscMessageDto, OscStatusDto } from '../osc.dto'
import { decodeOscPacket } from './osc-packet-decoder'

export interface OscServerListeners {
  onMessage: (message: OscMessageDto) => void
  onStatusChanged: (status: OscStatusDto) => void
}

function bindSocket(socket: Socket, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once('error', reject)
    // No address: listen on every interface, so devices on the LAN can send.
    socket.bind(port, () => {
      socket.off('error', reject)
      resolve()
    })
  })
}

function closeSocket(socket: Socket): Promise<void> {
  return new Promise((resolve) => socket.close(() => resolve()))
}

// Implements StoppableManager because it owns a resource (the socket): the
// host awaits stop() before the app quits, so the port is always released.
export class OscServerManager implements StoppableManager {
  private socket: Socket | undefined
  private port: number | null = null
  private lastError: string | null = null

  constructor(private readonly listeners: OscServerListeners) {}

  getStatus(): OscStatusDto {
    return { running: this.socket !== undefined, port: this.port, error: this.lastError }
  }

  /** Restarts on `port` if already running. Rejects if the port cannot be bound (e.g. already in use). */
  async start(port: number): Promise<void> {
    await this.stop()
    const socket = createSocket('udp4')
    try {
      await bindSocket(socket, port)
    } catch (error) {
      await closeSocket(socket)
      throw new Error(`Cannot listen on UDP port ${port}: ${(error as Error).message}`)
    }
    socket.on('message', (packet) => this.receive(packet))
    socket.on('error', (error) => void this.fail(error))
    this.socket = socket
    this.port = port
    this.lastError = null
    this.listeners.onStatusChanged(this.getStatus())
  }

  async stop(): Promise<void> {
    const { socket } = this
    if (!socket) return
    this.socket = undefined
    this.port = null
    await closeSocket(socket)
    this.listeners.onStatusChanged(this.getStatus())
  }

  private receive(packet: Buffer): void {
    let messages
    try {
      messages = decodeOscPacket(packet)
    } catch (error) {
      // One bad packet from the network must not stop the server: report and drop it.
      console.warn(`OSC: dropped malformed packet (${(error as Error).message})`)
      return
    }
    const receivedAt = new Date().toISOString()
    for (const message of messages) this.listeners.onMessage({ ...message, receivedAt })
  }

  /** Set before stop() so the single status push it emits carries the error. */
  private async fail(error: Error): Promise<void> {
    this.lastError = error.message
    await this.stop()
  }
}
