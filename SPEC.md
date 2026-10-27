# Cahier des charges fonctionnel — Centrale de contrôle OSC live

Oct 16, 2026 · @Someone

## 1. Vision et objectifs

L'application est une centrale de contrôle OSC (Open Sound Control) pour le spectacle vivant : elle pilote en direct des logiciels vidéo et audio, et gère à leur place tous les presets.

Ces logiciels cibles n'ont presque aucun preset interne : ce sont des coquilles vides, pilotables par des sliders OSC. Toute l'intelligence (états, courbes, oscillateurs, enchaînement des scènes) vit donc dans cette application.

- Recevoir et envoyer de l'OSC, dans les deux sens.
- Relier des entrées et des sorties OSC via une pin matrix.
- Définir, pour chaque paramètre, une valeur fixe, une courbe ou un oscillateur.
- Regrouper tout cela dans des presets globaux, rappelés instantanément pendant le live.
- Offrir une interface riche et lisible, utilisable aussi bien sur l'ordinateur que sur un téléphone.
- Garantir une latence et un jitter minimaux sur les messages OSC envoyés.

## 2. Vocabulaire

Ces termes sont employés partout dans le document et dans l'interface. Le mot « preset » désigne toujours un méga-preset.

| Terme | Définition |
| --- | --- |
| Show | Un fichier JSON unique qui correspond à un spectacle : déclaration du setup et ensemble des presets. |
| Preset (méga-preset) | État global complet : pin matrix, mode et réglage de chaque paramètre, visibilité des paramètres. Rappelé en une action. |
| Preset 0 | État neutre, sans preset : tous les paramètres sont visibles et réglables librement. Point de départ de tout nouveau preset. |
| Paramètre | Une valeur OSC pilotable, déclarée avec son type, son min, son max, une description et des mots-clés. |
| Pin matrix | Table qui relie des entrées OSC à des sorties OSC. |
| Valeur fixe | Mode d'un paramètre : une valeur constante (nombre ou texte). |
| Courbe | Mode d'un paramètre : une forme jouée en boucle sur la durée du preset. |
| Oscillateur | Mode d'un paramètre : un oscillateur intégré qui génère la valeur. |
| Transport | Play, stop et tempo globaux, synchronisés via Ableton Link. |
| Groupe | Niveau de la hiérarchie des adresses OSC (par exemple toto, ou toto/titi). Un groupe contient des paramètres et d'autres groupes. |
| Page de gestion des presets | Page où l'on duplique, réordonne et supprime les presets, et où l'on peut gérer les ports OSC. |
| Port OSC | Port d'entrée ou de sortie OSC. Fixé pour toute la durée du show. |

## 3. Communication OSC

L'application reçoit et envoie de l'OSC. Le mapping des messages se fait dans le back-end, avec le minimum de latence et de jitter.

- **Réception** : l'application écoute des messages OSC entrants et peut les relier à des sorties via la pin matrix.
- **Envoi** : chaque paramètre actif émet ses valeurs vers le logiciel cible (vidéo ou audio).
- **Déclaration des messages** : chaque message OSC est décrit exactement, avec son adresse et son type. Cette déclaration se fait dans la partie setup du show.
- **Automatisation de la déclaration** : on cherche à générer cette liste automatiquement, par exemple avec OSCQuery, plutôt que de la saisir à la main. Le moyen exact reste à valider (voir points ouverts).
- **Sorties multiples** : plusieurs sorties OSC sur plusieurs ports sont envisageables, mais ne sont pas prioritaires pour la première version.

### Adresses et ports

- Une adresse OSC est un chemin hiérarchique séparé par des barres obliques, par exemple `toto/param1` ou `toto/titi/tata`.
- Les ports OSC sont fixés pour le show : ils ne changent jamais en cours de route. Ils sont enregistrés dans le show et gérés depuis la page de gestion des presets (à confirmer).

## 4. Page Pin Matrix

Une page dédiée permet de relier une entrée OSC à une sortie OSC. La configuration de la pin matrix fait partie de chaque preset : passer d'un preset à l'autre change donc aussi les liaisons actives.

Le détail de l'ergonomie (affichage en grille, filtrage, création rapide d'une liaison) reste à définir.

## 5. Page Paramètres

Cette page affiche les paramètres du preset courant. Pour chacun, on choisit comment il est piloté.

| Mode | Comportement |
| --- | --- |
| Valeur fixe | Une valeur numérique ou une chaîne de texte, saisie directement. |
| Courbe | Une forme dessinée, enregistrée ou éditée, jouée en boucle sur la durée du preset (voir section 6). |
| Oscillateur | Un oscillateur intégré dont les réglages sont visibles et modifiables. |
| Keyframe (à confirmer) | Une liste de points (temps, valeur) reliés par interpolation lisse, bouclée sur la durée du preset. Existe dans le projet OpenFrameworks. |

### Composant d'affichage d'un paramètre

C'est un point de conception central : chaque paramètre est affiché par un composant dédié, qui s'adapte à son mode.

- Nombre ou texte pour une valeur fixe.
- Aperçu de courbe, éditable dans une fenêtre modale.
- Aperçu de l'oscillateur lié, avec ses réglages.

La page propose aussi un filtrage des paramètres affichés (par nom, mot-clé, type), grâce aux descriptions et mots-clés déclarés dans le show.

### Acquis du projet OpenFrameworks (ofxGuiModulator)

Ton addon existant sert de référence fonctionnelle. Chaque paramètre y est remplacé par un contrôle à cinq modes : valeur fixe, LFO 1, LFO 2, keyframe et courbe. Tout l'état est sauvegardé en preset. Voici ce qu'on en reprend.

- **Types de paramètres** : nombre décimal, entier (valeurs en paliers), booléen (bascule) et point 2D (pavé X/Y). Le booléen utilise les mêmes modes, mais en marches d'escalier au lieu d'interpoler.
- **Deux oscillateurs par paramètre**, réglés indépendamment : forme d'onde (sinus, dent de scie, triangle, carré, aléatoire échantillonné), fréquence, décalage de phase, amplitude et décentrage.
- **Fréquence toujours synchronisée** au cycle du transport, exprimée en rapport (x2, x4, /2, /4…), jamais en valeur libre.
- **Oscillateur en pourcentage** : il produit une valeur de 0 à 100 %, mise à l'échelle sur le min et le max du paramètre au moment de l'envoi. Pour un entier, la valeur est arrondie.
- **Courbe** : 256 points normalisés, enregistrables à la souris, avec comblage automatique des trous. L'action « effacer » remet la courbe à 50 %.
- **Keyframe** : points déplaçables, interpolation lisse et circulaire (le dernier point rejoint le premier sans saut).
- **Repli d'un contrôle** : un second clic sur le mode actif masque l'éditeur sans changer le mode, utile quand il y a beaucoup de paramètres.
- **Source de phase abstraite** : l'horloge est fournie par l'extérieur, ce qui permet de remplacer l'horloge de test par Ableton Link sans toucher au reste.

Le projet OpenFrameworks contient aussi une banque de poses de caméra à 10 emplacements. On ne la reprend pas dans la première version, sauf si tu me le demandes.

### Groupes et hiérarchie

La hiérarchie des adresses OSC définit naturellement des groupes. Avec `toto/param1` et `toto/titi/tata`, `toto` est un groupe qui contient `param1` et le sous-groupe `toto/titi`, lui-même contenant `tata`.

Le logiciel connaît cette structure :

- un clic sur un groupe n'affiche que les paramètres de ce groupe ;
- un fil d'Ariane permet de remonter d'un niveau ou de revenir à la vue complète ;
- ce découpage complète le filtrage par nom et par mot-clé.

On peut aussi se servir des groupes dans la pin matrix (à confirmer).

## 6. Courbes, transport et Ableton Link

Chaque courbe fonctionne comme un clip Ableton Live : elle a une durée en temps et se joue sur une grille rythmique, sous le contrôle d'un transport global.

### Création d'une courbe

- **Dessin à la souris** : tracé libre dans un éditeur de courbe.
- **Enregistrement** : on enregistre un geste manuel (slider à la souris, contrôleur MIDI) qui devient la courbe du paramètre de sortie. Les modalités exactes (déclenchement, quantification) restent à préciser.
- D'autres méthodes (points de contrôle, formule) sont envisageables plus tard.

### Durée

Pour la première version, toutes les courbes d'un même preset ont la même durée : **4, 8 ou 16 temps**, choisie par preset. Toutes les courbes démarrent et bouclent donc en même temps.

### Transport global

- Un seul transport pour toute l'application, avec play, stop et tempo.
- Le tempo et la synchronisation viennent d'Ableton Link, géré dans le back-end.

### Changement de preset

Quand on change de preset, toute la mécanique se réinitialise et tout repart de zéro : les courbes repartent immédiatement du temps 1, sans quantification de lancement. Le comportement du transport lui-même à ce moment (continue-t-il de tourner et reste-t-il calé sur Link, ou redémarre-t-il ?) est à confirmer.

## 7. Presets

Un preset capture l'état complet de l'application et se rappelle en une action, de façon instantanée, sans crossfade.

Ce qu'un preset enregistre :

- la configuration de la pin matrix ;
- le mode et le réglage de chaque paramètre (valeur fixe, courbe dessinée avec ses valeurs, oscillateur et ses réglages) ;
- la durée des courbes (4, 8 ou 16 temps) ;
- la visibilité des paramètres, pour masquer ceux qui encombrent l'écran dans ce preset.

### Preset 0

Le preset 0 est le moment sans preset : tous les paramètres sont visibles et réglables librement. Un nouveau preset se crée toujours à partir du preset 0, qui contient l'ensemble des paramètres déclarés.

La façon de déclencher un preset en live (clavier, MIDI, écran tactile) et l'éventuel historique d'annulation restent à définir.

### Page de gestion des presets

Une page dédiée liste tous les presets. Chaque preset possède un numéro (son index), un nom et une description.

- **Dupliquer** un preset.
- **Changer l'ordre** des presets, ce qui modifie leur numéro d'index.
- **Supprimer** un preset.

Cette page peut aussi servir à gérer les ports OSC du show. Ils sont fixés une fois pour toutes pour le spectacle.

## 8. Fichier show (JSON)

Un seul fichier JSON correspond à un spectacle. Il contient deux grandes parties.

| Partie | Contenu |
| --- | --- |
| Déclaration du setup | La liste des paramètres pilotables. Pour chacun : type, valeur min, valeur max, description, mots-clés. Elle inclut les messages OSC avec leur type. |
| Presets | Pour chaque preset : pin matrix, mode de chaque paramètre, tableau de valeurs des courbes, réglages des oscillateurs, visibilité des paramètres. Chaque preset pioche dans les paramètres déclarés. |

Tous les presets sont enregistrés dans ce fichier unique, ce qui facilite la sauvegarde et le versionnage.

Les ports OSC sont fixés pour le show : ils sont donc déclarés dans la partie setup, et non dans les presets.

## 9. Performance et limitation de débit

Des valeurs OSC qui fluctuent très vite ne doivent ni saturer l'interface ni la faire ramer. La limitation du débit fait donc partie des fondations du produit, pas d'une optimisation tardive.

1. **Étage back-end** : limitation de la bande passante sur l'OSC entrant, réglable par paramètre.
2. **Étage GUI** : le flux envoyé vers l'interface est filtré pour que l'affichage ne subisse pas tout le débit du back-end, afin d'éviter lags et retards.

Le back-end continue de traiter à pleine vitesse ce qui doit l'être ; seul l'affichage est allégé. Les valeurs chiffrées (fréquence maximale par paramètre, cadence d'affichage) restent à définir.

## 10. Contrôle multi-clients

L'interface doit fonctionner à la fois dans la fenêtre de l'application et sur un téléphone. Pour cela, le back-end est piloté par WebSocket, et non par IPC.

- Le WebSocket est utilisé en permanence, en développement comme en production.
- Plusieurs clients peuvent se connecter en même temps (fenêtre Electron, navigateur du téléphone).
- Cette décision déroge à la règle actuelle du template, qui réserve le WebSocket au développement et au debug et utilise l'IPC en production. La dérogation sera documentée dans le cahier des charges technique.

## 11. Hors périmètre v1, points ouverts et suite

### Hors périmètre pour la première version

- Sorties OSC multiples sur plusieurs ports.
- Crossfade entre presets (les presets sont instantanés par choix).
- Durées de courbe différentes au sein d'un même preset.

### Points ouverts

- Comportement du transport au changement de preset (il continue ou redémarre, avec Link).
- Déclenchement des presets en live (clavier, MIDI, tactile) et historique d'annulation.
- Modalités de l'enregistrement d'une courbe (déclenchement, quantification, source du geste).
- Faisabilité de l'automatisation de la déclaration des messages par OSCQuery.
- Valeurs chiffrées de limitation de débit à chaque étage.
- Ergonomie détaillée de la pin matrix.

* Garde-t-on le mode Keyframe et les deux oscillateurs par paramètre, comme dans le projet OpenFrameworks ?
* Quels types de paramètres supporter en v1 (décimal, entier, booléen, point 2D, texte) ?
* Dans le projet OpenFrameworks, la durée de cycle est globale ; ici elle devient un réglage par preset (4, 8 ou 16 temps).

### Prochaines étapes

1. Partager le projet OpenFrameworks existant comme base de référence.
2. Lire le README du template Electron.
3. En tirer un cahier des charges technique qui s'appuie sur ce que le template permet déjà.
