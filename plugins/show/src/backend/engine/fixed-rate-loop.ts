// FixedRateLoop: calls a function at a fixed rate, scheduling on absolute deadlines to avoid drift.
import type { StoppableManager } from '@template/sdk'

export class FixedRateLoop implements StoppableManager {
  private timer: ReturnType<typeof setTimeout> | undefined
  private nextDeadline = 0
  private periodMs: number

  /** `now` must be monotonic (performance.now). */
  constructor(
    rateHz: number,
    private readonly tick: () => void,
    private readonly now: () => number = () => performance.now(),
  ) {
    this.periodMs = 1000 / rateHz
  }

  setRate(rateHz: number): void {
    this.periodMs = 1000 / rateHz
  }

  start(): void {
    if (this.timer) return
    this.nextDeadline = this.now()
    this.schedule()
  }

  stop(): void {
    clearTimeout(this.timer)
    this.timer = undefined
  }

  private schedule(): void {
    this.nextDeadline += this.periodMs
    const now = this.now()
    // Late by more than a period (machine asleep, debugger): skip ticks rather than burst.
    if (this.nextDeadline < now - this.periodMs) this.nextDeadline = now
    this.timer = setTimeout(() => this.run(), Math.max(0, this.nextDeadline - now))
  }

  private run(): void {
    try {
      this.tick()
    } catch (error) {
      // A failing tick must not kill the engine: log and keep the pace.
      console.error('Engine tick failed:', error)
    }
    if (this.timer) this.schedule()
  }
}
