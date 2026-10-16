// Sequential reader over a raw OSC packet: the OSC 1.0 primitive fields, with bounds checks.
//
// Every read fails with an explicit error instead of reading past the end:
// packets come from the network, anyone on the LAN can send garbage.

/** OSC pads every string and blob with zero bytes to a multiple of 4. */
function alignToFourBytes(length: number): number {
  return Math.ceil(length / 4) * 4
}

export class OscPacketReader {
  private offset = 0

  constructor(private readonly packet: Buffer) {}

  isAtEnd(): boolean {
    return this.offset >= this.packet.length
  }

  /** Zero-terminated UTF-8 string, padded to 4 bytes. */
  readString(): string {
    const end = this.packet.indexOf(0, this.offset)
    if (end === -1) throw new Error('OSC: unterminated string')
    const value = this.packet.toString('utf-8', this.offset, end)
    this.offset += alignToFourBytes(end - this.offset + 1)
    return value
  }

  /** Big-endian signed 32-bit integer. */
  readInt32(): number {
    this.assertAvailable(4)
    const value = this.packet.readInt32BE(this.offset)
    this.offset += 4
    return value
  }

  /** Big-endian IEEE 754 32-bit float. */
  readFloat32(): number {
    this.assertAvailable(4)
    const value = this.packet.readFloatBE(this.offset)
    this.offset += 4
    return value
  }

  /** Raw slice of `length` bytes (a bundle element), without padding. */
  readBytes(length: number): Buffer {
    this.assertAvailable(length)
    const bytes = this.packet.subarray(this.offset, this.offset + length)
    this.offset += length
    return bytes
  }

  private assertAvailable(length: number): void {
    if (this.offset + length > this.packet.length) {
      throw new Error(`OSC: packet truncated (needs ${length} bytes at offset ${this.offset})`)
    }
  }
}
