// RateLimiter: lets at most one value per interval through, and always delivers the latest one.
//
// The first value of a burst goes out immediately (no added latency); values
// arriving too fast are coalesced and the last one is sent at the next slot,
// so the final position of a fader is never lost.

export class RateLimiter<T> {
  private lastEmitMs = Number.NEGATIVE_INFINITY
  private pending: { value: T } | undefined
  private timer: ReturnType<typeof setTimeout> | undefined
  private readonly intervalMs: number

  /** `now` must be monotonic (performance.now). */
  constructor(
    maxRateHz: number,
    private readonly emit: (value: T) => void,
    private readonly now: () => number = () => performance.now(),
  ) {
    this.intervalMs = 1000 / maxRateHz
  }

  push(value: T): void {
    const elapsed = this.now() - this.lastEmitMs
    if (elapsed >= this.intervalMs && !this.timer) {
      this.fire(value)
      return
    }
    this.pending = { value }
    this.timer ??= setTimeout(() => this.flush(), Math.max(0, this.intervalMs - elapsed))
  }

  dispose(): void {
    clearTimeout(this.timer)
    this.timer = undefined
    this.pending = undefined
  }

  private flush(): void {
    this.timer = undefined
    const { pending } = this
    this.pending = undefined
    if (pending) this.fire(pending.value)
  }

  private fire(value: T): void {
    this.lastEmitMs = this.now()
    this.emit(value)
  }
}
