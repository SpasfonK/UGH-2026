// Système de particules à pool réutilisable, avec une vraie intégration
// physique par frame (gravité + drag + fondu d'opacité). Corrige le bug du
// V7 où les débris de crash avaient une vélocité assignée mais jamais
// utilisée (ils étaient donc statiques).

export function createParticleSystem(THREE, scene) {
  const POOL_SIZE = 220;
  const pool = [];

  const geoDebris = new THREE.TetrahedronGeometry(0.09);
  const geoDust = new THREE.PlaneGeometry(0.5, 0.5);
  const geoDrop = new THREE.SphereGeometry(0.06, 5, 5);

  function makeInstance(geo, color, kind) {
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);
    return {
      mesh, mat, kind,
      vel: new THREE.Vector3(),
      angVel: new THREE.Vector3(),
      gravity: 0,
      drag: 1,
      life: 0,
      maxLife: 1,
      baseOpacity: 1,
      active: false,
    };
  }

  for (let i = 0; i < POOL_SIZE; i++) {
    const kind = i % 3 === 0 ? "debris" : i % 3 === 1 ? "dust" : "drop";
    const geo = kind === "debris" ? geoDebris : kind === "dust" ? geoDust : geoDrop;
    const color = kind === "debris" ? 0xe7d4a5 : kind === "dust" ? 0x8a7a63 : 0x8fd6e6;
    pool.push(makeInstance(geo, color, kind));
  }

  function spawn({ kind, position, velocity, gravity, drag, life, scale = 1, opacity = 0.9, color }) {
    const p = pool.find((q) => !q.active && q.kind === kind);
    if (!p) return; // pool saturé : on ignore plutôt que de faire déborder la scène
    p.active = true;
    p.mesh.visible = true;
    p.mesh.position.copy(position);
    p.mesh.scale.setScalar(scale);
    p.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    p.vel.copy(velocity);
    p.angVel.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    p.gravity = gravity;
    p.drag = drag;
    p.life = life;
    p.maxLife = life;
    p.baseOpacity = opacity;
    p.mat.opacity = opacity;
    if (color) p.mat.color.set(color);
  }

  function burstDebris(position, count = 16) {
    for (let i = 0; i < count; i++) {
      spawn({
        kind: "debris",
        position,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 4.2, Math.random() * 3.4 + 0.6, (Math.random() - 0.5) * 1.4),
        gravity: 9.5,
        drag: 0.985,
        life: 0.55 + Math.random() * 0.5,
        scale: 0.6 + Math.random() * 0.8,
      });
    }
  }

  function landingDust(position, count = 9) {
    for (let i = 0; i < count; i++) {
      spawn({
        kind: "dust",
        position: position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.05, 0.3)),
        velocity: new THREE.Vector3((Math.random() - 0.5) * 1.6, 0.3 + Math.random() * 0.5, 0),
        gravity: -0.4,
        drag: 0.96,
        life: 0.5 + Math.random() * 0.4,
        scale: 0.35 + Math.random() * 0.4,
        opacity: 0.35,
        color: 0x9c8a6f,
      });
    }
  }

  function splash(position, count = 16) {
    for (let i = 0; i < count; i++) {
      spawn({
        kind: "drop",
        position,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 3.6, 2.2 + Math.random() * 2.4, (Math.random() - 0.5) * 1.2),
        gravity: 11,
        drag: 0.99,
        life: 0.4 + Math.random() * 0.35,
        scale: 0.6 + Math.random() * 0.6,
        opacity: 0.85,
        color: 0x9fe3ef,
      });
    }
  }

  // Nuage de poussière soulevé par le souffle du rotor près du sol.
  // Probabiliste (pas à chaque frame) pour rester discret.
  function propWash(position) {
    if (Math.random() > 0.55) return;
    spawn({
      kind: "dust",
      position: position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, -0.3, 0.25)),
      velocity: new THREE.Vector3((Math.random() - 0.5) * 1.0, -0.4 - Math.random() * 0.4, 0),
      gravity: 0.2,
      drag: 0.97,
      life: 0.35 + Math.random() * 0.3,
      scale: 0.25 + Math.random() * 0.25,
      opacity: 0.22,
      color: 0x7c6a52,
    });
  }

  function update(dt) {
    for (const p of pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.vel.multiplyScalar(Math.pow(p.drag, dt * 60));
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.angVel.x * dt;
      p.mesh.rotation.y += p.angVel.y * dt;
      p.mat.opacity = p.baseOpacity * (p.life / p.maxLife);
    }
  }

  return { burstDebris, landingDust, splash, propWash, update };
}
