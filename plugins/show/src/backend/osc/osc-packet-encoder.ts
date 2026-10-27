// Encoder of OSC 1.0 messages (and bundles, for tests and future use): address + typed arguments.

export type OscTypedArgument =
  | { tag: 'i' | 'f'; value: number }
  | { tag: 's'; value: string }
  | { tag: 'T'; value: true }
  | { tag: 'F'; value: false }

/** Zero-terminated UTF-8 string, padded with zero bytes to a multiple of 4. */
function encodeString(value: string): Buffer {
  const length = Buffer.byteLength(value, 'utf-8') + 1
  const bytes = Buffer.alloc(Math.ceil(length / 4) * 4)
  bytes.write(value, 0, 'utf-8')
  return bytes
}

function encodeArgument(argument: OscTypedArgument): Buffer {
  switch (argument.tag) {
    case 'i': {
      const bytes = Buffer.alloc(4)
      // OSC int32: wrap rather than throw on out-of-range integers.
      bytes.writeInt32BE(Math.trunc(argument.value) | 0)
      return bytes
    }
    case 'f': {
      const bytes = Buffer.alloc(4)
      bytes.writeFloatBE(argument.value)
      return bytes
    }
    case 's':
      return encodeString(argument.value)
    case 'T':
    case 'F':
      return Buffer.alloc(0)
  }
}

export function encodeOscMessage(address: string, args: readonly OscTypedArgument[] = []): Buffer {
  const typeTags = `,${args.map((argument) => argument.tag).join('')}`
  return Buffer.concat([encodeString(address), encodeString(typeTags), ...args.map(encodeArgument)])
}

/** Bundle with an "immediately" time tag. */
export function encodeOscBundle(elements: readonly Buffer[]): Buffer {
  const immediately = Buffer.alloc(8)
  immediately.writeUInt32BE(1, 4)
  const sized = elements.flatMap((element) => {
    const size = Buffer.alloc(4)
    size.writeInt32BE(element.length)
    return [size, element]
  })
  return Buffer.concat([encodeString('#bundle'), immediately, ...sized])
}
