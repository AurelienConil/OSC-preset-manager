// OscUdpIo: owns the two UDP sockets of the show, one listening for OSC input, one sending OSC output.
import { createSocket, type Socket } from 'node:dgram'
import type { IoStatusDto, OutputTargetDto } from '../../show.dto'
import type { OscIo, OscIoListeners } from './osc-io.types'
import { decodeOscPacket } from './osc-packet-decoder'
import { encodeOscMessage, type OscTypedArgument } from './osc-packet-encoder'

function bindSocket(socket: Socket, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once('error', reject)
    // No address: listen on every interface, so controllers on the LAN can send.
    socket.bind(port, () => {
      socket.off('error', reject)
      resolve()
    })
  })
}

function closeSocket(socket: Socket): Promise<void> {
  return new Promise((resolve) => socket.close(() => resolve()))
}

export class OscUdpIo implements OscIo {
  private input: Socket | undefined
  private listeningPort: number | null = null
  private output: Socket | undefined
  private target: OutputTargetDto = { host: '127.0.0.1', port: 9001 }
  private lastError: string | null = null

  constructor(private readonly listeners: OscIoListeners) {}

  status(): IoStatusDto {
    return { listeningPort: this.listeningPort, output: { ...this.target }, error: this.lastError }
  }

  async configure(inputPort: number, output: OutputTargetDto): Promise<void> {
    this.target = { ...output }
    this.output ??= this.createOutputSocket()
    if (this.input && this.listeningPort === inputPort) {
      this.listeners.onStatusChanged(this.status())
      return
    }
    await this.closeInput()
    this.lastError = null
    const socket = createSocket('udp4')
    try {
      await bindSocket(socket, inputPort)
      socket.on('message', (packet) => this.receive(packet))
      socket.on('error', (error) => this.report(`Entrée OSC : ${error.message}`))
      this.input = socket
      this.listeningPort = inputPort
    } catch (error) {
      await closeSocket(socket)
      this.lastError = `Impossible d'écouter le port UDP ${inputPort} : ${(error as Error).message}`
    }
    this.listeners.onStatusChanged(this.status())
  }

  send(address: string, args: readonly OscTypedArgument[]): void {
    const { output, target } = this
    if (!output) return
    output.send(encodeOscMessage(address, args), target.port, target.host, (error) => {
      if (error) this.report(`Sortie OSC vers ${target.host}:${target.port} : ${error.message}`)
    })
  }

  async stop(): Promise<void> {
    await this.closeInput()
    const { output } = this
    this.output = undefined
    if (output) await closeSocket(output)
  }

  private createOutputSocket(): Socket {
    const socket = createSocket('udp4')
    socket.on('error', (error) => this.report(`Sortie OSC : ${error.message}`))
    return socket
  }

  private async closeInput(): Promise<void> {
    const { input } = this
    if (!input) return
    this.input = undefined
    this.listeningPort = null
    await closeSocket(input)
  }

  private receive(packet: Buffer): void {
    let messages
    try {
      messages = decodeOscPacket(packet)
    } catch (error) {
      // One bad packet from the network must not stop the input: report and drop it.
      console.warn(`OSC: dropped malformed packet (${(error as Error).message})`)
      return
    }
    for (const { address, args } of messages) this.listeners.onMessage(address, args)
  }

  /** Pushes a status only when the error changes: a failing send at 60 Hz must not flood the GUI. */
  private report(message: string): void {
    if (message === this.lastError) return
    this.lastError = message
    this.listeners.onStatusChanged(this.status())
  }
}
