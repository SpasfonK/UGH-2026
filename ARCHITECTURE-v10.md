# Architecture V10

V10 corrige la déficience n°1 flaguée dans `CRITIC-v9.md` : l'absence de
tout post-traitement, qui laissait un éclairage correct mais plat.

## Ce qui change
`index.html` gagne un `<script type="importmap">` (obligatoire : les
modules d'addon Three.js `examples/jsm/postprocessing/*.js` importent
`three` en spécificateur nu, pas en URL complète — sans import map,
leur `import` échoue). `src/main.js` importe désormais Three.js via
`import * as THREE from "three";` au lieu de l'URL jsDelivr complète.

Pipeline de rendu (`main.js`) :
```
RenderPass(scene, cam)
  -> UnrealBloomPass(strength .55, radius .5, threshold .82)
  -> ShaderPass(grade + vignette maison)
  -> OutputPass()   (tone mapping ACES + espace sRGB, sinon la vignette
                      travaillerait sur une image non gradée)
```
`renderer.toneMapping = THREE.ACESFilmicToneMapping` est requis pour
qu'`UnrealBloomPass` fonctionne correctement (c'est documenté par
Three.js lui-même) — sans ça, l'éclairage direct sature en blanc avant
même d'atteindre le bloom, et tout se met à "blooming" uniformément.

## Pourquoi ça devrait marcher (vérifié, pas juste copié)
Les noms de fichiers et la syntaxe d'import (`three/addons/postprocessing/
EffectComposer.js`, `RenderPass.js`, `UnrealBloomPass.js`, `ShaderPass.js`,
`OutputPass.js`) ont été confirmés via la documentation officielle
threejs.org et le code source de l'exemple officiel
`webgl_postprocessing_unreal_bloom`, pas déduits de mémoire. Un fil de
support Three.js a aussi été consulté pour ses pièges connus (bloom qui
donne un écran blanc) : la cause y est systématiquement soit l'absence
d'`OutputPass`, soit un chargement via balise `<script src>` classique
au lieu d'un vrai import ES6 avec import map — les deux sont déjà
couverts ici.

## Rendre le bloom sélectif sans masque de calque
Plutôt qu'un système de calques bloom/non-bloom (plus complexe), les
seules zones qui dépassent le seuil de bloom (0.82) sont volontairement
rendues émissives : l'eau (cyan bioluminescent), la mousse des
plateformes, et les nouveaux rais de lumière additifs. Le reste de la
scène (roche, personnage, passager) reste sous le seuil et ne "bloome"
pas — c'est le réglage recommandé par la communauté Three.js pour ce
cas d'usage.

## Rais de lumière "volumétriques"
Un vrai rendu volumétrique (raymarching dans un froxel 3D) est hors de
portée pour ce budget sur une caméra orthographique fixe. À la place :
des plans en blending additif avec une texture en dégradé, positionnés
au premier plan (z=3.6, le plus proche de la caméra), dont l'opacité
"respire" lentement. En blending additif, ça n'occulte jamais le craft
ni les plateformes derrière — ça les éclaire, comme un vrai rayon de
soleil qui traverserait le cadre.

## Non vérifié en conditions réelles (voir CRITIC-v10.md)
Aucun de ces changements n'a pu être rendu dans un vrai navigateur
depuis cet environnement de développement (pas d'accès réseau sortant,
pas de navigateur disponible). La vérification s'est limitée à :
relecture manuelle ligne à ligne, `node --check` sur chaque module, et
confirmation des noms de fichiers/signatures d'API via la documentation
officielle Three.js. C'est un niveau de confiance correct, mais ce
n'est pas un test de rendu réel.
