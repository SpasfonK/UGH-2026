# CRITIC V8

## Corrections livrées et vérifiées (pas seulement déclarées)
- Débris de crash : `node --check` sur `particles.js` + relecture manuelle
  confirment une vraie boucle d'intégration (`vel.y -= gravity*dt`,
  `position.addScaledVector(vel, dt)`, fondu d'opacité). Corrige le bug
  V7 documenté dans `CRITIC-v7-audit.md`.
- Poussière d'atterrissage / éclaboussure / souffle de rotor : trois
  émetteurs distincts, branchés aux bons événements dans `game.js`
  (atterrissage, contact eau, pédalage proche du sol).
- Stamina : la recharge est conditionnée à `docked === true`, positionné
  uniquement lors d'un atterrissage réussi et remis à `false` dès que
  l'appareil quitte la plateforme (pédalage ou chute).
- Caméra : `cameraRig.shake()` est appelé avec des valeurs différentes
  selon crash (0.45/0.3s) et atterrissage dur (0.12/0.15s), et décroît
  réellement frame par frame.
- Audio : vérifié à la lecture que `crash()`/`splash()` utilisent bien un
  `AudioBufferSourceNode` sur bruit blanc filtré, pas un oscillateur seul.

## Statut
Itération de fond solide, mais **PAS un candidat de sortie**. Le jeu
reste, par construction de cette session, plus proche d'un "vertical
slice" cohérent que du standard "release indie 2026" demandé dans le
brief d'origine.

## Déficience n°1 à corriger en priorité (renvoyée au Builder)
**Il n'y a pas d'interpolation de rendu entre deux pas de simulation
fixes.** La boucle (`main.js`) accumule du temps et exécute des pas de
1/120s, mais `renderer.render()` est appelé avec la position brute du
dernier pas exécuté — sans interpoler entre l'état précédent et l'état
courant selon le reste de l'accumulateur (`alpha`). Sur un écran 90/120Hz
qui ne tombe pas rigoureusement sur un multiple de 120, ou après un
`guard` de rattrapage, ça peut produire un micro-jitter visuel — exactement
ce que le cahier des charges désigne par "silky smooth 60/120 FPS
interpolation". C'est un défaut hérité de V7, jamais corrigé jusqu'ici.
Correction attendue à l'itération suivante : conserver `prevPosition`/
`curPosition` (et `prevTilt`/`curTilt`) du craft à chaque pas fixe, puis
faire `renderPos = lerp(prev, cur, accumulator/FIXED_DT)` juste avant
`renderer.render()`.

## Autres manques connus, non bloquants mais réels (backlog)
- Aucun post-traitement (bloom/vignette) : l'éclairage "volumétrique"
  du brief n'est pas encore là.
- Three.js encore chargé via jsDelivr, pas vendorisé localement.
- Un seul passager actif à la fois.
- Géométrie toujours primitive (dodécaèdres/cônes/capsules) : le style
  "low-poly stylisé" est défendable, mais on est loin du niveau
  d'exécution Trine/Rayman Legends visé par le brief.

## QA à refaire avant toute prétention "release candidate"
Chrome Android, Safari iOS, clavier desktop 60/120 Hz, portrait/paysage,
reprise après mise en arrière-plan — comme demandé en V7 et jamais
formellement rejoué depuis (aucune trace de session de test dans les
livrables reçus).
