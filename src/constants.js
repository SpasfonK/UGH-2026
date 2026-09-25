// Constantes de tuning partagées par tous les modules. Centraliser ces
// valeurs permet de régler le "feel" du jeu sans chasser des nombres
// éparpillés dans chaque fichier.

export const PHYSICS = {
  PEDAL_THRUST: 10.2, // accélération verticale en pédalant (u/s^2)
  GRAVITY: 7.2, // accélération de chute quand on ne pédale pas
  STEER_ACCEL: 5.2, // accélération horizontale depuis le stick/clavier
  DRAG_DAMPING: 0.22, // base d'amortissement horizontal (pow(base, dt))
  BRAKE_DAMPING: 0.04, // amortissement renforcé au freinage
  STAMINA_DRAIN: 25, // %/s pendant le pédalage
  STAMINA_RECHARGE: 18, // %/s uniquement quand l'appareil est posé au sol
  CRASH_IMPACT_SPEED: 2.35, // vitesse de chute au-delà de laquelle l'atterrissage = crash
  CRASH_TILT: 0.34, // |inclinaison| (rad) au-delà de laquelle l'atterrissage = crash
  WORLD_BOUND_X: 16,
  VOID_Y: -8,
};

export const GAMEPLAY = {
  START_LIVES: 3,
  LEVEL_COUNT: 5,
  BASE_PATIENCE_DRAIN: 4,
  PATIENCE_DRAIN_PER_LEVEL: 0.8,
  BOARD_SCORE: 100,
  DELIVER_SCORE: 500,
  LEVEL_CLEAR_SCORE: 250,
  WIN_SCORE: 1000,
  CRASH_PENALTY: 200,
  WATER_RISE_BASE: 0.12,
  WATER_RISE_PER_LEVEL: 0.018,
  WATER_MAX: 3.8,
};

export const FIXED_DT = 1 / 120;

export const THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js";
