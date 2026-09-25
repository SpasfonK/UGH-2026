// Orchestrateur central : état MENU/PLAY/PAUSE/LEVEL/GAME_OVER/WIN,
// intégration physique à pas fixe, collisions, score, HUD.
//
// V9 : la position/l'inclinaison du craft ne sont plus lues/écrites
// directement sur l'Object3D pendant la physique (c'est ce qui empêchait
// toute interpolation de rendu propre en V8 — cf. CRITIC-v8.md). L'état
// physique autoritatif vit maintenant dans de simples nombres (px, py,
// tilt) ; seul main.js écrit une valeur interpolée dans craft.position/
// rotation, une fois par frame de rendu, via getTransform().

import { PHYSICS, GAMEPLAY } from "./constants.js";

export function createGame({ THREE, craft, craftParts, world, passengerMgr, particles, cameraRig, audio, input, dom }) {
  const els = {
    score: dom.getElementById("score"),
    lives: dom.getElementById("lives"),
    level: dom.getElementById("level"),
    stamina: dom.getElementById("stamina"),
    water: dom.getElementById("water"),
    passenger: dom.getElementById("passenger"),
    menu: dom.getElementById("menu"),
    best: dom.getElementById("best"),
    start: dom.getElementById("start"),
  };

  let level = 1, levelPlatforms = [], score = 0, lives = GAMEPLAY.START_LIVES;
  let waterLevel = 0, waterPct = 0;
  let highScore = Number(localStorage.getItem("ugh_high_score") || 0);
  let state = "MENU", time = 0;
  let vx = 0, vy = 0, tilt = 0, stamina = 100, lastLanding = -1, docked = false;

  // État physique autoritatif du craft (nombres, jamais l'Object3D
  // directement). C'est la source de vérité pour toutes les collisions.
  let px = craft.position.x, py = craft.position.y;
  // Snapshot prev/cur pour l'interpolation de rendu (voir getTransform).
  let prevX = px, prevY = py, prevTilt = tilt;
  let curX = px, curY = py, curTilt = tilt;
  // Vecteur réutilisé pour passer la position courante aux modules qui
  // attendent un THREE.Vector3 (particules, passager) sans allouer à
  // chaque frame.
  const simPos = new THREE.Vector3(px, py, 2);

  els.best.textContent = highScore;

  function saveScore() {
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("ugh_high_score", String(highScore));
    }
  }

  function syncPlatforms() {
    levelPlatforms = [...world.platforms.children].map((g) => ({
      x: g.position.x,
      y: g.position.y,
      w: g.children[0].geometry.parameters.width,
      top: g.position.y + 0.35,
    }));
  }

  function makeLevel(n) {
    world.buildLevel(n);
    syncPlatforms();
  }

  // Seul point de téléportation du craft (crash avec vies restantes,
  // changement de niveau, démarrage de partie). Resynchronise
  // systématiquement prev ET cur pour que l'interpolation de rendu ne
  // fasse jamais glisser le craft visuellement à travers tout le niveau
  // après un crash — y compris quand resetCraft() est appelé depuis un
  // setTimeout hors du cycle physique normal (livraison de passager).
  function resetCraft() {
    const P = levelPlatforms[0];
    px = P.x; py = P.top + 2.1;
    vx = 0; vy = 0; tilt = 0; stamina = 100; lastLanding = -1; docked = false;
    prevX = px; prevY = py; prevTilt = tilt;
    curX = px; curY = py; curTilt = tilt;
  }

  function showOverlay(title, text, buttonText) {
    const panel = els.menu.querySelector(".panel");
    panel.innerHTML = `<h1>${title}</h1><p>${text}</p><button id="overlayBtn">${buttonText}</button>`;
    els.menu.style.display = "flex";
    dom.getElementById("overlayBtn").onclick = () => {
      if (state === "GAME_OVER" || state === "WIN") { location.reload(); return; }
      if (state === "PAUSE" || state === "LEVEL") { state = "PLAY"; els.menu.style.display = "none"; }
    };
  }
  function hideOverlay() { els.menu.style.display = "none"; }

  function crash() {
    audio.crash();
    lives--;
    score = Math.max(0, score - GAMEPLAY.CRASH_PENALTY);
    lastLanding = -1; docked = false;
    simPos.set(px, py, 2);
    particles.burstDebris(simPos, 16);
    cameraRig.shake(0.45, 0.3);
    if (navigator.vibrate) navigator.vibrate([35, 25, 70]);
    if (lives <= 0) {
      saveScore();
      state = "GAME_OVER";
      showOverlay("GAME OVER", "Score : " + score + " · Record : " + highScore, "REJOUER");
    } else {
      resetCraft();
    }
  }

  function hazardCollision() {
    for (const h of world.hazards) {
      const dx = px - h.x, dy = py - h.y;
      const r = 0.55 + h.radius * 0.55;
      if (dx * dx + dy * dy < r * r && py < h.y + 0.9) return true;
    }
    return false;
  }

  function landingCheck(prevPy, curPy, curVy) {
    if (curVy >= 0) return -1;
    for (let i = 0; i < levelPlatforms.length; i++) {
      const P = levelPlatforms[i];
      const horizontal = Math.abs(px - P.x) < P.w / 2 + 0.48;
      const crossed = prevPy - 0.68 >= P.top - 0.02 && curPy - 0.68 <= P.top + 0.05;
      if (horizontal && crossed) return i;
    }
    return -1;
  }

  function advanceLevel() {
    if (state === "GAME_OVER" || state === "WIN") return;
    if (level >= GAMEPLAY.LEVEL_COUNT) {
      score += GAMEPLAY.WIN_SCORE;
      saveScore();
      state = "WIN";
      showOverlay("VICTOIRE", "Les cinq cavernes sont traversées · Score : " + score, "REJOUER");
      return;
    }
    level++;
    score += GAMEPLAY.LEVEL_CLEAR_SCORE;
    waterLevel = 0;
    makeLevel(level);
    resetCraft();
    const p = passengerMgr.spawn(levelPlatforms, level, score);
    state = "LEVEL";
    showOverlay("NIVEAU " + level, "Nouvelle caverne · destination " + (p.target + 1), "CONTINUER");
  }

  function update(dt) {
    const inputState = input.read();
    if (input.consumePauseRequest()) {
      if (state === "PLAY") { state = "PAUSE"; showOverlay("PAUSE", "La partie est en pause.", "REPRENDRE"); }
      else if (state === "PAUSE") { state = "PLAY"; hideOverlay(); }
    }
    time += dt;
    if (state !== "PLAY") return;

    // "prev" = dernier état confirmé, capturé avant que ce pas ne bouge
    // quoi que ce soit. C'est la moitié gauche de l'interpolation.
    prevX = curX; prevY = curY; prevTilt = curTilt;

    try {
      if (inputState.pedal && stamina > 0) {
        if (Math.floor(time * 7) % 2 === 0) audio.pedalGrunt();
        vy += PHYSICS.PEDAL_THRUST * dt;
        stamina = Math.max(0, stamina - PHYSICS.STAMINA_DRAIN * dt);
        craftParts.rotor.rotation.z += dt * 20;
        craftParts.legL.rotation.z = Math.sin(time * 22) * 0.5;
        craftParts.legR.rotation.z = -craftParts.legL.rotation.z;
        docked = false;
      } else {
        vy -= PHYSICS.GRAVITY * dt;
        if (docked) stamina = Math.min(100, stamina + PHYSICS.STAMINA_RECHARGE * dt);
        craftParts.rotor.rotation.z += dt * 5;
        craftParts.legL.rotation.z *= 0.8;
        craftParts.legR.rotation.z *= 0.8;
      }
      audio.updateRotor(inputState.pedal ? 1 : 0.15);

      vx += inputState.x * PHYSICS.STEER_ACCEL * dt;
      vx *= Math.pow(PHYSICS.DRAG_DAMPING, dt);
      if (inputState.brake) vx *= Math.pow(PHYSICS.BRAKE_DAMPING, dt);

      const prevPy = py;
      px += vx * dt;
      py += vy * dt;
      tilt = THREE.MathUtils.lerp(tilt, -vx * 0.12, 1 - Math.pow(0.0001, dt));
      px = THREE.MathUtils.clamp(px, -PHYSICS.WORLD_BOUND_X, PHYSICS.WORLD_BOUND_X);

      if (hazardCollision()) return crash();

      const land = landingCheck(prevPy, py, vy);
      if (land >= 0) {
        const impact = -vy;
        if (impact > PHYSICS.CRASH_IMPACT_SPEED || Math.abs(tilt) > PHYSICS.CRASH_TILT) return crash();
        lastLanding = land; docked = true;
        py = levelPlatforms[land].top + 0.68;
        vy = 0;
        audio.land();
        simPos.set(px, py, 2);
        particles.landingDust(simPos);
        if (impact > 1.2) cameraRig.shake(0.12, 0.15);

        const passenger = passengerMgr.current();
        if (passenger && passenger.state === "CARRY" && land === passenger.target) {
          score += GAMEPLAY.DELIVER_SCORE + Math.round(passenger.patience * 5);
          audio.coin();
          saveScore();
          passenger.state = "DELIVERED";
          passenger.g.scale.setScalar(1.1);
          state = "LEVEL";
          setTimeout(() => { passengerMgr.clear(); advanceLevel(); }, 450);
          return;
        }
      } else if (py < PHYSICS.VOID_Y) {
        return crash();
      } else {
        docked = false; lastLanding = -1;
      }

      if (inputState.pedal && lastLanding === -1 && py - 0.68 < 2.2) {
        simPos.set(px, py, 2);
        particles.propWash(simPos);
      }

      simPos.set(px, py, 2);
      passengerMgr.update(
        dt, time, simPos, vy, levelPlatforms, level,
        () => { score += GAMEPLAY.BOARD_SCORE; audio.board(); },
        (target) => { passengerMgr.spawn(levelPlatforms, level, score, target); audio.yell(); },
      );

      waterLevel = Math.min(GAMEPLAY.WATER_MAX, waterLevel + dt * (GAMEPLAY.WATER_RISE_BASE + level * GAMEPLAY.WATER_RISE_PER_LEVEL));
      world.water.position.y = -6.9 + waterLevel;
      waterPct = Math.round((waterLevel / GAMEPLAY.WATER_MAX) * 100);
      if (py - 0.55 < world.water.position.y) {
        audio.splash();
        simPos.set(px, py, 2);
        particles.splash(simPos);
        return crash();
      }
      if (waterPct > 78) audio.warning();
      if (px > 15.2) advanceLevel();

      updateHUD();
    } finally {
      // Garanti de s'exécuter quel que soit le chemin de sortie ci-dessus
      // (crash, livraison, retour anticipé...) : "cur" reflète toujours
      // le tout dernier état physique confirmé de ce pas fixe.
      curX = px; curY = py; curTilt = tilt;
    }
  }

  function updateHUD() {
    els.score.textContent = String(score).padStart(6, "0");
    els.lives.textContent = "♥".repeat(Math.max(0, lives)) + "♡".repeat(Math.max(0, 3 - lives));
    els.level.textContent = `${level} / ${GAMEPLAY.LEVEL_COUNT}`;
    els.stamina.textContent = Math.round(stamina) + "%";
    els.water.textContent = Math.round(waterPct) + "%";
    const passenger = passengerMgr.current();
    if (passenger) {
      els.passenger.style.display = passenger.state === "WAIT" ? "block" : "none";
      els.passenger.textContent = `PASSAGER → plateforme ${passenger.target + 1} · patience ${Math.max(0, Math.round(passenger.patience))}%`;
    }
  }

  function start() {
    els.menu.style.display = "none";
    audio.init();
    state = "PLAY"; level = 1; score = 0; lives = GAMEPLAY.START_LIVES; waterLevel = 0;
    makeLevel(level);
    resetCraft(); // aligne le craft exactement sur la plateforme 0 (V9 : évite le décalage hérité de V7/V8)
    passengerMgr.spawn(levelPlatforms, level, score);
    saveScore();
  }
  els.start.onclick = start;

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "PLAY") {
      state = "PAUSE";
      showOverlay("PAUSE", "La partie a été mise en pause automatiquement.", "REPRENDRE");
    }
  });

  makeLevel(1);
  syncPlatforms();

  return {
    update,
    get state() { return state; },
    // Snapshot pour l'interpolation de rendu (voir main.js) : uniquement
    // ce qui doit visuellement être lissé entre deux pas fixes.
    getTransform() {
      return { prevX, prevY, prevTilt, curX, curY, curTilt };
    },
  };
}
