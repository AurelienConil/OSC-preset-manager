// Contract tests of the OSC plugin: real setup, validated against the contract by the SDK harness.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTestHarness } from '@template/sdk/testing'
import oscPlugin from './osc-plugin'

const TEST_PORT = 57_122

describe('osc plugin', () => {
  let harness: PluginTestHarness<typeof oscPlugin.contract>

  beforeEach(() => {
    harness = new PluginTestHarness(oscPlugin)
  })

  afterEach(async () => {
    await harness.stop()
  })

  it('starts stopped', async () => {
    expect(await harness.request('getStatus')).toEqual({ running: false, port: null, error: null })
  })

  it('starts and stops the server, pushing each status change', async () => {
    expect(await harness.request('start', { port: TEST_PORT })).toMatchObject({ running: true, port: TEST_PORT })
    expect(await harness.request('stop')).toMatchObject({ running: false, port: null })
    expect(harness.pushesOf('statusChanged').map(({ running }) => running)).toEqual([true, false])
  })

  it('rejects a privileged port (contract)', async () => {
    await expect(harness.request('start', { port: 80 })).rejects.toThrow()
  })
})
