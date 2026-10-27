// Unit tests of OscUdpIo against real UDP sockets on localhost.
import { createSocket, type Socket } from 'node:dgram'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OscUdpIo } from './osc-udp-io'
import { decodeOscPacket } from './osc-packet-decoder'
import { encodeOscMessage } from './osc-packet-encoder'

const INPUT_PORT = 57_131
const OUTPUT_PORT = 57_132

function sendPacket(packet: Buffer, port: number): Promise<void> {
  const sender = createSocket('udp4')
  return new Promise((resolve, reject) => {
    sender.send(packet, port, '127.0.0.1', (error) => {
      sender.close()
      if (error) reject(error)
      else resolve()
    })
  })
}

describe('OscUdpIo', () => {
  let onMessage: ReturnType<typeof vi.fn>
  let onStatusChanged: ReturnType<typeof vi.fn>
  let io: OscUdpIo

  beforeEach(() => {
    onMessage = vi.fn()
    onStatusChanged = vi.fn()
    io = new OscUdpIo({ onMessage, onStatusChanged })
  })

  afterEach(async () => {
    await io.stop()
  })

  it('listens on the input port and delivers decoded messages', async () => {
    await io.configure(INPUT_PORT, { host: '127.0.0.1', port: OUTPUT_PORT })
    expect(io.status()).toEqual({
      listeningPort: INPUT_PORT,
      output: { host: '127.0.0.1', port: OUTPUT_PORT },
      error: null,
    })

    await sendPacket(encodeOscMessage('/fader1', [{ tag: 'f', value: 0.5 }]), INPUT_PORT)
    await vi.waitFor(() => expect(onMessage).toHaveBeenCalledWith('/fader1', [0.5]))
  })

  it('sends encoded messages to the output target', async () => {
    const receiver: Socket = createSocket('udp4')
    const received = new Promise<Buffer>((resolve) => receiver.once('message', resolve))
    await new Promise<void>((resolve) => receiver.bind(OUTPUT_PORT, resolve))
    try {
      await io.configure(INPUT_PORT, { host: '127.0.0.1', port: OUTPUT_PORT })
      io.send('/video/opacity', [{ tag: 'f', value: 0.75 }])
      expect(decodeOscPacket(await received)).toEqual([{ address: '/video/opacity', args: [0.75] }])
    } finally {
      receiver.close()
    }
  })

  it('reports a busy input port in the status instead of rejecting', async () => {
    const other = new OscUdpIo({ onMessage: () => {}, onStatusChanged: () => {} })
    await other.configure(INPUT_PORT, { host: '127.0.0.1', port: OUTPUT_PORT })
    try {
      await io.configure(INPUT_PORT, { host: '127.0.0.1', port: OUTPUT_PORT })
      expect(io.status().listeningPort).toBeNull()
      expect(io.status().error).toMatch(/57131/)
    } finally {
      await other.stop()
    }
  })
})
