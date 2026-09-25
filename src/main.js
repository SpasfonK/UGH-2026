// Point d'entrée : crée la scène Three.js, instancie chaque module et
// pilote la boucle de rendu / simulation à pas fixe (120 Hz).

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { FIXED_DT, GAMEPLAY } from "./constants.js";
import { AudioEngine } from "./audio.js";
import { createParticleSystem } from "./particles.js";
import { buildMaterials, createWorld } from "./world.js";
import { createCraft } from "./craft.js";
import { createPassengerManager } from "./passengers.js";
import { createInputManager } from "./input.js";
import { createCameraRig } from "./camera.js";
import { createGame } from "./game.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080b12);
scene.fog = new THREE.FogExp2(0x0b1118, 0.012);

const cam = new THREE.OrthographicCamera(-16, 16, 9, -9, 0.1, 200);
cam.position.set(0, 0, 35);
cam.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x9bc7d8, 0x24180f, 1.25));
const moon = new THREE.DirectionalLight(0xffd89b, 1.7);
moon.position.set(-8, 14, 18);
moon.castShadow = true;
scene.add(moon);

// V10 : pipeline de post-traitement. UnrealBloomPass fait "respirer" les
// zones réellement lumineuses (rais de lumière, eau bioluminescente,
// bulles de dialogue) sans éclaircir toute la scène — c'est le tone
// mapping ACES ci-dessus qui évite que l'éclairage direct ne sature déjà
// tout en blanc avant même le bloom. Le ShaderPass final ajoute une
// vignette et un grade chaud légers, propres à ce projet (pas une
// dépendance externe supplémentaire).
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, cam));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.5, 0.82);
composer.addPass(bloomPass);
const gradeVignette = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 c = vUv - 0.5;
      float vignette = 1.0 - dot(c, c) * 0.9;
      color.rgb *= vignette;
      color.rgb = mix(color.rgb, color.rgb * vec3(1.04, 0.99, 0.93), 0.5);
      gl_FragColor = color;
    }
  `,
};
composer.addPass(new ShaderPass(gradeVignette));
composer.addPass(new OutputPass());

const mats = buildMaterials(THREE);
const worldSystem = createWorld(THREE, scene, mats);
const craftParts = createCraft(THREE, scene, mats);
const particles = createParticleSystem(THREE, scene);
const passengerMgr = createPassengerManager(THREE, worldSystem.world, mats, GAMEPLAY);
const input = createInputManager(THREE, document);
const cameraRig = createCameraRig(THREE, cam);
const audio = new AudioEngine();

const game = createGame({
  THREE,
  craft: craftParts.group,
  craftParts,
  world: worldSystem,
  passengerMgr,
  particles,
  cameraRig,
  audio,
  input,
  dom: document,
});

let accumulator = 0, lastFrame = performance.now();
function loop(t) {
  requestAnimationFrame(loop);
  const frame = Math.min(0.05, (t - lastFrame) / 1000);
  lastFrame = t;
  accumulator += frame;
  let guard = 0;
  while (accumulator >= FIXED_DT && guard++ < 12) {
    game.update(FIXED_DT);
    accumulator -= FIXED_DT;
  }
  // Interpolation de rendu (V9) : le craft ne "saute" plus d'un pas fixe
  // à l'autre. `alpha` est la fraction du prochain pas physique déjà
  // écoulée ; on affiche la position/inclinaison interpolée entre le pas
  // confirmé précédent et le dernier pas confirmé, jamais la valeur brute
  // d'un seul pas de 1/120s.
  const { prevX, prevY, prevTilt, curX, curY, curTilt } = game.getTransform();
  // Clampé à 1 : si le guard de rattrapage ci-dessus a été atteint lors
  // d'un lag sévère, l'accumulateur peut dépasser FIXED_DT — sans ce
  // clamp on extrapolerait au-delà de curX/curY au lieu d'interpoler.
  const alpha = Math.min(1, accumulator / FIXED_DT);
  craftParts.group.position.x = THREE.MathUtils.lerp(prevX, curX, alpha);
  craftParts.group.position.y = THREE.MathUtils.lerp(prevY, curY, alpha);
  craftParts.group.rotation.z = THREE.MathUtils.lerp(prevTilt, curTilt, alpha);

  particles.update(frame);
  worldSystem.animateWater(t * 0.001);
  worldSystem.animateLightShafts(t * 0.001);
  cameraRig.update(frame, craftParts.group.position.x, craftParts.group.position.y);
  composer.render();
}

addEventListener("resize", () => {
  const a = innerWidth / innerHeight;
  cam.left = -9 * a;
  cam.right = 9 * a;
  cam.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloomPass.setSize(innerWidth, innerHeight);
});

loop(0);
