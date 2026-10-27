// Unit tests of InputRouter: conversion, fan-out, undeclared addresses and rate limiting.
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { InputDeclDto, ParameterDeclDto, SetupDto } from '../../show.dto'
import { InputRouter } from './input-router'

const fader: InputDeclDto = {
  address: '/fader1', type: 'float', min: 0, max: 1, description: '', keywords: [], maxRateHz: null,
}
const opacity: ParameterDeclDto = { address: '/video/opacity', type: 'float', min: 0, max: 100, description: '', keywords: [] }
const layer: ParameterDeclDto = { address: '/video/layer', type: 'int', min: 0, max: 4, description: '', keywords: [] }

function setupWith(inputs: InputDeclDto[]): SetupDto {
  return {
    inputPort: 9000,
    output: { host: '127.0.0.1', port: 9001 },
    outputRateHz: 60,
    parameters: [opacity, layer],
    inputs,
  }
}

describe('InputRouter', () => {
  afterEach(() => vi.useRealTimers())

  it('forwards an input to every linked parameter, in its units', () => {
    const send = vi.fn()
    const router = new InputRouter(send)
    router.configure(setupWith([fader]), [
      { input: '/fader1', output: '/video/opacity' },
      { input: '/fader1', output: '/video/layer' },
    ])

    router.receive('/fader1', [0.5])

    expect(send.mock.calls).toEqual([
      [opacity, 50],
      [layer, 2],
    ])
    expect([...router.drivenOutputs()]).toEqual(['/video/opacity', '/video/layer'])
  })

  it('scales the input range onto the output range, whatever their units', () => {
    const send = vi.fn()
    const router = new InputRouter(send)
    const wideFader: InputDeclDto = { ...fader, min: 0, max: 1000 }
    const unitOutput: ParameterDeclDto = { address: '/video/opacity', type: 'float', min: 0, max: 1, description: '', keywords: [] }
    router.configure({ ...setupWith([wideFader]), parameters: [unitOutput] }, [{ input: '/fader1', output: '/video/opacity' }])

    router.receive('/fader1', [0])
    router.receive('/fader1', [250])
    router.receive('/fader1', [1000])

    expect(send.mock.calls).toEqual([
      [unitOutput, 0],
      [unitOutput, 0.25],
      [unitOutput, 1],
    ])
  })

  it('clamps an out-of-range input to the bound it exceeds before scaling', () => {
    const send = vi.fn()
    const router = new InputRouter(send)
    const unitOutput: ParameterDeclDto = { address: '/video/opacity', type: 'float', min: 0, max: 1, description: '', keywords: [] }
    router.configure({ ...setupWith([fader]), parameters: [unitOutput] }, [{ input: '/fader1', output: '/video/opacity' }])

    router.receive('/fader1', [128.5])
    router.receive('/fader1', [-3])

    expect(send.mock.calls).toEqual([
      [unitOutput, 1],
      [unitOutput, 0],
    ])
  })

  it('ignores unlinked addresses and links to undeclared addresses', () => {
    const send = vi.fn()
    const router = new InputRouter(send)
    router.configure(setupWith([fader]), [{ input: '/fader1', output: '/nope' }])
    router.receive('/fader1', [0.5])
    router.receive('/other', [1])
    expect(send).not.toHaveBeenCalled()
    expect(router.drivenOutputs().size).toBe(0)
  })

  it('applies the per-input rate limit, keeping the latest value', () => {
    vi.useFakeTimers()
    const send = vi.fn()
    const router = new InputRouter(send, () => Date.now())
    router.configure(setupWith([{ ...fader, maxRateHz: 10 }]), [{ input: '/fader1', output: '/video/opacity' }])

    router.receive('/fader1', [0.25])
    router.receive('/fader1', [0.2])
    router.receive('/fader1', [0.75])
    vi.advanceTimersByTime(100)

    expect(send.mock.calls.map(([, value]) => value)).toEqual([25, 75])
  })
})
