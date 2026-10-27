// Abstract phase source of the engine: the internal clock today, Ableton Link tomorrow.
import type { TransportDto } from '../../show.dto'

export interface TransportClock {
  state(): TransportDto
  /** Restarts from beat 0. No-op if already playing. */
  play(): void
  /** Freezes the beat position. */
  stop(): void
  setBpm(bpm: number): void
  /** Beats elapsed since play, frozen while stopped. */
  beats(): number
}
