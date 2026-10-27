// Unit tests of RateLimiter with fake timers.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RateLimiter } from './rate-limiter'

describe('RateLimiter', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('sends the first value immediately', () => {
    const emit = vi.fn()
    new RateLimiter(10, emit, () => Date.now()).push(1)
    expect(emit).toHaveBeenCalledWith(1)
  })

  it('coalesces a burst and delivers the latest value at the next slot', () => {
    const emit = vi.fn()
    const limiter = new RateLimiter(10, emit, () => Date.now())
    limiter.push(1)
    limiter.push(2)
    limiter.push(3)
    expect(emit.mock.calls).toEqual([[1]])
    vi.advanceTimersByTime(100)
    expect(emit.mock.calls).toEqual([[1], [3]])
  })

  it('never exceeds the rate', () => {
    const emit = vi.fn()
    const limiter = new RateLimiter(10, emit, () => Date.now())
    for (let ms = 0; ms < 1000; ms += 5) {
      limiter.push(ms)
      vi.advanceTimersByTime(5)
    }
    expect(emit.mock.calls.length).toBeLessThanOrEqual(11)
    expect(emit.mock.calls.length).toBeGreaterThanOrEqual(9)
  })

  it('drops the pending value on dispose', () => {
    const emit = vi.fn()
    const limiter = new RateLimiter(10, emit, () => Date.now())
    limiter.push(1)
    limiter.push(2)
    limiter.dispose()
    vi.advanceTimersByTime(500)
    expect(emit.mock.calls).toEqual([[1]])
  })
})
