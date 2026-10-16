# Electron Workflow Template

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
développement et le mode production ne communiquent pas de la même façon
en interne.

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

---

## Les plugins d'exemple (à supprimer)

Le template est livré avec deux plugins **d'exemple**, visibles dans la page
« Exemple » de l'application :

- **osc** : reçoit des messages OSC (protocole réseau courant en musique et en
  arts numériques). On choisit le port, puis on démarre et on arrête le
  serveur depuis l'interface.
- **weather** : affiche la température du jour d'une ville, via l'API
  gratuite Open-Meteo.

Le mediator contient une règle d'exemple qui les relie : un message OSC
`/weather/city "Lyon"` change la ville affichée par la météo. Pour essayer,
démarrer le serveur OSC sur le port 9000, puis envoyer ce message depuis
n'importe quel outil OSC (TouchOSC, Max, Pure Data…).

Un exemple, ce n'est pas seulement le dossier du plugin : son interface (la
page « Exemple » et ses cartes, dans `packages/renderer/src/pages/`) et la
règle du mediator en font aussi partie. Tous ces fichiers sont marqués
`EXAMPLE` en tête.

Ces exemples sont commentés en détail : lisez-les pour comprendre la
démarche, puis **supprimez-les** quand votre premier plugin existe. Il faut
alors aussi vider le mediator de la règle d'exemple. La liste exacte des
fichiers à retirer est dans [CLAUDE.md](CLAUDE.md), §5.1.
