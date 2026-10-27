// Unit tests of InternalClock with a hand-driven time source.
import { describe, expect, it } from 'vitest'
import { InternalClock } from './internal-clock'

function createClock() {
  let nowMs = 1_000
  const clock = new InternalClock(() => nowMs)
  return { clock, advance: (ms: number) => (nowMs += ms) }
}

describe('InternalClock', () => {
  it('stays at beat 0 until played', () => {
    const { clock, advance } = createClock()
    advance(5_000)
    expect(clock.beats()).toBe(0)
    expect(clock.state()).toEqual({ playing: false, bpm: 120 })
  })

  it('counts beats at the tempo while playing', () => {
    const { clock, advance } = createClock()
    clock.play()
    advance(1_000)
    expect(clock.beats()).toBeCloseTo(2) // 120 bpm = 2 beats per second
  })

  it('freezes on stop and restarts from 0 on play', () => {
    const { clock, advance } = createClock()
    clock.play()
    advance(1_500)
    clock.stop()
    advance(10_000)
    expect(clock.beats()).toBeCloseTo(3)
    clock.play()
    expect(clock.beats()).toBe(0)
  })

  it('keeps the position continuous across a tempo change', () => {
    const { clock, advance } = createClock()
    clock.play()
    advance(1_000)
    clock.setBpm(60)
    expect(clock.beats()).toBeCloseTo(2)
    advance(1_000)
    expect(clock.beats()).toBeCloseTo(3)
  })
})
