// Integration tests of PluginHost with a fake transport and a minimal echo plugin, no Electron.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { defineContract, type PushMessage, type ResponseMessage } from '@template/sdk'
import { definePlugin, type PluginContext } from '@template/sdk/backend'
import type { HostMessageListener, HostTransport } from '../transport/host-transport.types'
import { PluginHost } from './plugin-host'

const TextDto = z.object({ text: z.string() })

const echoContract = defineContract({
  id: 'echo',
  requests: { echo: { request: TextDto, response: TextDto } },
  pushes: { said: TextDto },
})

type EchoContext = PluginContext<typeof echoContract>

const handleEcho = (context: EchoContext) => context.handle('echo', (payload) => payload)

function createEchoPlugin(setup: (context: EchoContext) => unknown = handleEcho) {
  return definePlugin({ sdkVersion: 1, contract: echoContract, setup: (context) => void setup(context) })
}

function createHost() {
  let listener: HostMessageListener | undefined
  const broadcasts: PushMessage[] = []
  const transport: HostTransport = {
    onMessage: (registered) => { listener = registered },
    broadcast: (message) => { broadcasts.push(message) },
  }
  const paths = { resolve: (): string => { throw new Error('paths are not used in these tests') } }
  const host = new PluginHost({ transport, paths })
  const deliver = (raw: unknown, reply: (message: ResponseMessage) => void) => (listener as HostMessageListener)(raw, reply)
  const send = (raw: unknown) => new Promise<ResponseMessage>((reply) => deliver(raw, reply))
  return { host, broadcasts, deliver, send }
}

const echoRequest = (payload: unknown, name = 'echo') => ({ kind: 'request', id: 7, plugin: 'echo', name, payload })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PluginHost loading', () => {
  it('refuses a plugin built for another SDK version', () => {
    const { host } = createHost()
    expect(() => host.load([{ ...createEchoPlugin(), sdkVersion: 2 }])).toThrow(/targets SDK v2/)
  })

  it('refuses the same plugin id twice', () => {
    const { host } = createHost()
    expect(() => host.load([createEchoPlugin(), createEchoPlugin()])).toThrow(/loaded twice/)
  })

  it('refuses a plugin missing a request handler', () => {
    const { host } = createHost()
    expect(() => host.load([createEchoPlugin(() => {})])).toThrow(/no handler for: echo/)
  })
})

describe('PluginHost requests from the transport', () => {
  it('answers a valid request with the same id', async () => {
    const { host, send } = createHost()
    host.load([createEchoPlugin()])
    expect(await send(echoRequest({ text: 'hi' }))).toEqual({ kind: 'response', id: 7, payload: { text: 'hi' } })
  })

  it('answers an error when the payload breaks the contract', async () => {
    const { host, send } = createHost()
    host.load([createEchoPlugin()])
    const response = await send(echoRequest({ text: 42 }))
    expect(response).toMatchObject({ kind: 'response', id: 7 })
    expect(response.error).toBeDefined()
  })

  it('answers an error when the handler result breaks the contract', async () => {
    const { host, send } = createHost()
    host.load([createEchoPlugin((context) => context.handle('echo', () => ({ text: 1 }) as never))])
    expect((await send(echoRequest({ text: 'hi' }))).error).toBeDefined()
  })

  it('answers an error for an unknown request', async () => {
    const { host, send } = createHost()
    host.load([createEchoPlugin()])
    expect((await send(echoRequest({ text: 'hi' }, 'nope'))).error).toMatch(/Unknown request "echo:nope"/)
  })

  it('ignores a message that is not a request', async () => {
    const { host, deliver } = createHost()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    host.load([createEchoPlugin()])
    const reply = vi.fn()

    deliver({ kind: 'push', plugin: 'echo', name: 'said', payload: { text: 'spoofed' } }, reply)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(reply).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledOnce()
  })
})

describe('PluginHost pushes, main-side client and stop', () => {
  function loadWithPush() {
    const created = createHost()
    let push: EchoContext['push'] = () => {}
    created.host.load([createEchoPlugin((context) => { handleEcho(context); push = context.push })])
    return { ...created, push: (text: string) => push('said', { text }) }
  }

  it('notifies main-side listeners but sends nothing to the GUI by default', () => {
    const { host, broadcasts, push } = loadWithPush()
    const listener = vi.fn()
    host.client(echoContract).on('said', listener)

    push('hello')

    expect(listener).toHaveBeenCalledWith({ text: 'hello' })
    expect(broadcasts).toEqual([])
  })

  it('broadcasts a push to the GUI once the mediator forwards it', () => {
    const { host, broadcasts, push } = loadWithPush()
    host.gui.forward(echoContract, 'said')

    push('hello')

    expect(broadcasts).toEqual([{ kind: 'push', plugin: 'echo', name: 'said', payload: { text: 'hello' } }])
  })

  it('warns once when a push reaches nobody', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { push } = loadWithPush()

    push('a')
    push('b')

    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]?.[0]).toMatch(/"echo:said" reaches nobody.*host\.gui\.forward/)
  })

  it('refuses to forward a push of an unloaded plugin or an undeclared push', () => {
    const { host } = createHost()
    expect(() => host.gui.forward(echoContract, 'said')).toThrow(/not loaded/)
    host.load([createEchoPlugin()])
    expect(() => host.gui.forward(echoContract, 'nope' as never)).toThrow(/declares no push "nope"/)
  })

  it('throws on a push that breaks the contract', () => {
    const { host } = createHost()
    let push: EchoContext['push'] = () => {}
    host.load([createEchoPlugin((context) => { handleEcho(context); push = context.push })])
    expect(() => push('said', { text: 1 } as never)).toThrow()
  })

  it('serves main-side requests through host.client()', async () => {
    const { host } = createHost()
    host.load([createEchoPlugin()])
    expect(await host.client(echoContract).request('echo', { text: 'in-process' })).toEqual({ text: 'in-process' })
  })

  it('stops every manager returned by setup', async () => {
    const { host } = createHost()
    const stop = vi.fn()
    const plugin = definePlugin({
      sdkVersion: 1,
      contract: echoContract,
      setup: (context) => { handleEcho(context); return { stop } },
    })
    host.load([plugin])

    await host.stop()
    expect(stop).toHaveBeenCalledOnce()
  })
})
