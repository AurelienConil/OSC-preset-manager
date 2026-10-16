// Single generic IPC channel: every { event, payload } message travels
// through it, in both directions. Symmetric with the WS transport, which
// has no channel concept and carries the event name inside the message.

export const APP_IPC_CHANNEL = 'app:event'
