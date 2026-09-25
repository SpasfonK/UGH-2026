// Machine à états du passager : WAIT -> CARRY -> DELIVERED. Le passager
// affiche une bulle de dialogue (sprite canvas) avec son numéro de
// destination, agite le bras et s'agite visuellement quand sa patience
// s'épuise.

export function createPassengerManager(THREE, worldGroup, mats, gameplay) {
  let passenger = null;

  function makeSpeechBubble(dest) {
    const c = document.createElement("canvas");
    c.width = 192; c.height = 112;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "rgba(255,255,255,.97)";
    ctx.beginPath(); ctx.roundRect(8, 8, 176, 82, 24); ctx.fill();
    ctx.beginPath(); ctx.moveTo(42, 88); ctx.lineTo(28, 108); ctx.lineTo(70, 88); ctx.fill();
    ctx.fillStyle = "#18242b";
    ctx.font = "900 54px system-ui";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(dest + 1), 96, 50);
    const tex = new THREE.CanvasTexture(c);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.set(1.55, 0.9, 1);
    return sp;
  }

  function spawn(levelPlatforms, level, score, target) {
    if (!Number.isInteger(target)) target = level % levelPlatforms.length;
    target = ((target % levelPlatforms.length) + levelPlatforms.length) % levelPlatforms.length;
    if (passenger) { worldGroup.remove(passenger.g); passenger = null; }

    const p = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), mats.skin);
    head.position.set(0, 0.65, 0.25);
    const bodyMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.65, 5, 8), mats.cloth);
    bodyMesh.position.set(0, 0.1, 0.25);
    const bubble = makeSpeechBubble(target);
    bubble.position.set(0.75, 1.15, 0.55);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.08), mats.skin);
    arm.position.set(0.36, 0.35, 0.25);
    p.add(head, bodyMesh, bubble, arm);
    p.userData.carryOffset = new THREE.Vector3(-0.35, 0.25, 1.2);
    worldGroup.add(p);

    let from = 0;
    const candidates = levelPlatforms.map((_, i) => i).filter((i) => i !== target);
    if (candidates.length) from = candidates[(level * 3 + score) % candidates.length];

    passenger = { g: p, from, target, patience: 100, state: "WAIT" };
    const P = levelPlatforms[from];
    p.position.set(P.x, P.top + 0.25, 1.4);
    return passenger;
  }

  function current() { return passenger; }
  function clear() { if (passenger) { worldGroup.remove(passenger.g); passenger = null; } }

  function update(dt, time, craftPos, craftVy, levelPlatforms, level, onBoard, onExpire) {
    if (!passenger) return;
    if (passenger.state === "WAIT") {
      passenger.patience -= dt * (gameplay.BASE_PATIENCE_DRAIN + level * gameplay.PATIENCE_DRAIN_PER_LEVEL);
      passenger.g.rotation.z = Math.sin(time * 7) * 0.08;
      const arm = passenger.g.children[3], bubble = passenger.g.children[2];
      if (arm) arm.rotation.z = Math.sin(time * 11) * 0.65;
      if (bubble) bubble.scale.setScalar(0.95 + 0.1 * Math.sin(time * 5));

      const from = levelPlatforms[passenger.from];
      if (Math.abs(craftPos.x - from.x) < 1.2 && Math.abs(craftPos.y - from.top) < 1.1 && Math.abs(craftVy) < 0.35) {
        passenger.state = "CARRY";
        if (bubble) bubble.visible = false;
        onBoard();
      }
      if (passenger.patience <= 0) {
        passenger.patience = 100;
        onExpire(passenger.target);
      }
    } else if (passenger.state === "CARRY") {
      passenger.g.visible = true;
      passenger.g.position.copy(craftPos).add(passenger.g.userData.carryOffset);
    }
  }

  return { spawn, current, clear, update };
}
