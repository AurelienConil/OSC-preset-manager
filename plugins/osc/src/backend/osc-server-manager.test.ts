// Unit tests of OscServerManager against a real UDP socket on localhost.
import { createSocket } from 'node:dgram'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OscServerManager } from './osc-server-manager'
import { encodeOscMessage } from './osc-packet.fixtures'

const TEST_PORT = 57_121

function sendPacket(packet: Buffer, port = TEST_PORT): Promise<void> {
  const sender = createSocket('udp4')
  return new Promise((resolve, reject) => {
    sender.send(packet, port, '127.0.0.1', (error) => {
      sender.close()
      if (error) reject(error)
      else resolve()
    })
  })
}

describe('OscServerManager', () => {
  let onMessage: ReturnType<typeof vi.fn>
  let onStatusChanged: ReturnType<typeof vi.fn>
  let manager: OscServerManager

  beforeEach(() => {
    onMessage = vi.fn()
    onStatusChanged = vi.fn()
    manager = new OscServerManager({ onMessage, onStatusChanged })
  })

  afterEach(async () => {
    await manager.stop()
  })

  it('is stopped until started', () => {
    expect(manager.getStatus()).toEqual({ running: false, port: null, error: null })
  })

  it('reports the status when started then stopped', async () => {
    await manager.start(TEST_PORT)
    expect(onStatusChanged).toHaveBeenLastCalledWith({ running: true, port: TEST_PORT, error: null })

    await manager.stop()
    expect(onStatusChanged).toHaveBeenLastCalledWith({ running: false, port: null, error: null })
  })

  it('delivers received messages with a timestamp', async () => {
    await manager.start(TEST_PORT)
    await sendPacket(encodeOscMessage('/weather/city', [['s', 'Lyon']]))

    await vi.waitFor(() => expect(onMessage).toHaveBeenCalledOnce())
    expect(onMessage).toHaveBeenCalledWith({
      address: '/weather/city',
      args: ['Lyon'],
      receivedAt: expect.any(String),
    })
  })

  it('drops a malformed packet and keeps listening', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await manager.start(TEST_PORT)
    await sendPacket(Buffer.from('garbage'))
    await sendPacket(encodeOscMessage('/still/alive'))

    await vi.waitFor(() => expect(onMessage).toHaveBeenCalledOnce())
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  it('rejects a port already in use, with an explicit error', async () => {
    const other = new OscServerManager({ onMessage: () => {}, onStatusChanged: () => {} })
    await other.start(TEST_PORT)
    try {
      await expect(manager.start(TEST_PORT)).rejects.toThrow(/Cannot listen on UDP port 57121/)
      expect(manager.getStatus().running).toBe(false)
    } finally {
      await other.stop()
    }
  })
})
