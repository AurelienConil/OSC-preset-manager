# Bilan : première implémentation sur le template Electron

Retour d'expérience de Claude sur la première version de la centrale OSC
(`SPEC.md`), écrite en autonomie sur le template. Mis à jour après le retrait
des plugins d'exemple et du transport IPC, puis après la correction d'une
faute de design du host (§4.2). Objectif : dire ce qui a
aidé, ce qui a coincé, et ce qu'on pourrait améliorer dans le template.

---

## 1. En résumé

- **Résultat** : le plugin `plugins/show` (show, presets, moteur de modulation,
  pin matrix, E/S OSC en UDP, horloge), 4 pages, le transport WebSocket
  permanent et un serveur HTTP pour le téléphone. Vérifié en dev et en prod,
  dans un navigateur, en largeur téléphone et avec de vrais paquets OSC.
- **Ensuite, avec ton accord** : retrait des plugins d'exemple (`osc`,
  `weather`), du transport IPC et du pont du preload ; la doc est mise à jour.
  Il y avait 112 tests avant : les 29 disparus étaient ceux des exemples.
- **Puis, sur ta proposition** : correction d'une faute de design du host.
  Chaque push d'un plugin partait systématiquement vers le GUI. Désormais rien
  n'y va sans une transmission explicite décidée par le mediator (§4.2).
  Typecheck, 87 tests et build sont verts.
- **Le template cadre bien** le *comment* : où mettre un fichier, comment le
  nommer, comment le tester, comment le valider. J'ai rarement hésité.
- **Il cadre moins le *quoi*** : découper en plugins, partager un état entre
  composants, travailler en temps réel. Là, j'ai dû inventer mes propres
  solutions, et une partie contourne le modèle prévu.
- **Note globale** : bonne expérience. Le cadre est clair et il fait gagner du
  temps. Ses limites viennent surtout d'hypothèses qui ne collent pas à ce
  projet : une application « formulaires + requêtes », avec IPC en production.

---

## 2. Comment j'ai procédé

1. **Lecture** : `SPEC.md`, `CLAUDE.md`, `plugins/README.md`, le SDK, le host,
   les deux plugins d'exemple (dans l'ordre conseillé dto → contract → manager
   → plugin → composable), puis le renderer.
2. **Vérification de la base** : `pnpm install` puis les tests du template
   (46 verts) avant de toucher à quoi que ce soit.
3. **Backend, du plus pur au plus concret** :
   1. DTO et contrat.
   2. Calculs partagés (`modulation.ts`).
   3. Encodeur et décodeur OSC (le décodeur est repris de l'exemple osc).
   4. Horloge, boucle à cadence fixe, limiteur de débit, pin matrix.
   5. `ShowDocument`, `ShowStore`, puis `ShowManager`.

   Chaque brique a ses tests. Ils ont trouvé un vrai bug : deux écritures du
   fichier show pouvaient se chevaucher.
4. **Host** : WebSocket permanent et serveur HTTP de l'UI.
5. **Interface** : état partagé, barre de transport, puis les 4 pages.
6. **Vérification** : typecheck, tests, build. Ensuite l'app lancée pour de
   vrai, testée dans Chrome (en dev puis en prod, en largeur téléphone) et avec
   de l'OSC réel envoyé et reçu en UDP.
7. **Nettoyage, après ton accord** : retrait des exemples et du code IPC, mise
   à jour de `CLAUDE.md`, du README et de `plugins/README.md`. Puis de nouveau
   typecheck, tests, build, et un démarrage de la version de production.

---

## 3. Ce qui a bien marché

| Élément du template | Pourquoi ça aide |
|---|---|
| `CLAUDE.md` (carte du dépôt, règles, procédures) | Je savais tout de suite où mettre chaque fichier et quelles règles respecter. La liste « avant de dire terminé » m'a obligé à aller jusqu'au bout. |
| Plugins d'exemple commentés | Une vraie référence : le décodeur OSC réutilisé tel quel, les tests sur une vraie socket UDP, la validation des données tierces. |
| Contrat zod comme source de vérité | Un seul fichier décrit l'API. Back et front sont typés ensemble, et une faute de frappe devient une erreur de compilation. |
| `PluginTestHarness` | Tester un plugin dans les mêmes conditions que dans le host, sans Electron. Très simple à utiliser. |
| Règle « ne pas `.parse()` le contrat, mais valider les données tierces » | Claire. Le fichier show lu sur disque est validé explicitement, avec un message lisible. |
| Manager sans SDK ni Electron, dépendances au constructeur | Le moteur se teste avec une fausse E/S OSC, une horloge pilotée à la main et des faux timers. |
| TypeScript strict + `noUncheckedIndexedAccess` | Il a attrapé des cas `null` / `undefined` réels dans l'UI. |
| Règles de style (aucun CSS dans les `.vue`) | Faciles à suivre. Toutes les classes sont au même endroit, et le thème clair / sombre a suivi sans effort. |

---

## 4. Ce qui a coincé (frictions)

### 4.1 Environnement

- **`pnpm` absent du PATH.** Il n'est accessible que via `corepack pnpm`. Or le
  script `typecheck` appelle lui-même `pnpm -r` : j'ai dû créer un petit
  raccourci `pnpm` temporaire. Le template ne vérifie pas son environnement.
- **La suppression des exemples (§5.1) a d'abord été bloquée.** En phase
  autonome, le mode automatique a refusé `git rm` (suppression jugée
  irréversible). La procédure §5.1 est une suite de suppressions manuelles :
  faite à la main, elle ressemble à une action destructrice. Elle n'est passée
  qu'avec ton accord explicite.
- **Retirer les exemples touche beaucoup de fichiers.** Il a fallu le code
  (registre, mediator, navigation, `package.json`) mais aussi trois documents.
  Surtout, `plugins/README.md` s'appuyait sur les exemples pour illustrer le
  guide : une fois les exemples partis, le guide renvoie vers du code qui
  n'existe plus. J'ai réécrit ces passages pour pointer vers `plugins/show`.
  La procédure §5.1 ne mentionnait pas ce fichier.

### 4.2 Faute de design : chaque push partait vers le GUI

**Le constat.** Dans le template, un plugin qui appelle `context.push(...)`
déclenchait toujours deux choses à la fois, dans `PushHub.publish()` :

1. la diffusion du message à **tous les clients GUI** (WebSocket) ;
2. la remise du message aux écouteurs de main, dont le mediator.

Aucune option ne permettait de faire l'un sans l'autre. Or le mediator n'a
pas d'autre moyen d'apprendre qu'un événement a eu lieu dans un plugin. Donc
**tout ce qu'un plugin signalait à un autre traversait aussi le réseau
jusqu'au GUI**, même si aucune vue ne l'écoutait : le client recevait le
message, le décodait, puis l'ignorait.

**Pourquoi c'est une faute de design, et pas un simple réglage.**
- **Le plugin décidait de fait pour l'application.** Un push est l'API publique
  d'un plugin : le guide dit qu'un plugin ne doit jamais présumer qui
  l'écoute. Pourtant, publier un push revenait à décider que le GUI le
  recevrait. Qui reçoit quoi est une décision d'application, donc du mediator.
- **Deux usages incompatibles partageaient un seul canal** : informer
  l'interface (rare, petit volume) et faire circuler des événements entre
  plugins (potentiellement très fréquents).
- **Le coût sautait aux yeux en temps réel.** Avec un plugin `osc-io` séparé,
  chaque message OSC reçu (jusqu'à 100 Hz par fader) aurait été sérialisé en
  JSON et envoyé à la fenêtre Electron et au téléphone. La spec (§9) demande
  exactement l'inverse : un back-end à pleine vitesse, un GUI alimenté par un
  flux allégé.

**Ce que j'ai fait à l'époque, et pourquoi c'était une erreur de ma part.**
Au lieu de remettre en cause le host, je l'ai contourné : j'ai mis tout le
cœur (E/S OSC, horloge, moteur, presets) dans **un seul plugin**, `show`, et
laissé le mediator vide. Ça marche, mais :
- le système de plugins ne sert presque plus à rien dans ce projet ;
- je n'ai pas identifié la cause précise. Dans ma première explication, j'ai
  même écrit que « le mediator envoie au GUI » : c'était faux, le mediator ne
  fait qu'écouter, c'est le push lui-même qui partait vers le GUI ;
- j'ai mélangé ce problème avec d'autres raisons (coût de la validation zod,
  état partagé, atomicité), ce qui rendait le diagnostic flou.

**La correction (proposée par toi, implémentée ensuite).**
- `PushHub` remet chaque push aux écouteurs de main, et ne le diffuse au GUI
  **que si le mediator l'a demandé**. C'est la nouvelle classe
  `plugin-host/gui-forwarding.ts`, exposée comme `host.gui`.
- Par défaut, **rien n'est transmis**. Le mediator déclare chaque push destiné
  à l'interface dans une règle dédiée, par exemple :

  ```ts
  export function forwardShowToGui(gui: Pick<GuiForwarding, 'forward'>): void {
    gui.forward(showContract, 'snapshot', 'paramStateChanged', 'transportChanged', 'liveFrame')
  }
  ```

- **Le risque de ce choix** : un oubli laisse une vue figée, sans erreur. Il est
  couvert par deux garde-fous :
  - un avertissement unique en console quand un push n'atteint personne (ni
    transmis, ni écouté dans main) ;
  - un test dans `app-wiring.test.ts` qui vérifie que les pushes transmis sont
    exactement ceux du contrat. Ajouter un push à `show` sans le transmettre
    fait échouer le test.
- `forward` refuse un plugin non chargé ou un push non déclaré (erreur au
  démarrage plutôt que silence).

**Ce que la correction ne règle pas.** Découper le chemin critique en
plusieurs plugins reste discutable pour deux raisons indépendantes du GUI :
- **l'état partagé lu à chaque tick** : le moteur lit l'horloge, le preset
  actif et la pin matrix toutes les ~16 ms. Entre plugins, il faudrait des
  requêtes asynchrones ou des copies synchronisées ;
- **l'atomicité du rappel de preset** : paramètres, pin matrix et origine du
  cycle doivent changer d'un coup. Via le mediator, plusieurs requêtes
  asynchrones laisseraient un état incohérent pendant un tick.

Le coût de la validation zod entre plugins demeure aussi, mais n'a pas été
mesuré. Conclusion : garder le chemin critique dans `show`, et utiliser
désormais le mediator pour les plugins hors temps réel à venir (MIDI,
OSCQuery, export), qui peuvent maintenant échanger des événements sans
toucher au GUI.

**Ce que le template ne dit toujours pas** : comment choisir la taille d'un
plugin, et quand le mediator est inadapté.

### 4.3 Manques du SDK

| Besoin | Ce que j'ai dû faire |
|---|---|
| `setup` asynchrone (lire le show sur disque avant de servir) | Un `whenReady` maison qui fait attendre chaque handler. |
| Un état partagé entre composants | `useShow()` appelé dans chaque composant dupliquerait les abonnements et l'état. J'ai ajouté un provide / inject (`show-context.ts`). |
| Du code pur partagé entre back et front (calculs LFO et courbe pour les aperçus) | Un 5ᵉ export (`./modulation`), alors que la checklist en prévoit exactement 4. |
| Pousser peu de données souvent | Pas de notion de « patch » ni de push non validé : j'ai conçu moi-même snapshot + `paramStateChanged` + `liveFrame`. |

### 4.4 Le transport

- Le template part de « IPC en prod, WebSocket en dev seulement ». La spec
  impose le WebSocket partout (téléphone). J'ai dû modifier le host, ce qui
  devait être documenté comme une dérogation.
- Le transport WebSocket de dev n'était pas prêt pour la production. Ce que
  j'ai corrigé :
  - aucun gestionnaire d'erreur côté serveur (un port déjà occupé faisait
    planter main) ;
  - pas de reconnexion côté client ;
  - un message non-JSON faisait planter le client ;
  - aucune protection contre un client lent.
- Les fichiers IPC sont devenus du code mort. Ils ont été retirés avec les
  exemples, et le preload est maintenant vide.

### 4.5 Ambiguïtés des consignes

- **§5.2 contre ta demande** : §5.2 demande l'accord de l'utilisateur avant de
  coder un plugin, alors que tu m'avais demandé d'avancer en autonomie. J'ai
  suivi ta demande explicite, mais `CLAUDE.md` ne tranche pas ce conflit.
- **Pas de cadre pour tester les composants Vue** (rendu, interactions). Seule
  la logique pure du renderer est testée. Faute de tests end-to-end, j'ai
  vérifié l'interface « à la main » avec le navigateur.
- **Fichiers choisis par l'utilisateur** : `PathProvider` confine tout sous
  `userData`. La spec veut un fichier show versionnable (git), donc idéalement
  choisi par l'utilisateur, ce qui suppose une capacité « dialogue de fichier »
  (§5.5) qui n'existe pas encore.

---

## 5. Mes propres limites sur cette version

À relire en connaissance de cause :

- **Doc incomplète au premier passage** : j'avais laissé deux mentions de
  l'IPC dans `CLAUDE.md` (§1 et §3). Elles sont corrigées depuis.
- **Points ouverts de la spec tranchés seul**, et provisoires :
  - le transport continue de tourner au changement de preset ;
  - un seul LFO par paramètre ;
  - pas de mode keyframe ni de type point 2D ;
  - créer ou dupliquer un preset ne le rappelle pas.
- **Valeurs fixes émises une seule fois** (au rappel ou au changement). Un
  logiciel cible qui redémarre ne les reçoit pas tant qu'on ne rappelle pas le
  preset.
- **Débit non mesuré** :
  - le jitter réel n'a pas été mesuré (la boucle vise des échéances absolues,
    sans chiffres) ;
  - un `paramStateChanged` renvoie toute la courbe (256 points) à chaque
    modification ;
  - le serveur peut ignorer un push destiné à un client trop lent, y compris
    un snapshot.
- **Sécurité** : aucune authentification sur le WebSocket ni sur l'UI
  distante.
- **Pas encore fait** : Ableton Link, l'enregistrement de geste, OSCQuery, le
  déclenchement des presets au clavier ou en MIDI.
- **Rien n'est commité.**

---

## 6. Suggestions d'amélioration du template

Par ordre d'impact estimé :

1. **Remplacer la suppression manuelle des exemples par un script.** Une seule
   commande relue (`pnpm remove-examples`), ou alors des exemples livrés sur
   une branche séparée. Plus fiable qu'une procédure en 8 étapes, et plus
   facile à autoriser qu'une série de suppressions. Découpler aussi
   `plugins/README.md` des exemples : le guide doit rester lisible quand ils
   ne sont plus là (son exemple `counter` suffit).
2. **Rendre le transport configurable** (`ipc`, `ws` ou les deux) au lieu de le
   coder en dur selon dev / prod. Durcir `WsHostTransport` /
   `WsClientTransport` pour la production :
   - gestionnaires d'erreur ;
   - reconnexion côté client, avec resynchronisation ;
   - protection contre les clients lents ;
   - authentification optionnelle (jeton dans l'URL affichée en QR code, par
     exemple).
3. **Séparer « informer le GUI » et « informer les autres plugins ».** C'est
   fait dans ce projet (§4.2) : à remonter dans le template lui-même, avec la
   transmission explicite par le mediator et ses deux garde-fous. Ajouter
   aussi une section « Granularité des plugins et temps réel » à
   `plugins/README.md` : quand découper, quand regrouper, et pourquoi l'état
   partagé et l'atomicité gardent le chemin critique dans un seul plugin.
4. **Étendre le SDK** :
   - `setup` asynchrone (le host attend la promesse avant de servir) ;
   - un helper de **store partagé** côté frontend (un abonnement unique, fourni
     à toute l'app) ;
   - autoriser officiellement un export « partagé » pur (`./shared`) dans la
     checklist.
5. **Ajouter une capacité « dialogues de fichiers »** (§5.5) pour ouvrir et
   enregistrer un fichier choisi par l'utilisateur, en gardant les plugins sans
   chemin absolu (jeton opaque, par exemple).
6. **Fournir un socle de tests renderer** (`@vue/test-utils` + happy-dom) et un
   smoke test end-to-end (Playwright pour Electron), pour vérifier l'UI
   autrement qu'à la main.
7. **Préciser la règle d'accord dans `CLAUDE.md`** : « lister les fichiers et
   demander l'accord, *sauf si l'utilisateur a demandé d'avancer en
   autonomie* ».
8. **Vérifier l'environnement** :
   - `"packageManager": "pnpm@x.y.z"` dans le `package.json` racine ;
   - un mot sur `corepack enable` dans `CLAUDE.md` §1 ;
   - éviter que les scripts appellent `pnpm` en dur.
9. **Ajouter un mode de tâche « produit unique »** : quand un projet se résume
   à un gros plugin (comme ici), expliquer comment organiser ses sous-dossiers
   (`show/`, `engine/`, `clock/`, `osc/`). C'est ce que j'ai improvisé.

---

## 7. Prochaines étapes proposées pour le projet

1. ~~Retirer les exemples et le code IPC mort, corriger `CLAUDE.md`.~~ Fait.
   ~~Ne plus envoyer les pushes au GUI par défaut.~~ Fait.
2. Commiter l'état actuel.
3. Trancher les points ouverts de la spec listés en §5.
4. Ableton Link, en implémentant `TransportClock` avec un module natif (§5.6).
5. Déclencher les presets au clavier et en MIDI.
6. Mesurer la latence et le jitter de sortie, puis fixer les valeurs chiffrées
   de limitation de débit (spec §9).
