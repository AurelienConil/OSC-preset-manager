// What the show engine needs from the OSC network layer (real UDP in the app, a fake in tests).
import type { StoppableManager } from '@template/sdk'
import type { IoStatusDto, OscValueDto, OutputTargetDto } from '../../show.dto'
import type { OscTypedArgument } from './osc-packet-encoder'

export interface OscIoListeners {
  onMessage: (address: string, args: OscValueDto[]) => void
  onStatusChanged: (status: IoStatusDto) => void
}

export interface OscIo extends StoppableManager {
  /** (Re)binds the input port and retargets the output. Never rejects: failures land in status().error. */
  configure(inputPort: number, output: OutputTargetDto): Promise<void>
  /** Fire and forget: a send error lands in status().error. */
  send(address: string, args: readonly OscTypedArgument[]): void
  status(): IoStatusDto
}
