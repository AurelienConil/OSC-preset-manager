// Decoder of OSC 1.0 packets (single messages and bundles) into address + arguments.
//
// Hand-written (~60 lines) rather than an npm dependency: no runtime library
// to bundle. Supported argument types: i, f, d, s, T, F.
// Bundle time tags are ignored: bundled messages are delivered immediately.
import type { OscValueDto } from '../../show.dto'
import { OscPacketReader } from './osc-packet-reader'

export interface DecodedOscMessage {
  address: string
  args: OscValueDto[]
}

const BUNDLE_MARKER = '#bundle'
const TIME_TAG_BYTES = 8

/** Returns every message of the packet (one, or several for a bundle). Throws on a malformed packet. */
export function decodeOscPacket(packet: Buffer): DecodedOscMessage[] {
  const reader = new OscPacketReader(packet)
  const head = reader.readString()
  return head === BUNDLE_MARKER ? decodeBundleElements(reader) : [decodeMessage(head, reader)]
}

function decodeBundleElements(reader: OscPacketReader): DecodedOscMessage[] {
  reader.readBytes(TIME_TAG_BYTES)
  const messages: DecodedOscMessage[] = []
  while (!reader.isAtEnd()) {
    const elementSize = reader.readInt32()
    if (elementSize <= 0) throw new Error(`OSC: invalid bundle element size ${elementSize}`)
    // A bundle element is itself a full packet (message or nested bundle).
    messages.push(...decodeOscPacket(reader.readBytes(elementSize)))
  }
  return messages
}

function decodeMessage(address: string, reader: OscPacketReader): DecodedOscMessage {
  if (!address.startsWith('/')) throw new Error(`OSC: invalid address "${address}"`)
  // Very old OSC senders omit the type tag string: a message without arguments.
  if (reader.isAtEnd()) return { address, args: [] }
  const typeTags = reader.readString()
  if (!typeTags.startsWith(',')) throw new Error(`OSC: invalid type tag string "${typeTags}"`)
  const args = [...typeTags.slice(1)].map((tag) => readArgument(tag, reader))
  return { address, args }
}

function readArgument(tag: string, reader: OscPacketReader): OscValueDto {
  switch (tag) {
    case 'i':
      return reader.readInt32()
    case 'f':
      return reader.readFloat32()
    case 'd':
      return reader.readFloat64()
    case 's':
      return reader.readString()
    case 'T':
      return true
    case 'F':
      return false
    default:
      throw new Error(`OSC: unsupported argument type "${tag}"`)
  }
}
