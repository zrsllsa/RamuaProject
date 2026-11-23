/**
 * Generates assets/sounds/splash_logo.wav — a cute sound synced to
 * assets/ramuanimation/animasi_logoramua.json (60fps, 200 frames ≈ 3.33s).
 *
 * Timeline (from Lottie keyframes):
 *   f17.5  (0.29s) maskot muncul naik      -> soft pop
 *   f44-60 (0.74-1.0s) judul pop + kilau mata -> sparkle / shining
 *   f115-139 (1.93-2.32s) topi jatuh          -> falling whistle + BOING on land
 *   f139-153 (2.32-2.56s) maskot squash      -> then cute mumble "hmm-hmm~"
 *
 * Run: node scripts/generate-splash-sound.js
 */
const fs = require('fs');
const path = require('path');

const SR = 44100;
const DURATION = 3.6;
const N = Math.ceil(SR * DURATION);
const out = new Float32Array(N);

const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// Simple seeded noise for reproducible output
let seed = 1234567;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

function add(startSec, buf, gain = 1) {
  const s0 = Math.round(startSec * SR);
  for (let i = 0; i < buf.length; i++) {
    const j = s0 + i;
    if (j >= 0 && j < N) out[j] += buf[i] * gain;
  }
}

/** RBJ biquad */
function biquad(type, freq, q, gainDb = 0) {
  const w0 = (TAU * freq) / SR;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  const A = Math.pow(10, gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lowpass') {
    b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2;
    a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
  } else if (type === 'bandpass') {
    b0 = alpha; b1 = 0; b2 = -alpha;
    a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
  } else if (type === 'highpass') {
    b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2;
    a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
  } else {
    // peaking
    b0 = 1 + alpha * A; b1 = -2 * cos; b2 = 1 - alpha * A;
    a0 = 1 + alpha / A; a1 = -2 * cos; a2 = 1 - alpha / A;
  }
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

// ---------- 1. Soft pop (mascot appears) ----------
function pop() {
  const len = Math.round(SR * 0.16);
  const b = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 320 + 900 * (1 - Math.exp(-t * 40)); // quick upward "bloop"
    ph += (TAU * f) / SR;
    const env = Math.min(1, t / 0.004) * Math.exp(-t * 28);
    b[i] = Math.sin(ph) * env;
  }
  return b;
}

// ---------- 2. Sparkle / shining ----------
function bell(freq, dur) {
  const len = Math.round(SR * dur);
  const b = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.002) * Math.exp(-t * 9);
    b[i] =
      env *
      (Math.sin(TAU * freq * t) +
        0.35 * Math.sin(TAU * freq * 2.76 * t) * Math.exp(-t * 14) +
        0.15 * Math.sin(TAU * freq * 5.4 * t) * Math.exp(-t * 22));
  }
  return b;
}

function shimmer(dur) {
  const len = Math.round(SR * dur);
  const b = new Float32Array(len);
  const bp = biquad('bandpass', 7000, 2.5);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.sin(Math.PI * clamp(t / dur, 0, 1)) ** 2;
    const trem = 0.6 + 0.4 * Math.sin(TAU * 22 * t);
    b[i] = bp(rand() * 2 - 1) * env * trem;
  }
  return b;
}

// ---------- 3. Hat drop: falling whistle + boing ----------
function whistle(dur) {
  const len = Math.round(SR * dur);
  const b = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const p = t / dur;
    const f = 1500 * Math.pow(500 / 1500, p) * (1 + 0.012 * Math.sin(TAU * 7 * t));
    ph += (TAU * f) / SR;
    const env = Math.min(1, p / 0.25) * (1 - 0.3 * p);
    b[i] = Math.sin(ph) * env;
  }
  return b;
}

function boing(dur) {
  const len = Math.round(SR * dur);
  const b = new Float32Array(len);
  let ph = 0;
  const lp = biquad('lowpass', 2400, 0.8);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    // spring: pitch wobbles around a rising center, wobble decays
    const center = 210 + 140 * (1 - Math.exp(-t * 6));
    const wobble = 0.45 * Math.exp(-t * 5.5) * Math.sin(TAU * 16 * t);
    const f = center * (1 + wobble);
    ph += (TAU * f) / SR;
    const env = Math.min(1, t / 0.003) * Math.exp(-t * 5.2);
    // slightly rounded square-ish tone for a rubbery feel
    const tone = Math.sin(ph) + 0.28 * Math.sin(2 * ph) + 0.12 * Math.sin(3 * ph);
    b[i] = lp(tone) * env;
  }
  // tiny thump on impact
  for (let i = 0; i < Math.round(SR * 0.05); i++) {
    const t = i / SR;
    b[i] += 0.6 * Math.sin(TAU * 110 * t) * Math.exp(-t * 60);
  }
  return b;
}

// ---------- 4. Cute mumble "hmm-hmm~" ----------
function hum(dur, pitchFn, volFn) {
  const len = Math.round(SR * dur);
  const b = new Float32Array(len);
  let ph = 0;
  // closed-mouth nasal hum formants
  const f1 = biquad('peaking', 300, 1.2, 9);
  const f2 = biquad('peaking', 1100, 2.0, 3);
  const f3 = biquad('peaking', 2700, 3.0, 4);
  const lp = biquad('lowpass', 3200, 0.7);
  const hp = biquad('highpass', 120, 0.7);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const p = t / dur;
    const vib = 1 + 0.018 * Math.sin(TAU * 6.2 * t) * clamp((t - 0.05) / 0.1, 0, 1);
    const f = pitchFn(p) * vib;
    ph += f / SR;
    ph -= Math.floor(ph);
    // soft glottal-ish pulse (band-limited by sum of harmonics)
    let src = 0;
    for (let h = 1; h <= 10; h++) src += Math.sin(TAU * h * ph) / Math.pow(h, 1.3);
    src += (rand() * 2 - 1) * 0.02; // breath
    const y = lp(hp(f3(f2(f1(src)))));
    b[i] = y * volFn(p);
  }
  return b;
}

const syllEnv = (atk, rel) => (p) =>
  Math.min(1, p / atk) * Math.min(1, (1 - p) / rel);

// ---------- Soft variants (versi lembut) ----------
const softEnv = (t, atk, decay) => (t < atk ? Math.sin((Math.PI / 2) * (t / atk)) ** 2 : 1) * Math.exp(-(t - Math.min(t, atk)) * decay);

function softPop() {
  const len = Math.round(SR * 0.22);
  const b = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 260 + 380 * (1 - Math.exp(-t * 22)); // sweep pelan, nada rendah
    ph += (TAU * f) / SR;
    b[i] = Math.sin(ph) * softEnv(t, 0.018, 16);
  }
  return b;
}

function softBell(freq, dur) {
  const len = Math.round(SR * dur);
  const b = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = softEnv(t, 0.012, 5.5);
    b[i] = env * (Math.sin(TAU * freq * t) + 0.12 * Math.sin(TAU * freq * 2 * t) * Math.exp(-t * 10));
  }
  return b;
}

function softWhistle(dur) {
  const len = Math.round(SR * dur);
  const b = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const p = t / dur;
    const f = 1100 * Math.pow(560 / 1100, p);
    ph += (TAU * f) / SR;
    b[i] = Math.sin(ph) * Math.sin(Math.PI * p) ** 2; // fade in & out
  }
  return b;
}

function softBoing(dur) {
  const len = Math.round(SR * dur);
  const b = new Float32Array(len);
  let ph = 0;
  const lp = biquad('lowpass', 1300, 0.6);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const center = 240 + 90 * (1 - Math.exp(-t * 6));
    const wobble = 0.22 * Math.exp(-t * 6) * Math.sin(TAU * 12 * t);
    ph += (TAU * center * (1 + wobble)) / SR;
    const tone = Math.sin(ph) + 0.15 * Math.sin(2 * ph);
    b[i] = lp(tone) * softEnv(t, 0.02, 5);
  }
  return b;
}

/** Reverb ringan (Schroeder) supaya transisi antar efek menyatu */
function reverb(buf, mix) {
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ d, buf: new Float32Array(d), i: 0, lp: 0 }));
  const aps = [225, 556].map((d) => ({ d, buf: new Float32Array(d), i: 0 }));
  const wet = new Float32Array(buf.length);
  for (let n = 0; n < buf.length; n++) {
    let y = 0;
    for (const c of combs) {
      const o = c.buf[c.i];
      c.lp = o * 0.6 + c.lp * 0.4;
      c.buf[c.i] = buf[n] * 0.25 + c.lp * 0.78;
      c.i = (c.i + 1) % c.d;
      y += o;
    }
    for (const a of aps) {
      const o = a.buf[a.i];
      const v = y + o * 0.5;
      a.buf[a.i] = v;
      a.i = (a.i + 1) % a.d;
      y = o - v * 0.5;
    }
    wet[n] = y;
  }
  for (let n = 0; n < buf.length; n++) buf[n] = buf[n] * (1 - mix) + wet[n] * mix;
}

// ---------- Compose (versi lembut, efek tidak saling tumpang tindih) ----------
add(0.27, softPop(), 0.22);

// shining: 3 denting lembut + kilau tipis
[1568, 2093, 2637].forEach((f, k) => add(0.84 + k * 0.09, softBell(f, 0.8), 0.075));
add(0.84, shimmer(0.5), 0.02);
add(1.47, softBell(3136, 0.45), 0.03); // kilau mata, sangat pelan

// topi jatuh -> boing lembut
add(1.96, softWhistle(0.36), 0.05);
add(2.31, softBoing(0.6), 0.3);

// gumaman maskot: satu "hmmmmm~" anak kecil yang sangat lembut
function childHum(dur) {
  const len = Math.round(SR * dur);
  const buf = new Float32Array(len);
  let ph = 0;
  // formant nasal suara anak (lebih tinggi dari dewasa), dibuat redup
  const f1 = biquad('peaking', 340, 1.0, 8);
  const f2 = biquad('peaking', 1400, 2.5, 2);
  const lp = biquad('lowpass', 1900, 0.6);
  const lp2 = biquad('lowpass', 2400, 0.6);
  const hp = biquad('highpass', 180, 0.7);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const p = t / dur;
    // nada anak ~330-400Hz: naik pelan, lalu turun puas "hmmm~"
    const base = 335 + 55 * Math.sin(Math.PI * Math.min(1, p * 1.6)) - 25 * p;
    const vib = 1 + 0.012 * Math.sin(TAU * 5.5 * t) * clamp((p - 0.25) / 0.3, 0, 1);
    ph += (base * vib) / SR;
    ph -= Math.floor(ph);
    let src = 0;
    for (let h = 1; h <= 8; h++) src += Math.sin(TAU * h * ph) / Math.pow(h, 2.0); // redup, tidak tajam
    src += (rand() * 2 - 1) * 0.008; // sedikit napas
    // envelope sangat lembut: masuk & keluar pelan
    const env = Math.sin(Math.PI * Math.min(1, p / 0.3) / 2) ** 2 * Math.cos((Math.PI / 2) * clamp((p - 0.55) / 0.45, 0, 1)) ** 2;
    buf[i] = lp2(lp(hp(f2(f1(src))))) * env;
  }
  return buf;
}
add(2.62, childHum(0.78), 0.2);

// ---------- Master: low-pass halus + reverb + normalize ----------
const masterLp = biquad('lowpass', 6500, 0.7);
for (let i = 0; i < N; i++) out[i] = masterLp(out[i]);
reverb(out, 0.18);
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[i]));
const norm = peak > 0 ? 0.6 / peak : 1;
const fade = Math.round(SR * 0.25);
for (let i = 0; i < N; i++) {
  out[i] *= norm;
  if (i > N - fade) out[i] *= (N - i) / fade;
}

// ---------- Write WAV (16-bit PCM mono) ----------
const data = Buffer.alloc(N * 2);
for (let i = 0; i < N; i++) data.writeInt16LE(Math.round(clamp(out[i], -1, 1) * 32767), i * 2);
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(data.length, 40);

const dir = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, 'splash_logo.wav');
fs.writeFileSync(file, Buffer.concat([header, data]));
console.log('Wrote', file, `${(data.length / 1024).toFixed(0)} KB`);
