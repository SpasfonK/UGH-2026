# Architecture V8

V8 remplace le fichier unique de V7 par un projet modulaire ES modules,
chargé directement par le navigateur sans étape de build (pas de bundler
nécessaire — `index.html` importe `src/main.js`, qui importe le reste).

```
index.html            shell HTML/CSS : menu, HUD, joysticks tactiles
src/constants.js       tuning physique + gameplay, pas fixe
src/audio.js           AudioEngine : SFX procéduraux + drone d'ambiance
src/particles.js       pool de particules avec intégration physique réelle
src/world.js           matériaux texturés procéduraux + génération de niveau + eau
src/craft.js           appareil du joueur (caveman + rotor)
src/passengers.js       FSM passager (WAIT / CARRY / DELIVERED)
src/input.js            clavier + double joystick tactile
src/camera.js           suivi + shake d'impact réel
src/game.js             état MENU/PLAY/PAUSE/LEVEL/GAME_OVER/WIN, boucle physique, HUD
src/main.js             bootstrap Three.js, câblage des modules, boucle de rendu
```

Pipeline par frame (`main.js`) :
```
requestAnimationFrame
  -> pas fixe 1/120s tant que l'accumulateur le permet (game.update)
       -> input -> physique -> collisions -> FSM passager -> audio -> score
  -> particles.update(frame)      (rendu, pas fixe)
  -> water.animate(t)             (rendu, pas fixe)
  -> camera.update(frame, ...)    (suivi + shake, rendu, pas fixe)
  -> renderer.render(scene, cam)
```

## Corrections V8 par rapport à V7
1. Débris de crash réellement animés (gravité + drag + fondu), au lieu de
   sphères statiques.
2. Poussière d'atterrissage, éclaboussures et souffle de rotor : trois
   émetteurs de particules réels qui n'existaient pas en V7.
3. Stamina : ne se recharge plus qu'au sol (`docked === true`), plus en
   l'air.
4. Caméra : micro-shake réellement implémenté (déclenché sur crash et
   atterrissage dur), pas seulement documenté.
5. Matériaux rocheux/mousse texturés via canvas procédural (plus de
   couleurs plates).
6. Audio enrichi : bruit blanc filtré pour crash/éclaboussure, grognement
   de pédalage à deux oscillateurs détunés, drone d'ambiance à deux
   oscillateurs + LFO de filtre + gouttes d'eau aléatoires, flutter de
   rotor continu dont l'intensité suit le pédalage.
7. Découpage en 10 modules ES documentés, dépendances injectées
   explicitement (plus de variables globales cachées).

## Dette technique assumée, listée honnêtement
- Pas d'interpolation de rendu entre deux pas physiques fixes (voir
  `CRITIC-v8.md`, déficience n°1 à corriger en priorité).
- Pas de post-traitement (bloom/vignette) : l'éclairage reste un
  Hemisphere + un Directional light, loin du rendu "volumétrique"
  demandé.
- Three.js est toujours chargé depuis jsDelivr (pas de vendoring local
  possible dans cet environnement, qui n'a pas d'accès réseau sortant
  pour télécharger le module ~1 Mo en toute sécurité).
- Un seul passager actif à la fois (fidèle à l'original 1992, mais pas
  à la richesse d'un "premium taxi economy" moderne).
