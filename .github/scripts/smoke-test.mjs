// Smoke test minimal : ouvre la page dans un vrai moteur de rendu
// (Chromium headless) et échoue si une erreur JS/console apparaît, ou si
// le canvas WebGL créé par src/main.js n'existe pas après quelques
// secondes. C'est le seul test de ce projet qui vérifie un rendu réel
// plutôt qu'une simple relecture de code — voir CRITIC-v10.md pour
// pourquoi c'était le manque le plus important avant d'ajouter cette CI.

import { chromium } from "playwright";

const URL = "http://localhost:8080/index.html";
const errors = [];

const browser = await chromium.launch({
  args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`[console] ${msg.text()}`);
});
page.on("pageerror", (err) => errors.push(`[exception] ${err}`));

await page.goto(URL, { waitUntil: "load" });
// Laisse le temps à l'import map + Three.js + le pipeline de
// post-traitement de s'initialiser avant de vérifier quoi que ce soit.
await page.waitForTimeout(3000);

const hasCanvas = await page.evaluate(() => !!document.querySelector("canvas"));
if (!hasCanvas) {
  errors.push("Aucun <canvas> WebGL trouvé après 3s : la scène Three.js ne s'est pas initialisée.");
}

await browser.close();

if (errors.length) {
  console.error("Échec du smoke test :\n" + errors.join("\n"));
  process.exit(1);
}

console.log("Smoke test OK : page chargée sans erreur, canvas WebGL présent.");
