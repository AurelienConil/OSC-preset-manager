// InternalClock: free-running TransportClock driven by a monotonic time source.
import { DEFAULT_BPM, type TransportDto } from '../../show.dto'
import type { TransportClock } from './transport-clock.types'

const MS_PER_MINUTE = 60_000

export class InternalClock implements TransportClock {
  private playing = false
  private bpm = DEFAULT_BPM
  /** Beat position and time of the last tempo or play change: beats() extrapolates from them. */
  private anchorBeats = 0
  private anchorMs = 0

  /** `now` must be monotonic (performance.now), never wall-clock time. */
  constructor(private readonly now: () => number = () => performance.now()) {}

  state(): TransportDto {
    return { playing: this.playing, bpm: this.bpm }
  }

  play(): void {
    if (this.playing) return
    this.anchorBeats = 0
    this.anchorMs = this.now()
    this.playing = true
  }

  stop(): void {
    this.anchorBeats = this.beats()
    this.playing = false
  }

  setBpm(bpm: number): void {
    this.rebase()
    this.bpm = bpm
  }

  beats(): number {
    if (!this.playing) return this.anchorBeats
    return this.anchorBeats + ((this.now() - this.anchorMs) * this.bpm) / MS_PER_MINUTE
  }

  /** Keeps the beat position continuous across a tempo change. */
  private rebase(): void {
    this.anchorBeats = this.beats()
    this.anchorMs = this.now()
  }
}
