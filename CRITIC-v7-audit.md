# Audit V7 (fait à réception, avant de coder quoi que ce soit)

Le rapport `CRITIC-v7.md` fourni a été vérifié ligne par ligne dans
`index.html` plutôt que pris pour argent comptant. Résultat : deux des
sept points qu'il annonce comme livrés sont absents du code.

## Écarts confirmés entre le rapport et le code réel
- **Caméra à micro-shake** : annoncée, absente. Aucune occurrence de
  "shake" dans le fichier.
- **Poussière/fumée procédurale** : annoncée, absente. Aucune occurrence
  de "dust"/"smoke".
- **Débris de crash "physiques"** : une vélocité (`userData.v`) est
  assignée à chaque débris à la création mais n'est lue nulle part
  ailleurs dans le fichier — les débris sont des sphères statiques qui
  disparaissent après 900 ms via `setTimeout`, sans aucune intégration
  de mouvement.

## Écarts confirmés entre le code et le cahier des charges
- La stamina se recharge dès que le joueur ne pédale pas, y compris en
  chute libre. Le cahier des charges demande une recharge au sol
  uniquement.
- Tout le jeu tient dans un seul fichier de 344 lignes en style
  quasi-minifié (une lettre par variable, pas de commentaires). Ce n'est
  pas un obstacle au fonctionnement, mais c'est un obstacle réel à des
  itérations Gauntlet fiables sur un projet de cette taille.
- Aucune texture : tous les matériaux sont des couleurs plates
  (`MeshStandardMaterial({color:...})`), ce qui donne un rendu
  "cube coloré" malgré une géométrie stylisée.
- Audio : un seul oscillateur générique par effet ; pas de bruit filtré
  pour crash/éclaboussure ; le "drone d'ambiance" est un unique sinus à
  55 Hz sans mise en forme.

## Ce qui, en revanche, fonctionne réellement
Boucle physique à pas fixe 120 Hz, déplacement de sommets du plan d'eau
(vérifié : la géométrie est bien modifiée par frame), FSM passager de
base fonctionnelle, doubles joysticks tactiles opérationnels,
persistance du meilleur score en `localStorage`.
