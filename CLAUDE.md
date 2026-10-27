# CLAUDE.md

Instructions pour Claude sur ce dépôt : centrale de contrôle OSC live
(cahier des charges fonctionnel : `SPEC.md`), bâtie sur un template Electron
en TypeScript organisé en plugins (monorepo pnpm). Le README.md s'adresse aux humains ;
ce fichier dit **où sont les choses, quelles règles respecter et comment
procéder**. Guide détaillé d'écriture d'un plugin : `plugins/README.md`.

Stack : TypeScript strict, zod, Electron + electron-vite, Vue 3 + Vuetify 4,
Vitest. Transport WebSocket **en dev comme en prod** (multi-clients : fenêtre
Electron + téléphone), voir §4 « Host et frontières ».

---

## 1. Commandes

| Commande | Usage |
|---|---|
| `pnpm install` | Après tout changement de `package.json` |
| `pnpm typecheck` | `vue-tsc -p .` dans chaque package (`.ts` et `.vue`) |
| `pnpm test` | Tous les tests ; `pnpm test plugins` / `pnpm test packages` pour filtrer |
| `pnpm --filter @template/plugin-<nom> test` | Tests d'un seul plugin |
| `pnpm build` | Build electron-vite → `out/` |
| `pnpm dev` / `pnpm start` | App en dev (UI servie par Vite) / build de prod en local (UI distante sur le port 8791) |

Avant de dire « terminé » : `pnpm typecheck`, `pnpm test`, `pnpm build`.
Lancer l'app depuis un terminal VS Code : `env -u ELECTRON_RUN_AS_NODE pnpm dev`.

---

## 2. Plugin de référence

Les plugins d'exemple du template (`osc`, `weather`) ont été retirés. La
référence pour écrire un plugin est désormais `plugins/show` (lire dans
l'ordre dto → contract → manager → plugin → composable) :
- Manager possédant des ressources (sockets UDP, timers) : `show-manager.ts`,
  `osc/osc-udp-io.ts` ;
- donnée tierce validée explicitement : fichier show (`show/show-store.ts`),
  paquets réseau (`osc/osc-packet-decoder.ts`) ;
- dépendance injectée par interface : `OscIo`, `TransportClock`.

Le mediator (`app-wiring.ts`) ne contient que la transmission au GUI des
pushes de `show` : un seul plugin pour l'instant.

---

## 3. Carte du dépôt

```
packages/
├── sdk/        # contrat de plugin : defineContract, definePlugin, protocole filaire, client Vue, PluginTestHarness
├── shared/     # constantes transport : ports WS et HTTP (UI distante)
├── main/       # HOST : bootstrap Electron, plugin host, transport WS, serveur UI distante, mediator
├── preload/    # vide : aucune API Electron exposée à la page
└── renderer/   # app Vue 3 + Vuetify : shell, pages, composants
plugins/        # plugins en workspace : show (le produit)
```

Le produit vit dans `plugins/show` :

| Dossier | Rôle |
|---|---|
| `src/show.dto.ts`, `show.contract.ts` | Fichier show (setup + presets), snapshot, live frames, requêtes |
| `src/modulation.ts` | Maths pures partagées back/front : LFO, courbe, mise à l'échelle (export `./modulation`) |
| `src/backend/show-manager.ts` | Orchestrateur : show ouvert, preset actif, boucle d'envoi, frames GUI |
| `src/backend/show/` | `ShowDocument` (règles d'édition, preset 0), `ShowStore` (JSON sous `userData/shows/`) |
| `src/backend/engine/` | Boucle à cadence fixe, pin matrix (`InputRouter`), limiteur de débit |
| `src/backend/clock/` | `TransportClock` (interface) + horloge interne ; Ableton Link s'y branchera |
| `src/backend/osc/` | Encodeur / décodeur OSC, sockets UDP |

Côté renderer : `pages/ParametersPage.vue`, `PinMatrixPage.vue`, `PresetsPage.vue`,
`SetupPage.vue` (sous-composants dans `pages/<page>/`), `components/show/TransportBar.vue`,
et `composables/show-context.ts` (une seule instance de `useShow()`, fournie par `App.vue`).

Le host ne connaît aucun plugin en particulier, **sauf à ces endroits** :

| Fichier | Rôle |
|---|---|
| `packages/main/src/plugin-registry.ts` | Liste des plugins chargés |
| `packages/main/src/app-wiring.ts` | **Mediator** : seules règles inter-plugins (§5.3) |
| `packages/renderer/src/pages/**` | Composants qui consomment le composable d'un plugin |
| `package.json` racine | Plugins déclarés en `devDependencies` |

Autres fichiers clés :

| Fichier | Rôle |
|---|---|
| `packages/main/src/index.ts` | Bootstrap : fenêtre, lifecycle, choix du transport. Câblage uniquement |
| `packages/main/src/plugin-host/plugin-host.ts` | Charge les plugins, route les requêtes, arrête les Managers |
| `packages/main/src/transport/` | `WsHostTransport` (dev et prod) |
| `packages/main/src/remote-ui/` | Serveur HTTP de l'UI construite, pour un téléphone (prod) |
| `packages/main/src/path-provider/app-data-path-provider.ts` | Chemins confinés sous `userData` |
| `packages/sdk/src/backend/plugin-context.types.ts` | Ce qu'un plugin reçoit du host (`handle`, `push`, `paths`) |
| `packages/renderer/src/navigation/sections.ts` | Pages de la sidebar |
| `packages/renderer/src/styles/` | Tout le CSS (§6) |

Signal dev/prod côté main : présence de `ELECTRON_RENDERER_URL` (posée
uniquement par `electron-vite dev`). Ne pas utiliser `app.isPackaged`.

---

## 4. Règles d'architecture (non négociables)

**Plugins**
- Un plugin n'importe jamais `electron`, `ws`, ni un autre plugin.
- Le contrat (`<nom>.contract.ts`) est la source de vérité : noms des
  requêtes et pushes, schémas zod. Backend et frontend l'importent tous les deux.
- Un DTO = un schéma zod, type dérivé par `z.infer`.
- Ne jamais appeler `.parse()` sur les données du contrat : le host et le
  client SDK valident déjà. Valider en revanche explicitement toute donnée
  tierce (fichier lu sur disque : voir `show-store.ts` ; paquet réseau : un
  décodeur qui lève une erreur explicite, voir `osc-packet-decoder.ts`).
- Le Manager porte la logique : ni SDK runtime, ni Electron, ni transport.
  Il reçoit ses dépendances au constructeur (callbacks, interface d'API,
  `PathProvider`). Composition, jamais héritage.
- Un Manager qui possède une ressource (socket, timer, fichier, device)
  implémente `StoppableManager` et `setup` le renvoie. Sinon, ne rien renvoyer.
- `definePlugin({ sdkVersion: 1 })` : littéral, jamais `SDK_VERSION`.
- Un handler qui échoue lève une erreur explicite ; jamais de fausse valeur.
- Un plugin ne reçoit jamais de chemin absolu : `context.paths` uniquement.
- `sdk`, `vue`, `zod` sont des `peerDependencies` du plugin (instance unique,
  sinon l'injection de `usePluginClient` casse).
- Le composable : appelé dans un `setup`, souscriptions nettoyées par
  `onScopeDispose`, aucun DOM. Les composants Vue vivent dans `renderer/`.

**Mediator (`app-wiring.ts`)**
- Seul endroit où deux plugins sont reliés. Une fonction par règle,
  `wireApp()` ne fait que les appeler.
- Utiliser `host.client(contract)` (même API `request` / `on` que le renderer).
- Toute requête déclenchée depuis un listener de push a un `.catch()` qui
  journalise : personne n'attend un listener.
- **Aucun push n'atteint le GUI par défaut** : le mediator transmet
  explicitement chaque push destiné à l'interface, avec
  `host.gui.forward(contract, ...pushes)`, dans une règle dédiée (exemple :
  `forwardShowToGui`). Un plugin peut donc pousser des événements internes à
  haute fréquence sans saturer le WebSocket. Un push qui n'atteint personne
  déclenche un avertissement unique en console.
- Chaque règle est testée dans `app-wiring.test.ts`.

**Host et frontières**
- `main/src/index.ts` ne fait que du câblage.
- **Dérogation au template (SPEC §10)** : le renderer parle à main **toujours
  en WebSocket** (`WS_PORT`), en dev comme en prod, pour accepter plusieurs
  clients. En prod, `remote-ui/remote-ui-server.ts` sert l'UI construite en
  HTTP (`REMOTE_UI_HTTP_PORT`) pour un téléphone sur le LAN. Le transport IPC
  du template a été retiré, et le preload est vide. Pas d'authentification :
  réseau de confiance uniquement.
- Toute donnée qui traverse une frontière (WS, réseau, disque) est validée.
  Jamais de `any` ni de cast non validé à une frontière.
- TypeScript strict, `noEmit` : chaque package a un `tsconfig.json` limité à
  `extends`, `include` et son environnement. Aucun `dist/`.

**Bundling**
- `devDependencies` importées → bundlées. `dependencies` → externes, copiées
  telles quelles : réservé aux modules non bundlables (natifs, `ws`).
- Donc un plugin pur JS se déclare en `devDependencies` du `package.json` racine.

---

## 5. Procédures

### 5.1 Retirer un plugin

1. Sa ligne dans `packages/main/src/plugin-registry.ts` (le tableau peut rester vide).
2. Ses règles dans `app-wiring.ts`, dont la transmission de ses pushes au GUI,
   et leurs tests (garder `wireApp`, même vide :
   `wireApp(_host: PluginHost)`, préfixe requis par `noUnusedParameters`).
3. Ses pages dans `renderer/src/pages/` et leurs entrées de `navigation/sections.ts`.
4. Sa `devDependency` dans le `package.json` racine, puis `pnpm install`.
5. Son dossier `plugins/<nom>`.
6. Mettre à jour §2 et §3 de ce fichier, et le README.
7. `pnpm typecheck && pnpm test && pnpm build`.

### 5.2 Créer un plugin

Suivre `plugins/README.md` (structure, `package.json`, checklist). En bref :
1. `plugins/<nom>/` avec `package.json` (exports `.`, `./dto`, `./backend`,
   `./frontend`), `tsconfig.json`, `src/<nom>.dto.ts`, `src/<nom>.contract.ts`,
   `src/backend/<nom>-manager.ts`, `src/backend/<nom>-plugin.ts`,
   `src/frontend/use-<nom>.ts`, et les tests.
2. `package.json` racine : `"@template/plugin-<nom>": "workspace:*"` en
   `devDependencies`, puis `pnpm install`.
3. Une ligne dans `plugin-registry.ts`.
4. Transmettre au GUI les pushes écoutés par son composable : une règle
   `forward<Nom>ToGui` dans `app-wiring.ts`, et son test.
5. Le consommer depuis un composant de `renderer/src/pages/`.

Ce sont plusieurs fichiers : lister les fichiers concernés et obtenir
l'accord de l'utilisateur avant de coder.

### 5.3 Ajouter une règle au mediator

Dans `app-wiring.ts` : une fonction nommée d'après la règle, qui reçoit les
`PluginClient` nécessaires, s'abonne aux pushes de l'un et appelle les
requêtes de l'autre ; l'appeler dans `wireApp`. Ajouter son test dans
`app-wiring.test.ts` (faux plugins définis dans le test, branchés sur un vrai
`PluginHost` avec un faux transport, comme dans `plugin-host.test.ts`). Si le plugin
cible doit refléter le changement dans l'UI, il doit émettre un push : le
mediator ne parle jamais au renderer.

### 5.4 Ajouter une page

Composant dans `renderer/src/pages/` (sous-composants dans `pages/<page>/`),
puis une entrée dans `navigation/sections.ts` (`id`, `label`, icône `mdi-*`,
`component`). `ComponentsGalleryPage` est une galerie de référence du style.

### 5.5 Ajouter une capacité du host

Pour un service Electron dont plusieurs plugins ont besoin (dialogues,
notifications…) : interface dans `sdk/src/capabilities/`, implémentation dans
`main/`, exposition dans `PluginContext` et `create-plugin-context.ts`,
puis mise à jour de §3.

### 5.6 Plugin avec module natif

(BLE, série, MIDI…) Non bundlable : `dependencies` (pas `devDependencies`),
`rollupOptions.external` de la cible `main` dans `electron.vite.config.ts`,
`asarUnpack` dans `electron-builder.yml`, rebuild pour Electron.

### 5.7 Renommer le projet

`package.json` racine (`name`, `description`), `electron-builder.yml`
(`appId`, `productName`). Le scope `@template/*` ne se change que partout à la
fois (noms, dépendances `workspace:*`, imports).

### 5.8 Packager

`electron-builder.yml` est à compléter avant une livraison : `files` en liste
blanche (ni `.map`, ni `.md`, ni test), `mac.electronLanguages`, `asarUnpack`
des modules natifs. Vérifier qu'aucun `node_modules` résiduel n'est dans le
paquet. Pistes de taille : `renderer.build.minify: 'esbuild'`, ne garder que
le `woff2` de `@mdi/font`.

---

## 6. Style du renderer

- **Aucun CSS dans les `.vue`** : ni `<style>`, ni `style=`. Uniquement des classes.
- `styles/tokens.css` : variables (thème sombre sous `.v-theme--obsidianDark`).
  Les couleurs sont dupliquées **à l'identique** dans `plugins/vuetify.ts` :
  modifier les deux.
- `styles/vuetify-overrides.css` : surcharges, sélecteurs `.v-*` uniquement.
- `styles/app-classes.css` : classes applicatives. Nouveau besoin visuel =
  nouvelle classe ici.
- Icônes : `@mdi/font`, `icon="mdi-..."`. Textes d'UI en français.

---

## 7. Tests

Vitest, sans config. Le test vit à côté du fichier testé (`x.ts` →
`x.test.ts`) ; les données partagées entre tests vont dans un `*.fixtures.ts`
voisin, importé uniquement par les tests.

- **Manager** : faux callbacks, fausse interface d'API, ressource locale
  réelle si bon marché (socket UDP sur `127.0.0.1`), `vi.useFakeTimers` pour
  le temps, `vi.stubGlobal('fetch', …)` pour le réseau. **Jamais d'appel
  réseau réel.**
- **Plugin** : vrai `setup` dans `PluginTestHarness` (`@template/sdk/testing`),
  qui valide comme le host. `harness.request`, `harness.pushesOf`, `harness.stop`.
- **Mediator** : `app-wiring.test.ts`, faux plugins définis dans le test.
- **Core** : `plugin-host.test.ts` (plugin `echo` local),
  `app-data-path-provider.test.ts`, `remote-ui-server.test.ts`.

Chaque plugin a `vitest` en `devDependencies` et `"test": "vitest run"`.

---

## 8. Pièges connus

- `main` et `preload` sont bundlés en **CommonJS** (`index.cjs`) malgré
  `"type": "module"` : un entrypoint ESM qui importe `electron` plante.
- `ws` reste **externe** au bundle `main` (requires optionnels incompatibles Rollup).
- Plugins Vite : `vue()` **avant** `vuetify()`, sinon pas de tree-shaking.
  `resolve.dedupe: ['vue']` évite une double copie de Vue.
- `ELECTRON_RUN_AS_NODE=1` hérité de VS Code : Electron démarre en simple
  Node (`reading 'whenReady'`). Lancer avec `env -u ELECTRON_RUN_AS_NODE`.
- Dev et prod ne servent pas l'UI pareil (Vite vs `RemoteUiServer` /
  `loadFile`) : un changement côté transport ou chargement se vérifie aussi
  avec `pnpm build && pnpm start`.
- `pnpm` absent du PATH : passer par `corepack pnpm`.

---

## 9. Limites connues

- Modules natifs : déclaration manuelle par plugin (§5.6).
- `@template/sdk` vit dans le monorepo : un plugin dans son propre dépôt
  exige de publier le SDK comme dépendance git versionnée.
- Typecheck d'un plugin externe (sources `.ts` dans `node_modules`) : non testé.
