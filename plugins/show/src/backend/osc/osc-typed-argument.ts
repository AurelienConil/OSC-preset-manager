// Turns a parameter value into the OSC argument its declared type is sent as.
import type { OscValueDto, ParamTypeDto } from '../../show.dto'
import type { OscTypedArgument } from './osc-packet-encoder'

export function typedArgument(type: ParamTypeDto, value: OscValueDto): OscTypedArgument {
  switch (type) {
    case 'float':
      return { tag: 'f', value: Number(value) }
    case 'int':
      return { tag: 'i', value: Math.round(Number(value)) }
    case 'text':
      return { tag: 's', value: String(value) }
    case 'bool':
      return value === true ? { tag: 'T', value: true } : { tag: 'F', value: false }
  }
}
