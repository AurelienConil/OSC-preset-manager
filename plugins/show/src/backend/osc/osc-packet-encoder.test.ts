// Unit tests of the OSC encoder, checked byte for byte and round-tripped through the decoder.
import { describe, expect, it } from 'vitest'
import { encodeOscMessage } from './osc-packet-encoder'
import { decodeOscPacket } from './osc-packet-decoder'

describe('encodeOscMessage', () => {
  it('pads the address and type tags to 4 bytes', () => {
    const packet = encodeOscMessage('/abc', [{ tag: 'i', value: 1 }])
    expect([...packet]).toEqual([
      ...Buffer.from('/abc\0\0\0\0'), // "/abc" + terminator, padded to 8
      ...Buffer.from(',i\0\0'),
      0, 0, 0, 1,
    ])
  })

  it('round-trips every supported type through the decoder', () => {
    const packet = encodeOscMessage('/x/y', [
      { tag: 'i', value: -7 },
      { tag: 'f', value: 0.25 },
      { tag: 's', value: 'héllo' },
      { tag: 'T', value: true },
      { tag: 'F', value: false },
    ])
    expect(decodeOscPacket(packet)).toEqual([{ address: '/x/y', args: [-7, 0.25, 'héllo', true, false] }])
  })
})
