// Network ports shared by main and the renderer. The GUI always talks to main over
// WebSocket (dev and prod), so a phone on the LAN can be a second control surface.

/** WebSocket server of the plugin host (every GUI client connects here). */
export const WS_PORT = 8790

/** HTTP server of the built GUI, for remote clients (phone, tablet) in production. */
export const REMOTE_UI_HTTP_PORT = 8791
