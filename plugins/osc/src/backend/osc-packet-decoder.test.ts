// Unit tests of the OSC packet decoder: messages, bundles and malformed packets.
import { describe, expect, it } from 'vitest'
import { decodeOscPacket } from './osc-packet-decoder'
import { encodeOscBundle, encodeOscMessage } from './osc-packet.fixtures'

describe('decodeOscPacket', () => {
  it('decodes a message with int, float, string and boolean arguments', () => {
    const packet = encodeOscMessage('/mixer/fader', [['i', 3], ['f', 0.5], ['s', 'Lyon'], ['T'], ['F']])
    expect(decodeOscPacket(packet)).toEqual([{ address: '/mixer/fader', args: [3, 0.5, 'Lyon', true, false] }])
  })

  it('decodes a message without arguments', () => {
    expect(decodeOscPacket(encodeOscMessage('/ping'))).toEqual([{ address: '/ping', args: [] }])
  })

  it('decodes every message of a bundle, in order', () => {
    const packet = encodeOscBundle([encodeOscMessage('/a', [['i', 1]]), encodeOscMessage('/b', [['s', 'x']])])
    expect(decodeOscPacket(packet)).toEqual([
      { address: '/a', args: [1] },
      { address: '/b', args: ['x'] },
    ])
  })

  it('rejects an address that does not start with a slash', () => {
    expect(() => decodeOscPacket(encodeOscMessage('nope'))).toThrow(/invalid address/)
  })

  it('rejects an unsupported argument type', () => {
    // 'b' (blob) is valid OSC but not supported by this decoder.
    const packet = Buffer.from('/a\0\0,b\0\0', 'latin1')
    expect(() => decodeOscPacket(packet)).toThrow(/unsupported argument type "b"/)
  })

  it('rejects a truncated packet', () => {
    const packet = encodeOscMessage('/a', [['i', 1]])
    expect(() => decodeOscPacket(packet.subarray(0, packet.length - 2))).toThrow(/truncated/)
  })
})
