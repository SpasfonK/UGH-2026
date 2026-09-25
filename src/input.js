// Entrées clavier + double joystick virtuel tactile. Expose un état
// normalisé unique {x, pedal, brake} lu une fois par pas de simulation
// fixe, ainsi qu'une demande de pause consommable.

export function createInputManager(THREE, dom) {
  const keys = new Set();
  const state = { x: 0, pedal: 0, brake: 0 };
  let touchX = 0, touchY = 0;
  let pauseRequested = false;

  addEventListener("keydown", (e) => {
    keys.add(e.code);
    if (e.code === "KeyP" || e.code === "Escape") pauseRequested = true;
  });
  addEventListener("keyup", (e) => keys.delete(e.code));

  function setupStick(id, side) {
    const el = dom.getElementById(id);
    const knob = el.querySelector(".knob");
    let active = false;
    const move = (e) => {
      if (!active) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      if (side === "left") touchX = THREE.MathUtils.clamp(x, -1, 1);
      else touchY = THREE.MathUtils.clamp(y, -1, 1);
      const dx = side === "left" ? touchX : 0, dy = side === "right" ? touchY : 0;
      knob.style.transform = `translate(${dx * 32}px,${dy * 32}px)`;
    };
    const reset = () => {
      active = false;
      if (side === "left") touchX = 0; else touchY = 0;
      knob.style.transform = "";
    };
    el.addEventListener("pointerdown", (e) => { active = true; el.setPointerCapture(e.pointerId); move(e); });
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", reset);
    el.addEventListener("pointercancel", reset);
  }
  setupStick("left", "left");
  setupStick("right", "right");

  function read() {
    state.x = (keys.has("ArrowRight") || keys.has("KeyD") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("KeyA") ? 1 : 0);
    state.pedal = keys.has("ArrowUp") || keys.has("KeyW") ? 1 : 0;
    state.brake = keys.has("ArrowDown") || keys.has("KeyS") ? 1 : 0;
    state.x = THREE.MathUtils.clamp(state.x + touchX, -1, 1);
    state.pedal = Math.max(state.pedal, -touchY);
    state.brake = Math.max(state.brake, touchY);
    return state;
  }

  function consumePauseRequest() {
    const p = pauseRequested;
    pauseRequested = false;
    return p;
  }

  return { read, consumePauseRequest };
}
