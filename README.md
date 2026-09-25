# UGH! — Prehistoric Space Taxi — V10

V10 ajoute le pipeline de post-traitement (bloom, vignette/grade, rais
de lumière) qui manquait depuis le V7. Détail dans `ARCHITECTURE-v10.md`
et `CRITIC-v10.md`.

## ⚠️ Avant d'aller plus loin
Ce projet n'a **jamais été rendu dans un vrai navigateur** depuis le
début du travail sur V7→V10 (environnement de développement sans
réseau sortant ni navigateur). Toutes les corrections ont été
vérifiées par lecture de code et recherche documentaire, jamais par un
test visuel. **Sers ce dossier et ouvre-le dans un navigateur avant de
demander une V11** — voir `CRITIC-v10.md` pour ce qu'il faut vérifier
en priorité (le bloom doit toucher l'eau/les rais de lumière, pas toute
la scène ; aucune erreur dans la console).

## Lancer le jeu
```
npx serve .
# ou
python3 -m http.server 8080
```
Puis ouvrir `index.html` servi par ce serveur (les modules ES et les
textures canvas ne fonctionnent pas en `file://` direct).

## Contrôles
Clavier : A/D ou ←/→, W/↑ pédaler, S/↓ frein, P/Échap pause.
Mobile : joystick gauche direction, joystick droit pédalage/freinage.

## Nouveau en V10
- Pipeline de post-traitement : `EffectComposer` + `UnrealBloomPass` +
  vignette/grade maison + `OutputPass`, avec tone mapping ACES.
- Eau et mousse rendues légèrement émissives pour donner du grain au
  bloom sans système de calques.
- Trois rais de lumière additifs animés ("volumetric-style lighting").
- `index.html` gagne un import map (requis par les addons Three.js de
  post-traitement, qui importent `three` en spécificateur nu).

## Historique
- V9 : interpolation de rendu entre pas physiques fixes (le craft ne
  saute plus visuellement d'un pas de 1/120s à l'autre).
- V8 : particules réellement animées, stamina qui ne recharge qu'au
  sol, vrai shake caméra, textures procédurales, audio enrichi.

## Limites connues (voir CRITIC-v10.md)
- Aucune vérification en navigateur réel — priorité absolue avant V11.
- Un seul passager actif à la fois.
- Three.js encore chargé via CDN jsDelivr, pas vendorisé localement.
- Réglages de bloom choisis par raisonnement, pas encore ajustés à l'œil.
