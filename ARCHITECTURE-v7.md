# Architecture V7

Simulation fixe 120 Hz, rendu Three.js et Web Audio procédural.

Pipeline :
Input -> physique fixe -> collisions -> FSM passager -> FX/audio -> caméra -> rendu.

États : MENU / PLAY / PAUSE / LEVEL / GAME_OVER / WIN.

V7 ajoute les FX de crash/atterrissage/eau, la caméra à micro-shake, les routes
passagers déterministes, le feedback de mission et le redémarrage direct après
Game Over/Victoire.
