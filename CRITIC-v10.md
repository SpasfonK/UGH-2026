# CRITIC V10

## Correction livrée
Pipeline de post-traitement complet : `EffectComposer` + `RenderPass` +
`UnrealBloomPass` + `ShaderPass` (vignette/grade maison) + `OutputPass`,
avec import map et tone mapping ACES. Matériaux eau/mousse rendus
émissifs pour donner du grain au bloom sans système de calques. Trois
rais de lumière additifs animés pour le "volumetric-style lighting" du
brief.

## Vérification effectuée
- `node --check` sur les 10 modules : syntaxe correcte.
- Chaque nom de fichier d'addon et chaque signature de constructeur
  (`UnrealBloomPass(resolution, strength, radius, threshold)`, ordre des
  passes, nécessité d'`OutputPass`, nécessité du tone mapping) a été
  confirmé contre la documentation officielle threejs.org et le code
  source de l'exemple officiel — pas déduit de mémoire d'entraînement,
  qui peut être fausse ou périmée sur un sujet aussi versionné.
- Un fil de support Three.js relatant les pièges classiques du bloom
  (écran blanc) a été consulté pour vérifier qu'aucun des pièges connus
  ne s'applique ici.

## Ce que cette vérification NE couvre PAS — alerte prioritaire
**Le jeu n'a jamais été rendu dans un vrai navigateur, à aucune
itération depuis V7.** Cet environnement de développement n'a ni accès
réseau sortant pour charger Three.js/WebGL, ni navigateur pour exécuter
et regarder le résultat. Tout ce qui précède (V8, V9, V10) a été
vérifié par lecture de code, vérification syntaxique et recherche
documentaire — jamais par un rendu réel à l'écran.

Ce n'était pas critique tant que les changements restaient de la
logique JS pure (particules, FSM, interpolation). Ça devient un vrai
risque maintenant : du GLSL personnalisé (le shader de vignette) et une
config WebGL plus riche (tone mapping, espace colorimétrique, import
map) sont des zones où une erreur (faute de frappe dans un nom
d'uniform, ordre de passes, valeur de seuil de bloom qui fait tout
"blooming" ou au contraire rien) ne se voit qu'à l'écran, jamais dans
une relecture de code ni dans `node --check`.

**Recommandation avant toute nouvelle itération visuelle** : servir
`ugh-remake-v10.zip` avec `npx serve .` (ou équivalent) et l'ouvrir
dans un vrai navigateur, une fois, pour confirmer que le bloom se
déclenche sur l'eau/les rais de lumière et pas sur toute la scène, et
qu'aucune erreur de console n'apparaît. Empiler une V11 purement
visuelle par-dessus une V10 jamais vue à l'écran ferait courir le
risque de complexifier un bug invisible en lecture de code plutôt que
de le corriger tôt.

## Autres manques connus (backlog, non bloquants)
- Un seul passager actif à la fois.
- Three.js encore chargé via CDN, pas vendorisé localement.
- Géométrie toujours primitive (dodécaèdres/cônes/capsules).
- Réglages de bloom (force 0.55, seuil 0.82) choisis par raisonnement,
  jamais ajustés à l'œil faute de rendu réel — à retoucher après le
  premier test navigateur.
