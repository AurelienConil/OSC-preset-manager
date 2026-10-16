// Test-only OSC encoder building raw packets for the decoder and server tests (never bundled).

export type OscTestArgument = ['i', number] | ['f', number] | ['s', string] | ['T'] | ['F']

function encodeString(value: string): Buffer {
  const bytes = Buffer.from(`${value}\0`, 'utf-8')
  return Buffer.concat([bytes, Buffer.alloc((4 - (bytes.length % 4)) % 4)])
}

function encodeNumber(write: 'writeInt32BE' | 'writeFloatBE', value: number): Buffer {
  const bytes = Buffer.alloc(4)
  bytes[write](value)
  return bytes
}

function encodeArgument(argument: OscTestArgument): Buffer {
  switch (argument[0]) {
    case 'i':
      return encodeNumber('writeInt32BE', argument[1])
    case 'f':
      return encodeNumber('writeFloatBE', argument[1])
    case 's':
      return encodeString(argument[1])
    default:
      return Buffer.alloc(0)
  }
}

export function encodeOscMessage(address: string, args: OscTestArgument[] = []): Buffer {
  const typeTags = `,${args.map(([tag]) => tag).join('')}`
  return Buffer.concat([encodeString(address), encodeString(typeTags), ...args.map(encodeArgument)])
}

export function encodeOscBundle(elements: Buffer[]): Buffer {
  const sized = elements.map((element) => Buffer.concat([encodeNumber('writeInt32BE', element.length), element]))
  return Buffer.concat([encodeString('#bundle'), Buffer.alloc(8), ...sized])
}
