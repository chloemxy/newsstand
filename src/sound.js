// Paper sounds, synthesised: no audio files. A rustle is noise shaped by
// many tiny crackles over a soft swish, the way a sheet sounds as it slides
// and creases, then filtered to sit in the bright, papery range. Sound is
// on by default: the audio starts as the page loads, which works wherever
// the browser allows it (Chrome does for sites a person visits often, and
// people can allow it per site). Otherwise browsers hold it until the first
// click, tap or key press, and it starts then. The Sound button mutes it.

let ctx = null, out = null, muted = false;
const VOLUME = 0.45;
const button = document.getElementById('sound');

function render() {
  if (!button) return;
  const on = !muted;
  button.textContent = on ? 'Sound on' : 'Sound off';
  button.setAttribute('aria-pressed', String(on));
}

function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    // a gentle limiter, so crackles that pile up never clip
    const limit = new DynamicsCompressorNode(ctx, { threshold: -10, knee: 6, ratio: 8, attack: 0.002, release: 0.1 });
    out = new GainNode(ctx, { gain: muted ? 0 : VOLUME });
    out.connect(limit).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  render();
}
unlock(); // try straight away
for (const type of ['pointerdown', 'touchstart', 'keydown']) addEventListener(type, unlock, true);
button?.addEventListener('click', () => {
  muted = !muted;
  out?.gain.setTargetAtTime(muted ? 0 : VOLUME, ctx.currentTime, 0.02);
  render();
});
render();

// crackle scales the creases against the swish; air is where the top end
// rolls off (lower is softer)
// only while the audio is actually running: sounds started while the
// browser holds it would all play at once when it starts
const live = () => ctx && ctx.state === 'running' && !muted;

function rustle({ duration = 0.4, level = 0.3, grains = 30, swish = 0.25, tone = 3200, pan = 0, delay = 0, crackle = 1, air = 9000 } = {}) {
  if (!live()) return;
  const sr = ctx.sampleRate, n = Math.floor(duration * sr);
  const buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);

  // the envelope: a swell over the whole sound, plus short crackles that
  // bunch towards its middle
  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) env[i] = swish * Math.sin((Math.PI * i) / n) ** 1.5;
  for (let g = 0; g < grains; g++) {
    const at = Math.floor(((Math.random() + Math.random()) / 2) * n);
    const len = Math.floor((0.003 + Math.random() * 0.022) * sr), a = (0.25 + Math.random() * 0.75) * crackle;
    for (let i = 0; i < len && at + i < n; i++) env[at + i] += a * Math.exp((-6 * i) / len);
  }
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * env[i];

  const src = ctx.createBufferSource();
  src.buffer = buf;
  const low = new BiquadFilterNode(ctx, { type: 'highpass', frequency: 500 });
  const body = new BiquadFilterNode(ctx, { type: 'peaking', frequency: tone, Q: 0.7, gain: 6 });
  const soft = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: air });
  const gain = new GainNode(ctx, { gain: level });
  const side = new StereoPannerNode(ctx, { pan: Math.max(-1, Math.min(1, pan)) });
  src.connect(low).connect(body).connect(soft).connect(gain).connect(side).connect(out);
  src.start(ctx.currentTime + delay);
}

// A brass rod tapping a maple block: a short, hollow wooden knock (a
// filtered noise burst plus a quick low tone) with a faint metallic ring
// from the rod (two high, inharmonic partials that die away a little later).
function click({ level = 0.4, pan = 0, pitch = 1 } = {}) {
  if (!live()) return;
  const t = ctx.currentTime;
  const side = new StereoPannerNode(ctx, { pan: Math.max(-1, Math.min(1, pan)) });
  side.connect(out);

  const sr = ctx.sampleRate, n = Math.floor(0.03 * sr);
  const buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp((-8 * i) / n);
  const src = new AudioBufferSourceNode(ctx, { buffer: buf });
  const body = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 1700 * pitch, Q: 5 });
  src.connect(body).connect(new GainNode(ctx, { gain: level * 1.6 })).connect(side);
  src.start(t);

  const tone = (freq, gain, decay) => {
    const o = new OscillatorNode(ctx, { frequency: freq * pitch });
    const g = new GainNode(ctx, { gain: 0 });
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain * level, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(side);
    o.start(t); o.stop(t + decay + 0.02);
  };
  tone(820, 0.5, 0.05);    // the wood
  tone(3150, 0.07, 0.16);  // the brass
  tone(4730, 0.04, 0.12);
}

let lastHover = 0;

export const sound = {
  // for debugging: 'none' until the first click, then the context's state
  get state() { return ctx ? ctx.state : 'none'; },
  // the rod tips up off its block: a light click; pan is -1 (left) to 1
  hover(pan = 0) {
    const now = performance.now();
    if (now - lastHover < 90) return;
    lastHover = now;
    click({ level: 0.3, pan, pitch: 1.08 });
  },
  // and drops back onto it: a slightly lower, firmer knock
  unhover(pan = 0) {
    click({ level: 0.38, pan, pitch: 0.94 });
  },
  // lifting off the rod: a soft, unhurried slide of paper, few creases
  lift() {
    rustle({ duration: 0.7, level: 0.3, grains: 14, swish: 0.55, tone: 2200, crackle: 0.4, air: 5000 });
  },
  // the cover swinging open: a gentle airy swish with a hushed turn at the end
  open() {
    rustle({ duration: 0.6, level: 0.26, grains: 8, swish: 0.65, tone: 1800, crackle: 0.35, air: 4200 });
    rustle({ duration: 0.18, level: 0.12, grains: 5, swish: 0.3, tone: 2800, crackle: 0.4, air: 5000, delay: 0.45 });
  },
  // closing, folding over as it is lowered in, the rod sliding back
  // through the fold, and a last settle onto the blocks
  putBack() {
    rustle({ duration: 0.45, level: 0.5, grains: 26, swish: 0.45, tone: 2400 });
    rustle({ duration: 0.6, level: 0.4, grains: 24, swish: 0.45, tone: 2800, delay: 1.0 });
    rustle({ duration: 0.45, level: 0.3, grains: 26, swish: 0.3, tone: 3000, delay: 1.05 });
    rustle({ duration: 0.2, level: 0.3, grains: 12, swish: 0.2, tone: 3200, delay: 1.7 });
  },
};
