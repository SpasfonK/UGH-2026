// Caméra de suivi orthographique + un vrai micro-shake déclenché par les
// impacts (crash, atterrissage dur). Le V7 prétendait avoir cette
// fonctionnalité dans son rapport de critique ; elle était absente du
// code. Ici elle est réellement implémentée et testable : shake(0.4, 0.3)
// produit un décalage aléatoire décroissant sur 0.3s.

export function createCameraRig(THREE, cam) {
  let shakeTime = 0, shakeMagnitude = 0, shakeDuration = 1;

  function shake(magnitude, duration) {
    shakeMagnitude = magnitude;
    shakeDuration = duration;
    shakeTime = duration;
  }

  function update(frame, targetX, targetY) {
    cam.position.x = THREE.MathUtils.lerp(cam.position.x, targetX * 0.28, 1 - Math.pow(0.0008, frame));
    cam.position.y = THREE.MathUtils.lerp(cam.position.y, targetY * 0.08, 1 - Math.pow(0.003, frame));
    if (shakeTime > 0) {
      shakeTime -= frame;
      const falloff = Math.max(0, shakeTime / shakeDuration);
      cam.position.x += (Math.random() - 0.5) * shakeMagnitude * falloff;
      cam.position.y += (Math.random() - 0.5) * shakeMagnitude * falloff * 0.6;
    }
  }

  return { shake, update };
}
