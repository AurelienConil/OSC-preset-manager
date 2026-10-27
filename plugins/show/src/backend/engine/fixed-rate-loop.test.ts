// Unit tests of FixedRateLoop with fake timers.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FixedRateLoop } from './fixed-rate-loop'

describe('FixedRateLoop', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('ticks at the requested rate until stopped', () => {
    const tick = vi.fn()
    const loop = new FixedRateLoop(100, tick, () => Date.now())
    loop.start()
    vi.advanceTimersByTime(100)
    expect(tick).toHaveBeenCalledTimes(10)
    loop.stop()
    vi.advanceTimersByTime(100)
    expect(tick).toHaveBeenCalledTimes(10)
  })

  it('keeps ticking when a tick throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const tick = vi.fn(() => {
      throw new Error('boom')
    })
    const loop = new FixedRateLoop(100, tick, () => Date.now())
    loop.start()
    vi.advanceTimersByTime(30)
    expect(tick).toHaveBeenCalledTimes(3)
    loop.stop()
  })
})
