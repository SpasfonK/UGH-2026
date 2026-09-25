# Architecture V9

V9 corrige la déficience n°1 flaguée dans `CRITIC-v8.md` : l'absence
d'interpolation de rendu entre deux pas physiques fixes.

## Le problème exact
En V8, `game.js` lisait et écrivait directement `craft.position.x/y` et
`craft.rotation.z` pendant la physique (pas fixe 1/120s), et `main.js`
appelait `renderer.render()` avec cette valeur brute. Deux soucis :
1. Aucune interpolation entre deux pas fixes : le rendu affiche
   toujours l'état du *dernier* pas simulé, jamais un état intermédiaire
   cohérent avec le temps réel écoulé — source de micro-jitter,
   surtout sur les écrans dont le taux de rafraîchissement n'est pas un
   multiple propre de 120 Hz.
2. Plus profondément : simulation et rendu étaient **confondus sur le
   même Object3D**, ce qui rendait toute interpolation propre impossible
   sans risquer de corrompre la physique elle-même (interpoler la
   position rendue reviendrait, si on l'écrit dans `craft.position`, à
   fausser le point de départ du pas physique suivant).

## La correction
`game.js` ne touche plus jamais `craft.position`/`craft.rotation`
pendant la physique. L'état autoritatif vit dans de simples nombres
(`px`, `py`, `tilt`), utilisés pour toute la physique/collision. À
chaque pas fixe, un couple `{prev*, cur*}` est mis à jour (via un bloc
`try/finally` qui garantit la synchronisation même sur les sorties
anticipées : crash, livraison de passager...).

`main.js` lit ce couple une fois par frame de rendu via
`game.getTransform()`, calcule `alpha = accumulator / FIXED_DT`
(clampé à 1 en cas de rattrapage sévère), et c'est LUI — seul point du
projet à le faire désormais — qui écrit la valeur interpolée dans
`craftParts.group.position`/`rotation` juste avant `renderer.render()`.
La caméra suit ensuite cette position déjà interpolée.

## Téléportations (crash, changement de niveau)
Un cas particulier devait être traité explicitement : sans précaution,
interpoler entre la position d'avant un crash et la position de
réapparition produirait un "glissement" visuel à travers tout le
niveau pendant une frame. `resetCraft()` — point unique de
téléportation du craft — resynchronise donc `prev` ET `cur`
immédiatement sur la nouvelle position, ce qui annule l'interpolation
pour cette frame précise (le craft apparaît instantanément à sa
position de réapparition, sans glisser). Cette fonction est appelée à
la fois depuis l'intérieur d'un pas physique (crash) et depuis un
`setTimeout` totalement extérieur au cycle physique (avancée de niveau
après livraison d'un passager) : elle se resynchronise donc elle-même
sans dépendre du `try/finally` de `update()`.

## Ce qui n'est délibérément PAS interpolé
La rotation du rotor et l'oscillation des jambes de pédalage restent
appliquées directement sur l'Object3D à chaque pas fixe, sans
interpolation. Ce sont des animations cosmétiques cycliques (le rotor
tourne vite, l'œil ne distingue pas un stepping à 120 Hz sur une pièce
qui tourne déjà en flou) ; leur interpoler l'angle demanderait de gérer
le wrap-around pour un bénéfice visuel proche de nul. Seuls la position
et l'inclinaison du corps du craft — ce qui affecte réellement la
lisibilité du pilotage — sont interpolées.
