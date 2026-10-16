// Public contract of the OSC plugin: its requests and pushes, shared by backend and frontend.
//
// EXAMPLE PLUGIN — the contract is the single source of truth of a plugin:
// the backend registers one handler per request (`context.handle`), the
// frontend calls them (`client.request`), and both sides are typed and
// validated from the schemas below. Every name is namespaced by `id` on the
// wire (`osc:start`), so two plugins can both have a `start` request.
import { z } from 'zod'
import { defineContract } from '@template/sdk'
import { OscMessageDto, OscStartRequestDto, OscStatusDto } from './osc.dto'

export const oscContract = defineContract({
  id: 'osc',
  // Requests: called by the GUI (or by the app mediator), one response each.
  requests: {
    // z.undefined(): no payload, the caller writes client.request('getStatus').
    getStatus: { request: z.undefined(), response: OscStatusDto },
    start: { request: OscStartRequestDto, response: OscStatusDto },
    stop: { request: z.undefined(), response: OscStatusDto },
  },
  // Pushes: sent by the backend whenever it wants, to every window and to
  // main-side listeners (the app mediator listens to `message`).
  pushes: {
    // A status push, and not only request responses, because the server can
    // also stop on its own (socket error) and every open window must know it.
    statusChanged: OscStatusDto,
    message: OscMessageDto,
  },
})
