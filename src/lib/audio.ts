// ─────────────────────────────────────────────────────────────────────────────
// Audio sintetizado con WebAudio: sin ficheros externos.
// ─────────────────────────────────────────────────────────────────────────────
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let engineOsc: OscillatorNode | null = null;
let engineGain: GainNode | null = null;
let engineFilter: BiquadFilterNode | null = null;

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio() { ensure(); }

export function setMuted(m: boolean) {
  muted = m;
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.02);
}
export const isMuted = () => muted;

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.3, slideTo?: number, delay = 0) {
  const c = ensure(); if (!c || !master) return;
  const o = c.createOscillator();
  const g = c.createGain();
  const t0 = c.currentTime + delay;
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function noise(dur: number, vol = 0.3, filterFreq = 1200, type: BiquadFilterType = "lowpass") {
  const c = ensure(); if (!c || !master) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = type; f.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start();
}

export const sfx = {
  click: () => tone(880, 0.05, "square", 0.08),
  select: () => { tone(660, 0.06, "square", 0.08); tone(990, 0.08, "square", 0.08, undefined, 0.06); },
  cash: () => { tone(1320, 0.08, "square", 0.12); tone(1760, 0.14, "square", 0.12, undefined, 0.08); noise(0.08, 0.05, 6000, "highpass"); },
  bigCash: () => { [0, 0.08, 0.16, 0.24].forEach((d, i) => tone(880 * Math.pow(1.25, i), 0.16, "square", 0.12, undefined, d)); },
  punch: () => { noise(0.09, 0.35, 500); tone(120, 0.08, "sine", 0.3, 50); },
  swing: () => noise(0.12, 0.12, 900, "bandpass"),
  shot: () => { noise(0.14, 0.6, 1800); tone(180, 0.1, "square", 0.25, 40); },
  hurt: () => { tone(220, 0.15, "sawtooth", 0.2, 90); noise(0.1, 0.15, 800); },
  pickup: () => { tone(1046, 0.07, "triangle", 0.2); tone(1568, 0.12, "triangle", 0.2, undefined, 0.07); },
  heal: () => { tone(523, 0.1, "triangle", 0.18); tone(659, 0.1, "triangle", 0.18, undefined, 0.1); tone(784, 0.18, "triangle", 0.18, undefined, 0.2); },
  missionStart: () => { tone(523, 0.12, "square", 0.12); tone(784, 0.2, "square", 0.12, undefined, 0.12); },
  missionComplete: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, "triangle", 0.2, undefined, i * 0.13)); tone(1318, 0.5, "triangle", 0.2, undefined, 0.55); },
  missionFail: () => { tone(330, 0.3, "sawtooth", 0.18, 160); tone(220, 0.5, "sawtooth", 0.18, 90, 0.3); },
  levelUp: () => { [659, 784, 988, 1318].forEach((f, i) => tone(f, 0.16, "square", 0.12, undefined, i * 0.08)); },
  enemyDown: () => { tone(300, 0.25, "sawtooth", 0.2, 60); noise(0.25, 0.2, 400); },
  wanted: () => { tone(900, 0.12, "square", 0.1); tone(700, 0.12, "square", 0.1, undefined, 0.14); tone(900, 0.12, "square", 0.1, undefined, 0.28); },
  siren: () => { tone(700, 0.35, "sine", 0.06, 950); tone(950, 0.35, "sine", 0.06, 700, 0.35); },
  carEnter: () => { tone(200, 0.15, "sawtooth", 0.12, 400); },
  carExit: () => { tone(400, 0.15, "sawtooth", 0.12, 150); },
  crash: () => { noise(0.3, 0.4, 600); tone(90, 0.25, "sine", 0.3, 30); },
  error: () => { tone(200, 0.12, "square", 0.1); tone(160, 0.18, "square", 0.1, undefined, 0.12); },
  victory: () => { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.3, "triangle", 0.2, undefined, i * 0.15)); },
  death: () => { tone(400, 0.6, "sawtooth", 0.2, 60); noise(0.6, 0.2, 300); },
};

export const engine = {
  start() {
    const c = ensure(); if (!c || !master || engineOsc) return;
    engineOsc = c.createOscillator();
    engineOsc.type = "sawtooth";
    engineOsc.frequency.value = 60;
    engineFilter = c.createBiquadFilter();
    engineFilter.type = "lowpass";
    engineFilter.frequency.value = 400;
    engineGain = c.createGain();
    engineGain.gain.value = 0.0001;
    engineOsc.connect(engineFilter); engineFilter.connect(engineGain); engineGain.connect(master);
    engineOsc.start();
    engineGain.gain.exponentialRampToValueAtTime(0.08, c.currentTime + 0.3);
  },
  update(speedRatio: number) {
    if (!engineOsc || !ctx || !engineGain || !engineFilter) return;
    const r = Math.max(0, Math.min(1, speedRatio));
    engineOsc.frequency.setTargetAtTime(55 + r * 160, ctx.currentTime, 0.08);
    engineFilter.frequency.setTargetAtTime(350 + r * 900, ctx.currentTime, 0.08);
    engineGain.gain.setTargetAtTime(0.05 + r * 0.06, ctx.currentTime, 0.1);
  },
  stop() {
    if (!engineOsc || !ctx || !engineGain) return;
    const o = engineOsc; const g = engineGain;
    g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1);
    setTimeout(() => { try { o.stop(); } catch { /* ya parado */ } }, 400);
    engineOsc = null; engineGain = null; engineFilter = null;
  },
};
