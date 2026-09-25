// Moteur audio 100% procédural via Web Audio API. Aucun fichier son
// externe n'est chargé : tout est synthétisé (oscillateurs + bruit blanc
// filtré) au moment où le son est joué.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this._lastPlayed = {};
    this._rotorGain = null;
    this._rotorFilter = null;
    this._ambientStarted = false;
  }

  // Doit être appelé depuis un geste utilisateur (clic sur "DÉCOLLER"),
  // sinon la plupart des navigateurs bloquent l'AudioContext.
  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
    this.noiseBuffer = this._buildNoiseBuffer(2);
    this._startAmbient();
    this._startRotorLoop();
  }

  _buildNoiseBuffer(seconds) {
    const rate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, Math.floor(rate * seconds), rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  _noiseSource() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    return src;
  }

  // Drone grave de caverne : deux oscillateurs détunés passés dans un
  // filtre dont la fréquence de coupure oscille lentement (LFO), plus des
  // gouttes d'eau aléatoires programmées pour donner une sensation de
  // profondeur.
  _startAmbient() {
    if (this._ambientStarted) return;
    this._ambientStarted = true;
    const ctx = this.ctx;

    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.05;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 220;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 90;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    [55, 82.4].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;
      osc.connect(filter);
      osc.start();
    });
    filter.connect(droneGain).connect(this.master);

    const scheduleDrip = () => {
      const delay = 3 + Math.random() * 6;
      setTimeout(() => {
        if (!this.ctx) return;
        this._drip();
        scheduleDrip();
      }, delay * 1000);
    };
    scheduleDrip();
  }

  _drip() {
    const ctx = this.ctx, now = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(1400 + Math.random() * 500, now);
    o.frequency.exponentialRampToValueAtTime(600, now + 0.12);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.05, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    o.connect(g).connect(this.master);
    o.start(now); o.stop(now + 0.16);
  }

  // Flutter continu du rotor (bruit filtré en bande), toujours actif mais
  // dont le volume/la tonalité suit l'intensité de pédalage.
  _startRotorLoop() {
    const ctx = this.ctx;
    const src = this._noiseSource();
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 140;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
    this._rotorFilter = filter;
    this._rotorGain = gain;
  }

  // intensity: 0 (au repos) .. 1 (pédalage à fond). Appelé chaque frame.
  updateRotor(intensity) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this._rotorGain.gain.setTargetAtTime(0.02 + intensity * 0.09, now, 0.05);
    this._rotorFilter.frequency.setTargetAtTime(90 + intensity * 260, now, 0.08);
  }

  _throttled(key, minGapMs, fn) {
    const t = performance.now();
    if (t - (this._lastPlayed[key] || 0) < minGapMs) return;
    this._lastPlayed[key] = t;
    fn();
  }

  // Grognement de pédalage, style "effort/souffle". Throttlé en interne
  // pour ne jamais superposer des dizaines d'oscillateurs par seconde.
  pedalGrunt() {
    if (!this.ctx) return;
    this._throttled("pedal", 140, () => {
      const ctx = this.ctx, now = ctx.currentTime;
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      const g = ctx.createGain();
      const base = 105 + Math.random() * 20;
      o1.type = "sawtooth"; o1.frequency.setValueAtTime(base, now);
      o2.type = "sawtooth"; o2.frequency.setValueAtTime(base * 1.5, now);
      o1.frequency.exponentialRampToValueAtTime(base * 0.6, now + 0.09);
      o2.frequency.exponentialRampToValueAtTime(base * 0.9, now + 0.09);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass"; filter.frequency.value = 420;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.09, now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
      o1.connect(filter); o2.connect(filter); filter.connect(g).connect(this.master);
      o1.start(now); o2.start(now); o1.stop(now + 0.12); o2.stop(now + 0.12);
    });
  }

  _burst({ freq = 220, dur = 0.12, type = "sine", to = null, gain = 0.22 } = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx, now = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, now);
    o.frequency.exponentialRampToValueAtTime(to || Math.max(30, freq * 0.55), now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g).connect(this.master);
    o.start(now); o.stop(now + dur + 0.02);
  }

  _noiseBurst({ dur = 0.2, filterFreq = 900, filterType = "lowpass", gain = 0.3 } = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx, now = ctx.currentTime;
    const src = this._noiseSource();
    const filter = ctx.createBiquadFilter();
    filter.type = filterType; filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(now); src.stop(now + dur + 0.02);
  }

  land() { this._burst({ freq: 90, dur: 0.14, type: "sine", gain: 0.2 }); }

  crash() {
    // Impact = thump grave + bruit filtré, pas juste un bip générique.
    this._noiseBurst({ dur: 0.3, filterFreq: 500, filterType: "lowpass", gain: 0.35 });
    this._burst({ freq: 60, dur: 0.32, type: "sawtooth", to: 28, gain: 0.28 });
  }

  splash() { this._noiseBurst({ dur: 0.22, filterFreq: 1400, filterType: "bandpass", gain: 0.22 }); }
  board() { this._burst({ freq: 420, dur: 0.09, type: "triangle", gain: 0.2 }); }
  coin() { this._burst({ freq: 720, dur: 0.16, type: "sine", gain: 0.22 }); }
  yell() { this._burst({ freq: 330, dur: 0.18, type: "sawtooth", gain: 0.22 }); }
  warning() { this._throttled("warning", 900, () => this._burst({ freq: 240, dur: 0.09, type: "square", gain: 0.14 })); }
}
