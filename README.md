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

## CI/CD GitHub Actions
`.github/workflows/build-deploy.yml` fait tourner, sur chaque push et
pull request :
1. **validate** — `node --check` sur chaque module de `src/`.
2. **smoke-test** (informatif, ne bloque pas encore le déploiement) —
   ouvre réellement la page dans Chromium headless via Playwright et
   échoue si une erreur console/JS apparaît ou si le canvas WebGL n'est
   jamais créé. C'est le premier test de ce projet qui vérifie un rendu
   réel plutôt qu'une relecture de code (voir l'alerte de
   `CRITIC-v10.md`) — mais la config WebGL en headless CI pouvant être
   capricieuse selon le runner, il reste `continue-on-error: true`
   jusqu'à ce que tu l'aies vu passer plusieurs fois de suite sans faux
   négatif. Une fois confiant, ajoute `smoke-test` au `needs:` du job
   `deploy` pour le rendre bloquant.
3. **deploy** (uniquement sur push vers `main`) — publie le dossier tel
   quel sur GitHub Pages (aucune étape de build : c'est déjà du HTML/JS
   servi tel quel).

**Corrigé après le premier run réel sur GitHub** (les trois lignes
ci-dessous sont les bugs réellement rencontrés, pas des précautions
théoriques) :
- `configure-pages` échouait avec `HttpError: Not Found` sur un dépôt où
  Pages n'avait jamais été activé → `enablement: true` explicite dans le
  `with:` de cette étape, pour qu'elle crée le site Pages elle-même au
  lieu de simplement échouer.
- Le smoke test échouait (`exit code 1`) : `npx playwright install`
  télécharge le navigateur mais ne rend pas le paquet `playwright`
  importable par le script → ajout d'un `npm init -y && npm install
  playwright` avant l'installation du navigateur.
- `actions/checkout@v4` et `actions/setup-node@v4` déclenchaient un
  avertissement de dépréciation Node 20 → bump vers `@v5` (compatibles
  Node 24).

**Si `configure-pages` échoue quand même malgré `enablement: true`**
(certains réglages d'organisation bloquent la création automatique) :
Settings → Pages → "Build and deployment" → Source = **GitHub Actions**
à la main, une seule fois.

Si tu gardes le dossier `ugh-remake/` imbriqué dans un repo plus large
au lieu de le mettre à la racine du repo, adapte le `path: "."` de
l'étape `upload-pages-artifact` en `path: "ugh-remake"`.

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
