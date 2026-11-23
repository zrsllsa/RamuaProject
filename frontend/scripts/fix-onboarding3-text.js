/**
 * onboarding_3.json — text fix only (no asset / movement / layout change):
 *  - "Membuat Resep..." : text box widened so it stays on ONE line, and
 *    center-aligned on the loader bar (previously 93px box, left-aligned -> wrapped).
 *  - "0%".."100%"       : center-aligned inside their existing box (box already
 *    centered on the loader bar).
 * Original backed up once to assets-backup/onboarding_3.original.json.
 *
 * Run: node scripts/fix-onboarding3-text.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'assets', 'ramuanimation', 'onboarding_3.json');
const BACKUP = path.join(ROOT, 'assets-backup', 'onboarding_3.original.json');

if (!fs.existsSync(BACKUP)) {
  fs.mkdirSync(path.dirname(BACKUP), { recursive: true });
  fs.copyFileSync(FILE, BACKUP);
  console.log('Backup ->', BACKUP);
}
const anim = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));

const JUSTIFY_CENTER = 2;
const BAR_CENTER_X = 35.02799 + 104.6967 / 2; // loader bar (same parent space as the text)
const TITLE_BOX_W = 160;

let title = 0;
let percents = 0;

function visit(layers) {
  for (const l of layers || []) {
    if (l.ty !== 5) continue;
    for (const kf of l.t.d.k) {
      const doc = kf.s;
      if (/^Membuat Resep/.test(doc.t)) {
        const layerX = l.ks.p.k[0];
        doc.j = JUSTIFY_CENTER;
        doc.sz = [TITLE_BOX_W, doc.sz[1]];
        doc.ps = [BAR_CENTER_X - layerX - TITLE_BOX_W / 2, doc.ps[1]];
        title++;
      } else if (/^\d+%$/.test(doc.t)) {
        doc.j = JUSTIFY_CENTER;
        percents++;
      }
    }
    // The Figma exporter faked centering with per-letter position offsets ("kern N").
    // lottie-android ignores those (text ends up left-aligned on device), and with real
    // center alignment they would double-shift on web. Drop only those position-only kerns.
    if (Array.isArray(l.t.a) && l.t.d.k.some((kf) => /^\d+%$/.test(kf.s.t))) {
      l.t.a = l.t.a.filter(
        (an) => !(/^kern \d+$/.test(an.nm) && Object.keys(an.a || {}).every((k) => k === 'p'))
      );
    }
  }
}
visit(anim.layers);
for (const a of anim.assets || []) visit(a.layers);

fs.writeFileSync(FILE, JSON.stringify(anim));
console.log(`Fixed title=${title}, percents=${percents} ->`, FILE);
