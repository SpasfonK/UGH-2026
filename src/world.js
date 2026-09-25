// Géométrie de la caverne : plateformes, parois rocheuses de fond,
// stalactites (dangers) et plan d'eau animé. Génère aussi de petites
// textures canvas procédurales pour que la roche/mousse ne se lise pas
// comme des cubes de couleur plate.

function makeNoiseTexture(THREE, { base, spots, size = 128, density = 900 }) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < density; i++) {
    ctx.fillStyle = spots[Math.floor(Math.random() * spots.length)];
    const x = Math.random() * size, y = Math.random() * size;
    const s = 1 + Math.random() * 3;
    ctx.globalAlpha = 0.15 + Math.random() * 0.35;
    ctx.fillRect(x, y, s, s);
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeLightShaftTexture(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 48; canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "rgba(255,224,170,0.65)");
  grad.addColorStop(0.6, "rgba(255,214,150,0.18)");
  grad.addColorStop(1, "rgba(255,214,150,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 48, 256);
  return new THREE.CanvasTexture(canvas);
}

export function buildMaterials(THREE) {
  const rockTex = makeNoiseTexture(THREE, { base: "#3d2f27", spots: ["#5a4636", "#2c211b", "#6b5340"] });
  const rock2Tex = makeNoiseTexture(THREE, { base: "#5c4634", spots: ["#7a5f45", "#3f2f22", "#8a6c4d"] });
  const mossTex = makeNoiseTexture(THREE, { base: "#3f5c3a", spots: ["#547a4c", "#2c4028", "#6a9760"] });
  rockTex.repeat.set(2, 2);
  rock2Tex.repeat.set(2, 1);
  mossTex.repeat.set(3, 1);

  return {
    rock: new THREE.MeshStandardMaterial({ color: 0x8a7a6a, map: rockTex, roughness: 0.95 }),
    rock2: new THREE.MeshStandardMaterial({ color: 0x9a8570, map: rock2Tex, roughness: 0.9 }),
    moss: new THREE.MeshStandardMaterial({ color: 0x8fae82, map: mossTex, roughness: 0.9, emissive: 0x162b12, emissiveIntensity: 0.25 }),
    water: new THREE.MeshStandardMaterial({ color: 0x267f91, roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.8, emissive: 0x0d5c6e, emissiveIntensity: 0.5 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb8734f, roughness: 0.9 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x241812, roughness: 1 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0xd39b4d, roughness: 0.8 }),
    bone: new THREE.MeshStandardMaterial({ color: 0xe7d4a5, roughness: 0.8 }),
  };
}

const LEVEL_LAYOUTS = [
  [[-11, -3.8, 4.4], [-4, -1.0, 3.8], [3, -3.0, 4.5], [10, 0.2, 4.0], [14, -2.8, 3.8]],
  [[-13, -4.0, 3.5], [-7, 0.0, 3.4], [-1, -2.4, 3.4], [6, 0.9, 4.2], [12, -2.0, 3.8]],
  [[-14, -3.5, 3.8], [-8, -0.2, 3.2], [-2, 2.1, 3.4], [5, -0.6, 3.5], [12, 2.0, 4.0]],
  [[-14, -2.8, 4.0], [-8, 1.8, 3.0], [-1, -1.8, 3.2], [6, 2.3, 3.6], [13, -0.8, 4.0]],
  [[-14, -4.0, 3.2], [-9, -0.8, 3.0], [-3, 2.6, 3.0], [3, -0.7, 3.0], [9, 2.7, 3.2], [14, -1.8, 3.8]],
];

function mesh(THREE, geo, mat, x, y, z = 0) {
  const o = new THREE.Mesh(geo, mat);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}

export function createWorld(THREE, scene, mats) {
  const world = new THREE.Group(); scene.add(world);
  const decor = new THREE.Group(); world.add(decor);
  const platforms = new THREE.Group(); world.add(platforms);
  const hazards = []; // stalactites, testées séparément pour les collisions

  function makePlatform(x, y, w = 4) {
    const g = new THREE.Group();
    const slab = mesh(THREE, new THREE.BoxGeometry(w, 0.42, 1.4), mats.rock2, 0, 0, 0);
    const moss = mesh(THREE, new THREE.BoxGeometry(w * 0.9, 0.12, 1.45), mats.moss, 0, 0.27, 0.02);
    g.add(slab, moss);
    g.position.set(x, y, 0);
    platforms.add(g);
    return { g, x, y, w, top: y + 0.35 };
  }

  function buildLevel(n) {
    platforms.clear(); decor.clear(); hazards.length = 0;
    const cfg = LEVEL_LAYOUTS[n - 1];
    cfg.forEach((p, i) => {
      const P = makePlatform(...p);
      P.g.userData.id = i + 1;
    });
    for (let i = 0; i < 24; i++) {
      const x = -17 + i * 1.5, y = 7 + Math.sin(i * 1.7) * 1.8;
      const o = mesh(THREE, new THREE.DodecahedronGeometry(1, 1), mats.rock, x, y, -5);
      o.scale.set(1.2 + Math.random() * 1.5, 1.2 + Math.random() * 2.1, 1.2);
      decor.add(o);
    }
    for (let i = 0; i < 18; i++) {
      const x = -16 + Math.random() * 32, y = -7 + Math.random() * 3;
      const o = mesh(THREE, new THREE.DodecahedronGeometry(1, 1), Math.random() > 0.45 ? mats.rock2 : mats.rock, x, y, -3);
      o.scale.set(0.6 + Math.random() * 1.1, 0.5 + Math.random() * 1.2, 1);
      decor.add(o);
    }
    for (let i = 0; i < 12; i++) {
      const x = -15 + i * 2.7 + (n % 2) * 0.4;
      const radius = 0.35 + Math.random() * 0.35;
      const height = 1.8 + Math.random() * 2.2;
      const s = mesh(THREE, new THREE.ConeGeometry(radius, height, 7), mats.rock2, x, 7.2, -2);
      s.rotation.z = (Math.random() - 0.5) * 0.2;
      decor.add(s);
      hazards.push({ x, y: 7.2, radius });
    }
  }

  const waterGeo = new THREE.PlaneGeometry(40, 8, 80, 16);
  const water = mesh(THREE, waterGeo, mats.water, 0, -7, 1);
  scene.add(water);
  const waterBase = water.geometry.attributes.position.array.slice();

  function animateWater(t) {
    const a = water.geometry.attributes.position.array;
    for (let i = 0; i < a.length; i += 3) {
      const x = waterBase[i], z = waterBase[i + 2];
      a[i + 1] = waterBase[i + 1] + Math.sin(x * 0.65 + t * 1.7 + z) * 0.13 + Math.sin(x * 1.7 - t) * 0.06;
    }
    water.geometry.attributes.position.needsUpdate = true;
  }

  // Rais de lumière "volumétriques" bon marché : des plans additifs avec
  // une texture en dégradé, plutôt qu'un vrai raymarching volumétrique
  // (hors de portée pour une caméra orthographique fixe à ce budget).
  // Répond directement au "dynamic volumetric-style lighting" du brief.
  const shaftTex = makeLightShaftTexture(THREE);
  const lightShafts = new THREE.Group();
  [-10, -1.5, 8.5].forEach((x, i) => {
    const mat = new THREE.MeshBasicMaterial({
      map: shaftTex, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 15), mat);
    shaft.position.set(x, 4.5, 3.6);
    shaft.rotation.z = -0.12 + i * 0.05;
    shaft.userData.phase = i * 2.1;
    lightShafts.add(shaft);
  });
  scene.add(lightShafts);

  function animateLightShafts(t) {
    for (const shaft of lightShafts.children) {
      shaft.material.opacity = 0.55 + 0.2 * Math.sin(t * 0.35 + shaft.userData.phase);
    }
  }

  return { world, decor, platforms, hazards, water, buildLevel, animateWater, animateLightShafts };
}
