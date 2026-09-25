# CRITIC V9

## Correction livrée et vérifiée
La déficience n°1 de `CRITIC-v8.md` (pas d'interpolation de rendu entre
pas physiques fixes) est corrigée, et vérifiée par relecture complète —
pas seulement déclarée :
- `grep "craft\."` dans `game.js` confirme qu'il ne reste plus qu'une
  seule lecture de `craft.position` (le seed initial de `px`/`py` à la
  création du module) ; plus aucune écriture pendant la physique.
- Les quatre points d'appel de particules qui prenaient auparavant
  `craft.position` prennent maintenant `simPos`, un `Vector3` mis à
  jour depuis `px`/`py` — donc toujours la position physique
  autoritative, jamais la position visuelle interpolée (c'est
  volontaire : un effet doit naître à l'endroit réel de l'événement).
- Le chemin de téléportation (`resetCraft`) a été tracé pour les deux
  cas d'appel possibles : synchrone (crash, à l'intérieur d'un pas
  physique) et asynchrone (`setTimeout` après livraison, hors de tout
  pas physique) — les deux resynchronisent `prev`/`cur` correctement,
  donc aucun glissement visuel à travers le niveau dans ni l'un ni
  l'autre cas.
- `alpha` est clampé à 1 pour le cas de rattrapage sévère (`guard`
  atteint), sinon l'interpolation extrapolerait au lieu de rester bornée
  entre les deux états connus.

## Effet de bord positif, non demandé mais correct
`start()` appelle maintenant `resetCraft()`, ce qui corrige un léger
décalage hérité de V7/V8 où la position initiale du craft (fixée en dur
dans `craft.js`) ne correspondait pas exactement à la plateforme 0 du
niveau 1.

## Statut
Le défaut mécanique n°1 identifié en V8 est traité. Le jeu reste,
comme en V8, un vertical slice cohérent — pas encore un candidat de
sortie au sens du brief d'origine.

## Déficience n°1 à corriger en priorité (renvoyée au Builder pour V10)
**Aucun post-traitement.** L'éclairage se limite à un `HemisphereLight`
et un `DirectionalLight` de base, sans bloom, sans vignette, sans grading
couleur. Le brief demande explicitement un "dynamic volumetric-style
lighting" ; en l'état, la scène est correctement éclairée mais plate,
loin du rendu recherché (Trine / Rayman Legends / Nintendo stylisé).
Correction attendue à l'itération suivante : `EffectComposer` +
`UnrealBloomPass` (ou équivalent) sur les zones émissives (moon light,
lave/eau, bulles de dialogue), plus une passe de vignette légère pour
resserrer la lecture de la caméra orthographique fixe.

## Autres manques connus, non bloquants mais réels (backlog inchangé)
- Three.js encore chargé via jsDelivr, pas vendorisé localement (pas
  d'accès réseau sortant dans cet environnement pour le télécharger en
  sécurité).
- Un seul passager actif à la fois.
- Géométrie toujours primitive (dodécaèdres/cônes/capsules) — style
  low-poly défendable, mais loin de la finition Trine/Rayman Legends.

## QA à refaire avant toute prétention "release candidate"
Chrome Android, Safari iOS, clavier desktop 60/120 Hz, portrait/paysage,
reprise après mise en arrière-plan — toujours pas rejoué en conditions
réelles depuis V7 (aucun accès navigateur dans cet environnement de
développement).
