# Writing a plugin

This guide walks you through creating a plugin for this Electron template, from
an empty folder to a feature you can call from a Vue component.

The examples build a small `counter` plugin: one request to read the value, one
to increment it, and one push that notifies the UI whenever the value changes.
The `show` plugin in this folder follows the same structure: read it
alongside this guide, in this order: dto → contract → manager → plugin →
composable.

| Reference | What it shows |
|---|---|
| `show` | Manager owning resources (UDP sockets, timers) behind interfaces (`OscIo`, `TransportClock`), third-party data validated explicitly (show files, OSC packets), snapshot + patch + throttled pushes |

The template's original example plugins (`osc`, `weather`) have been removed
from this project.

---

## 1. What a plugin is

A plugin is a self-contained package that ships **one feature, backend and
frontend together, without any UI component**:

| Part | File | Runs in | Role |
|---|---|---|---|
| DTO | `counter.dto.ts` | both | zod schemas of the data |
| Contract | `counter.contract.ts` | both | the plugin's public API: requests and pushes |
| Manager | `backend/counter-manager.ts` | main | business logic, no Electron, no transport |
| Backend entry | `backend/counter-plugin.ts` | main | connects the Manager to the contract |
| Composable | `frontend/use-counter.ts` | renderer | typed access to the plugin from Vue |

Vue **components** are not part of a plugin. They live in the app
(`packages/renderer`), because the markup depends on each project. A tiny
status icon and a full details panel can both use the same composable.

### Requests and pushes

- A **request** is called by the UI (or by another part of main) and returns
  one response, like a function call: `client.request('increment')`.
- A **push** is sent by the plugin whenever it wants, with no request involved.
  Typical uses are a connection that drops, a value that changes, or data coming
  in from a device. The UI listens with `client.on('changed', ...)`.

### What the host does for you

You don't write any transport, validation or wiring code. The host:

- validates every request payload, response and push against your contract
  (zod), on both sides of the WebSocket boundary;
- prefixes every name with your plugin id (`counter:increment`), so plugins
  can't collide;
- matches each response to its request, so concurrent calls never get mixed up;
- refuses to start if your plugin targets another SDK version, if a declared
  request has no handler, or if the same plugin id is loaded twice;
- calls `stop()` on your Manager before the app quits.

---

## 2. Rules

Enforced by the host (you get an error at startup or at call time):

- Every request declared in the contract has exactly one handler.
- Every payload crossing a process boundary matches its zod schema.
- `sdkVersion` matches the SDK the host runs.

Enforced by convention (code review):

- A plugin never imports `electron`, `ws`, or another plugin.
- The Manager knows nothing about the SDK or the transport. It receives what it
  needs through its constructor (a callback, a `PathProvider`...).
- One file holds one concept and starts with a one-line comment stating its role.
- Never call `.parse()` by hand on data coming from the contract: the host and
  the SDK already do it.
- Never accept an absolute path from the caller. Use `context.paths`, which
  resolves relative paths under the app data folder and rejects `..` escapes.

---

## 3. Step by step

### 3.1 Folder layout

```
plugins/counter/
├── package.json
├── tsconfig.json
└── src/
    ├── counter.dto.ts
    ├── counter.contract.ts
    ├── backend/
    │   ├── counter-manager.ts
    │   ├── counter-manager.test.ts
    │   ├── counter-plugin.ts
    │   └── counter-plugin.test.ts
    └── frontend/
        └── use-counter.ts
```

### 3.2 `package.json`

The `exports` map is what keeps the backend out of the renderer bundle and the
composable out of the main bundle. Main imports `./backend`, the renderer
imports `./frontend`, and both may import `.` (the contract) and `./dto`.

```json
{
  "name": "@template/plugin-counter",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Counter plugin: read, increment, change notifications.",
  "exports": {
    ".": "./src/counter.contract.ts",
    "./dto": "./src/counter.dto.ts",
    "./backend": "./src/backend/counter-plugin.ts",
    "./frontend": "./src/frontend/use-counter.ts"
  },
  "scripts": {
    "test": "vitest run"
  },
  "peerDependencies": {
    "@template/sdk": "^1.0.0",
    "vue": "^3.5.42",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@template/sdk": "workspace:*",
    "vitest": "^3.2.7",
    "vue": "^3.5.42",
    "zod": "^3.23.8"
  }
}
```

`@template/sdk`, `vue` and `zod` **must** be `peerDependencies`. The app has
to load a single copy of each. A second copy of the SDK would break
`usePluginClient()`, because its Vue injection key would no longer match.

Put your own runtime libraries (a BLE or serial library, for example) in
`dependencies`. See [section 8](#8-known-limitations) if they are native
modules.

### 3.3 `tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node"]
  },
  "include": ["src"]
}
```

### 3.4 DTO: `src/counter.dto.ts`

One DTO is one zod schema, and the TypeScript type is derived from it.

```ts
// Public DTO contract of the counter plugin (zod schemas + inferred types).
import { z } from 'zod'

export const CounterValueDto = z.object({ value: z.number().int() })
export type CounterValueDto = z.infer<typeof CounterValueDto>

export const IncrementRequestDto = z.object({ step: z.number().int().positive() })
export type IncrementRequestDto = z.infer<typeof IncrementRequestDto>
```

### 3.5 Contract: `src/counter.contract.ts`

The contract is the single source of truth: names, payloads and responses. The
backend and the frontend both import it, so a typo or a wrong payload is a
compile error, not a runtime surprise.

```ts
// Public contract of the counter plugin: its requests and pushes.
import { z } from 'zod'
import { defineContract } from '@template/sdk'
import { CounterValueDto, IncrementRequestDto } from './counter.dto'

export const counterContract = defineContract({
  id: 'counter',
  requests: {
    get: { request: z.undefined(), response: CounterValueDto },
    increment: { request: IncrementRequestDto, response: CounterValueDto },
  },
  pushes: {
    changed: CounterValueDto,
  },
})
```

- `id` must be unique across the app. It becomes the namespace (`counter:get`).
- Use `z.undefined()` for a request without payload. The caller then writes
  `client.request('get')` with no argument.
- A plugin with no push declares `pushes: {}`.

### 3.6 Manager: `src/backend/counter-manager.ts`

Plain business logic. It does not import the SDK runtime, Electron or the
transport. It receives what it needs through its constructor, which keeps it
testable with plain Node.

```ts
// CounterManager: holds a counter and notifies every change.
import type { StoppableManager } from '@template/sdk'
import type { CounterValueDto, IncrementRequestDto } from '../counter.dto'

export class CounterManager implements StoppableManager {
  private value = 0

  constructor(private readonly onChanged: (event: CounterValueDto) => void) {}

  get(): CounterValueDto {
    return { value: this.value }
  }

  increment(request: IncrementRequestDto): CounterValueDto {
    this.value += request.step
    this.onChanged(this.get())
    return this.get()
  }

  stop(): void {
    // Nothing to release; see OscServerManager for a Manager owning a socket.
  }
}
```

Implement `StoppableManager` whenever the Manager owns a resource (timer,
connection, file handle, device). The host awaits every `stop()` before quitting.

### 3.7 Backend entry: `src/backend/counter-plugin.ts`

This file connects the Manager to the contract, and it is the only file the host
loads. It must `export default` the result of `definePlugin`.

```ts
// Backend entry point of the counter plugin, loaded by the host.
import { definePlugin } from '@template/sdk/backend'
import { counterContract } from '../counter.contract'
import { CounterManager } from './counter-manager'

export default definePlugin({
  sdkVersion: 1,
  contract: counterContract,
  setup(context) {
    const manager = new CounterManager((event) => context.push('changed', event))
    context.handle('get', () => manager.get())
    context.handle('increment', (request) => manager.increment(request))
    return manager
  },
})
```

- **`sdkVersion` is a literal** (`1`), never the imported `SDK_VERSION`
  constant. The constant would always equal the host's own version, so the
  compatibility check could never fail.
- `context.handle(name, handler)`: `request` is already validated and typed
  from the contract. The handler may return a value or a Promise.
- `context.push(name, payload)`: the payload is validated, then given to
  main-side listeners. It reaches the GUI **only if the app mediator forwards
  it** (section 4.3), so a push can also carry internal, high-rate events.
- `context.paths`: the host's `PathProvider`. Pass it to any Manager that
  writes to disk: it only ever gets paths relative to the app data folder.
- Return the Manager (or anything with `stop()`) so the host can stop it.
- A handler that throws turns into a rejected Promise on the caller's side,
  carrying your error message. Throw explicit errors; never return a fake value.

### 3.8 Composable: `src/frontend/use-counter.ts`

The composable is the plugin's frontend API. It exposes functions and reactive
state, and never any DOM.

```ts
// Vue composable of the counter plugin: requests plus the live value.
import { onScopeDispose, ref } from 'vue'
import { usePluginClient } from '@template/sdk/frontend'
import { counterContract } from '../counter.contract'
import type { CounterValueDto, IncrementRequestDto } from '../counter.dto'

export function useCounter() {
  const client = usePluginClient(counterContract)
  const current = ref<CounterValueDto>()

  onScopeDispose(
    client.on('changed', (event) => {
      current.value = event
    }),
  )

  return {
    current,
    get: () => client.request('get'),
    increment: (request: IncrementRequestDto) => client.request('increment', request),
  }
}
```

- Call it **synchronously inside a component's `setup`** (or an
  `effectScope`). `usePluginClient` relies on Vue's `inject` and throws an
  explicit error outside that context.
- There is no `onMounted`: subscriptions don't need the DOM. Subscribing during
  `setup` also means no push is missed between setup and mount.
- `client.on()` returns an unsubscribe function. Hand it to `onScopeDispose` so
  it runs when the component unmounts.

---

## 4. Plugging it into the app

### 4.1 Declare the dependency

In the **root** `package.json`, under `devDependencies`. Plugins are bundled by
electron-vite, so they must not be copied as-is into the packaged app.

- Plugin inside this repo (`plugins/counter`):

  ```json
  "@template/plugin-counter": "workspace:*"
  ```

- Plugin in its own git repository, pinned to a tag:

  ```json
  "@moi/plugin-counter": "github:moi/plugin-counter#v1.0.0"
  ```

Then run `pnpm install`.

### 4.2 Register the backend

One line in [`packages/main/src/plugin-registry.ts`](../packages/main/src/plugin-registry.ts):

```ts
import counterPlugin from '@template/plugin-counter/backend'

export const enabledPlugins = [showPlugin, counterPlugin]
```

### 4.3 Forward its pushes to the GUI

No push reaches the GUI by default: the application decides, in
[`packages/main/src/app-wiring.ts`](../packages/main/src/app-wiring.ts). Add
one rule listing the pushes your composable listens to, and call it in
`wireApp()`:

```ts
export function forwardCounterToGui(gui: Pick<GuiForwarding, 'forward'>): void {
  gui.forward(counterContract, 'changed')
}
```

Forgetting it leaves the GUI silent. Two guards: at runtime the host warns
once about a push that reaches nobody (neither forwarded nor listened to in
main), and `app-wiring.test.ts` checks that the forwarded pushes are exactly
the ones intended (see the test of `forwardShowToGui`).

### 4.4 Typecheck

Nothing to declare: `pnpm typecheck` runs `vue-tsc -p .` in every workspace
package, so an in-repo plugin with its own `tsconfig.json` is covered
automatically.

### 4.5 Use it in a component

```vue
<!-- Role: counter widget with an increment button. -->
<script setup lang="ts">
import { useCounter } from '@template/plugin-counter/frontend'

const { current, increment } = useCounter()
</script>

<template>
  <v-btn @click="increment({ step: 1 })">{{ current?.value ?? 0 }}</v-btn>
</template>
```

Remember the app's style rule: no `<style>` block and no inline `style=` in
`.vue` files. See the root `CLAUDE.md`, §6.

---

## 5. Reacting to another plugin: the app mediator

Plugins never import each other. "When plugin A emits X, plugin B must do Y"
is a rule of the **application**, not of A nor of B, so it lives in the app
mediator, [`packages/main/src/app-wiring.ts`](../packages/main/src/app-wiring.ts).
This file is the keystone of the project: every cross-plugin behaviour is
there, and every plugin stays reusable in another app.

`host.client(contract)` gives the same typed API as the composable, from the
main process. Write one function per rule; `wireApp()` only lists them. An
illustrative rule (an OSC plugin changing the city of a weather plugin):

```ts
function forwardOscCityToWeather(
  osc: PluginClient<typeof oscContract>,
  weather: PluginClient<typeof weatherContract>,
): void {
  osc.on('message', ({ address, args }) => {
    const [city] = args
    if (address !== '/weather/city' || typeof city !== 'string') return
    // Nobody awaits a push listener: report the error here, or it is lost.
    weather
      .request('setCity', { city })
      .catch((error: unknown) => console.error('Weather update failed:', error))
  })
}

export function wireApp(host: PluginHost): void {
  forwardOscCityToWeather(host.client(oscContract), host.client(weatherContract))
}
```

The GUI updates by itself: `setCity` makes the weather plugin push `updated`,
which reaches every window, provided the mediator forwards it
(`host.gui.forward(weatherContract, 'updated')`).

Design your pushes so that other plugins *can* react to them, but never assume
who listens. Test each rule in `app-wiring.test.ts` with fake plugins.

---

## 6. Testing

Tests use **Vitest** and live next to the file they test, in `src/`. Run them
with `pnpm --filter @template/plugin-counter test`, or `pnpm test` at the root
(all plugins + host). Reference: `plugins/show`.

- **Manager** (`counter-manager.test.ts`): plain Node, no Electron, no host.
  Instantiate it with a fake callback or a fake `PathProvider` that points to
  a temp folder. Use `vi.useFakeTimers()` for anything time-based.
- **Plugin** (`counter-plugin.test.ts`): run the real `setup` in the SDK's
  `PluginTestHarness`. It checks what the host checks (SDK version, one
  handler per request) and validates every request, response and push
  against the contract:

  ```ts
  import { PluginTestHarness } from '@template/sdk/testing'
  import counterPlugin from './counter-plugin'

  const harness = new PluginTestHarness(counterPlugin) // { paths } if the plugin uses context.paths
  await harness.request('increment', { step: 2 })      // validated payload and response
  harness.pushesOf('changed')                          // validated pushes, oldest first
  await harness.stop()                                 // stops the Manager returned by setup
  ```

- **In the app**: `pnpm dev`, then `pnpm build && pnpm start`. Test both: the
  GUI is not served the same way (Vite vs the built files). From the VS Code
  terminal, use `env -u ELECTRON_RUN_AS_NODE pnpm dev`.

---

## 7. Publishing a plugin in its own repository

1. Move the folder to a new repository. Keep the same `package.json`, but
   change the scope (`@moi/plugin-counter`).
2. Tag releases with semver (`v1.0.0`, `v1.1.0`...). Consumers pin a tag in
   their `package.json`.
3. Bump `sdkVersion` only when you migrate to a new major SDK version.
4. Bump your plugin's major version whenever you change the contract in a
   breaking way: a renamed request, a removed field, a stricter schema.

## 8. Known limitations

- **Native modules** (BLE, serial, MIDI libraries...) cannot be bundled. For
  now, each one has to be added by hand to `rollupOptions.external` in
  `electron.vite.config.ts` and to `asarUnpack` in `electron-builder.yml`, then
  rebuilt for Electron (`electron-rebuild`).
- **The SDK lives in this monorepo**. To develop a plugin in a separate
  repository, `@template/sdk` must itself become a versioned git dependency.

---

## Checklist

- [ ] `package.json` with the four `exports`, and `sdk`/`vue`/`zod` as peers
- [ ] DTOs as zod schemas, types derived with `z.infer`
- [ ] Contract with a unique `id`; every request has a request and a response schema
- [ ] Manager with no SDK runtime, no Electron, no transport; `StoppableManager` if it owns a resource
- [ ] Backend entry: `export default definePlugin(...)`, literal `sdkVersion`, one `handle` per request, returns the Manager
- [ ] Composable: called in `setup`, listeners cleaned up with `onScopeDispose`, no DOM
- [ ] Tests: Manager unit tests + plugin tests through `PluginTestHarness` (`pnpm test` green)
- [ ] Dependency in the root `package.json` plus one line in `plugin-registry.ts`
- [ ] Its GUI pushes forwarded in `app-wiring.ts` (`host.gui.forward`), with a test
- [ ] Tested in `pnpm dev` **and** `pnpm build && pnpm start`
