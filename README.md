# OSC Preset Manager

Centrale de contrôle OSC pour le spectacle vivant : presets globaux, courbes,
oscillateurs, pin matrix, transport. Cahier des charges : [SPEC.md](SPEC.md).

- **Paramètres** : chaque paramètre déclaré, en valeur fixe, courbe dessinée ou
  LFO synchronisé au transport ; navigation par groupes d'adresses et filtres.
- **Pin matrix** : relie des entrées OSC à des paramètres, par preset.
- **Presets** : rappel instantané, création depuis le preset 0, duplication,
  réordonnancement, suppression ; fichier show et ports OSC.
- **Setup** : déclaration des paramètres et des entrées (les adresses reçues
  sont détectées et proposées), ou édition du setup en JSON.

Par défaut : entrée OSC sur le port UDP 9000, sortie vers `127.0.0.1:9001`.
Les shows sont enregistrés automatiquement dans le dossier de données de
l'application (`shows/<nom>.json`).

**Depuis un téléphone** (même réseau) : `http://<ip-de-l-ordinateur>:8791`
avec `pnpm start` / l'app installée, ou `http://<ip>:5173` avec `pnpm dev`.
Aucune authentification : à n'utiliser que sur un réseau de confiance.

---

## Le template de départ

Un point de départ pour une application de bureau Electron, organisée en
**plugins** : chaque fonctionnalité est un petit module indépendant, avec sa
partie système (backend) et sa partie interface (frontend).

L'interface est en Vue 3 + Vuetify, le code en TypeScript.

---

## Démarrer

**Prérequis** : Node.js 20 ou plus, et pnpm 9 ou plus.
Si pnpm manque : `corepack enable`.

1. Sur GitHub, cliquer sur **Use this template** pour créer votre dépôt.
2. Le cloner, puis installer les dépendances :

   ```bash
   git clone <url-de-votre-depot>
   cd <votre-depot>
   pnpm install
   ```

3. Lancer l'application :

   ```bash
   pnpm dev
   ```

> Depuis le terminal intégré de VS Code, lancer plutôt
> `env -u ELECTRON_RUN_AS_NODE pnpm dev`.

---

## Commandes

| Commande | À quoi ça sert |
|---|---|
| `pnpm dev` | Lancer l'app en développement (rechargement à chaud) |
| `pnpm test` | Lancer les tests |
| `pnpm typecheck` | Vérifier les types |
| `pnpm build` | Construire l'application |
| `pnpm start` | Lancer la version construite, comme en production |
| `pnpm exec electron-builder` | Créer l'installable (dans `release/`) |

Pensez à tester de temps en temps avec `pnpm build && pnpm start` : le mode
développement et le mode production ne servent pas l'interface de la même
façon.

---

## Organisation

```
packages/   le socle : on y touche peu
  main/       démarre l'app, charge les plugins, et les relie entre eux
  renderer/   l'interface : pages, menus, thème
  sdk/        les outils pour écrire un plugin
plugins/    vos fonctionnalités, un dossier par plugin
```

---

## Créer une fonctionnalité : la démarche

### 1. Un plugin par fonctionnalité

Un plugin regroupe tout ce qui concerne une fonctionnalité :

- **son contrat** : la liste de ce qu'on peut lui demander (les *requêtes*) et
  de ce qu'il annonce de lui-même (les *événements*) ;
- **son backend** : le code qui a besoin du système (réseau, fichiers,
  matériel…) ;
- **son composable** : ce que l'interface utilise pour lui parler.

Une fois le plugin écrit, on le déclare dans le `package.json` racine et on
l'ajoute à la liste de `packages/main/src/plugin-registry.ts`. Il reste à
l'utiliser depuis une page de l'interface.

Le guide pas à pas est dans [plugins/README.md](plugins/README.md).

### 2. Relier les plugins : le mediator

Un plugin ne connaît jamais les autres. C'est ce qui permet de le réutiliser
ailleurs.

Quand une fonctionnalité doit réagir à une autre (« quand A se produit, B
doit faire quelque chose »), la règle s'écrit dans un seul fichier :
[packages/main/src/app-wiring.ts](packages/main/src/app-wiring.ts), le
**mediator**. C'est la pièce centrale du projet : toutes les interactions
entre fonctionnalités y sont réunies, lisibles d'un coup d'œil.
