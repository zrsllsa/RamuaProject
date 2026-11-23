/**
 * Smooths onboarding_1.json motion WITHOUT changing assets, layout, keyframe
 * values or timing. Only the interpolation between existing keyframes changes:
 *
 *  - Position keyframes that were piecewise-LINEAR (orbit drawn as a polygon)
 *    get Catmull-Rom spatial tangents (to/ti) -> the same points, but a round path.
 *  - Scalar keyframes that were LINEAR (rotation wobble) get monotone cubic
 *    easing (Fritsch–Carlson) -> continuous velocity, no overshoot.
 *
 * Already-eased or densely baked keyframes (gap <= 2 frames) are left untouched.
 * The original file is backed up once to assets-backup/onboarding_1.original.json.
 *
 * Run: node scripts/smooth-onboarding1.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'assets', 'ramuanimation', 'onboarding_1.json');
const BACKUP_DIR = path.join(ROOT, 'assets-backup');
const BACKUP = path.join(BACKUP_DIR, 'onboarding_1.original.json');

if (!fs.existsSync(BACKUP)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.copyFileSync(FILE, BACKUP);
  console.log('Backup ->', BACKUP);
}

// Always start from the pristine original so the script is idempotent
const anim = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));

const first = (v) => (Array.isArray(v) ? v[0] : v);
const isLinear = (k) =>
  k.o && k.i && Math.abs(first(k.o.x) - first(k.o.y)) < 0.01 && Math.abs(first(k.i.x) - first(k.i.y)) < 0.01;

function eligible(prop) {
  if (!prop || prop.a !== 1 || !Array.isArray(prop.k) || prop.k.length < 3) return false;
  const ks = prop.k;
  if (ks[0].t === undefined) return false;
  for (let i = 0; i < ks.length - 1; i++) {
    if (!isLinear(ks[i]) || ks[i].h === 1) return false;
    if (ks[i + 1].t - ks[i].t <= 2) return false; // baked keys -> leave as is
  }
  return true;
}

const vals = (ks) => ks.map((k) => k.s);
const isLoop = (v) => v[0].every((x, d) => Math.abs(x - v[v.length - 1][d]) < 1e-3);

let posCount = 0;
let scalarCount = 0;

function smoothPosition(prop) {
  const ks = prop.k;
  if (ks.some((k) => k.to || k.ti)) return; // already spatial
  const P = vals(ks);
  const n = P.length;
  const loop = isLoop(P);
  const at = (i) => {
    if (loop) {
      const m = n - 1;
      return P[((i % m) + m) % m];
    }
    return P[Math.max(0, Math.min(n - 1, i))];
  };
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    ks[i].to = p1.map((_, d) => (p2[d] - p0[d]) / 6);
    ks[i].ti = p1.map((_, d) => -(p3[d] - p1[d]) / 6);
  }
  posCount++;
}

function smoothScalar(prop) {
  const ks = prop.k;
  const V = vals(ks).map((s) => (Array.isArray(s) ? s : [s]));
  const n = V.length;
  const dims = V[0].length;
  const loop = isLoop(V);
  for (let d = 0; d < dims; d++) {
    const v = V.map((x) => x[d]);
    const t = ks.map((k) => k.t);
    const delta = [];
    for (let i = 0; i < n - 1; i++) delta.push((v[i + 1] - v[i]) / (t[i + 1] - t[i]));
    const m = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let a = i > 0 ? delta[i - 1] : loop ? delta[n - 2] : 0;
      let b = i < n - 1 ? delta[i] : loop ? delta[0] : 0;
      m[i] = a * b > 0 ? 2 / (1 / a + 1 / b) : 0; // monotone (Fritsch–Carlson)
    }
    for (let i = 0; i < n - 1; i++) {
      const k = ks[i];
      const dk = delta[i];
      let oy = 0, iy = 1;
      if (Math.abs(dk) > 1e-9) {
        oy = m[i] / (3 * dk);
        iy = 1 - m[i + 1] / (3 * dk);
      }
      const toArr = (v, def) => (Array.isArray(v) ? v.slice() : new Array(dims).fill(v ?? def));
      const ox = toArr(k.o.x, 0), oyA = toArr(k.o.y, 0), ix = toArr(k.i.x, 1), iyA = toArr(k.i.y, 1);
      ox[d] = 1 / 3; oyA[d] = oy; ix[d] = 2 / 3; iyA[d] = iy;
      k.o = { x: ox, y: oyA };
      k.i = { x: ix, y: iyA };
    }
  }
  scalarCount++;
}

function visitTransform(tr) {
  if (!tr) return;
  for (const key of ['p', 'a']) if (eligible(tr[key]) && Array.isArray(tr[key].k[0].s) && tr[key].k[0].s.length >= 2) smoothPosition(tr[key]);
  for (const key of ['r', 'o']) if (eligible(tr[key])) smoothScalar(tr[key]);
}
function visitShapes(items) {
  for (const it of items || []) {
    if (it.ty === 'tr') visitTransform(it);
    if (it.it) visitShapes(it.it);
  }
}
function visitLayers(layers) {
  for (const l of layers || []) {
    visitTransform(l.ks);
    visitShapes(l.shapes);
  }
}
visitLayers(anim.layers);
for (const a of anim.assets || []) visitLayers(a.layers);

fs.writeFileSync(FILE, JSON.stringify(anim));
console.log(`Smoothed ${posCount} position + ${scalarCount} scalar properties ->`, FILE);
