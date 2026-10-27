// Tests of the mediator rules.
import { describe, expect, it, vi } from 'vitest'
import { showContract } from '@template/plugin-show'
import { forwardShowToGui } from './app-wiring'

describe('forwardShowToGui', () => {
  it('forwards every push of the show plugin, so no GUI view silently stops updating', () => {
    const forward = vi.fn()
    forwardShowToGui({ forward })
    const forwarded = forward.mock.calls.flatMap(([contract, ...names]) => (contract === showContract ? names : []))
    expect(forwarded.sort()).toEqual(Object.keys(showContract.pushes).sort())
  })
})
