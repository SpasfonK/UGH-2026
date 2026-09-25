// Appareil du joueur : caveman pédaleur avec rotor à lames d'os. Groupe
// unique dont on expose les sous-parties animées (rotor, jambes) pour
// que le module de jeu puisse les faire bouger sans connaître la
// hiérarchie interne.

export function createCraft(THREE, scene, mats) {
  const craft = new THREE.Group();
  scene.add(craft);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.72, 1.1, 6, 10), mats.cloth);
  body.rotation.z = Math.PI / 2;
  body.castShadow = true;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 10), mats.skin);
  head.position.set(0.75, 0.42, 0.1);
  head.castShadow = true;

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), mats.hair);
  hair.position.set(0.72, 0.7, 0.1);
  hair.scale.set(1, 0.6, 1);

  const rotor = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.09, 0.08), mats.bone);
    blade.position.z = 0.2;
    blade.rotation.z = (i * Math.PI) / 2;
    rotor.add(blade);
  }

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.7), mats.bone);
  seat.position.set(-0.2, -0.55, 0.05);

  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.7, 4, 6), mats.skin);
  legL.position.set(-0.2, -0.72, 0.15);
  const legR = legL.clone();
  legR.position.z = -0.15;

  craft.add(body, head, hair, rotor, seat, legL, legR);
  craft.position.set(-11, -2.4, 2);

  return { group: craft, rotor, legL, legR };
}
