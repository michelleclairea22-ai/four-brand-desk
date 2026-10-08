#!/usr/bin/env node
/*
 * Uniqueness checker untuk Four-Brand Content Desk.
 * Guna:  node tools/check-unique.js data/2026-10.js [--drafts /workspace/drafts] [--jaccard 0.6]
 * FAIL (exit 1): struktur salah, idea/hook/brand+angle sama, Jaccard(idea+hook) > threshold, sebut "Brutti".
 * WARN (exit 0): bertindih dengan tema dalam /workspace/drafts atau fail bulan sebelumnya.
 *   Post boleh letak "reuseOk": "sebab" untuk tanda angle baru yang disengajakan (WARN jadi INFO).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const file = args.find(a => a.endsWith('.js'));
if (!file) { console.error('Usage: node tools/check-unique.js data/YYYY-MM.js [--drafts DIR] [--jaccard 0.6]'); process.exit(2); }
const DRAFTS = opt('--drafts', '/workspace/drafts');
const JT = parseFloat(opt('--jaccard', '0.6'));
const BRANDS = ['selesaai', 'tumbooh', 'saja', 'badax'];
const FORMATS = ['Reel/Video', 'Photo/Static', 'Carousel/Info', 'Story/Thread'];
const STOP = new Set('a an the and or of to in on for is it di ke dan yang untuk ini ni itu tu ka bah saja jak je kau kamu dah sudah pun dengan dari atau macam ada tak tapi lagi satu bila apa mana nak mau'.split(' '));

function loadMonth(f) {
  const ctx = { window: { MONTHS: {} } };
  vm.runInNewContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
  const keys = Object.keys(ctx.window.MONTHS);
  if (keys.length !== 1) throw new Error(`${f}: expected exactly 1 month, got ${keys.length}`);
  return ctx.window.MONTHS[keys[0]];
}
const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const toks = s => new Set(norm(s).split(' ').filter(w => w.length > 2 && !STOP.has(w)));
const jac = (a, b) => { if (!a.size || !b.size) return 0; let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); };
const tag = p => `${p.date} ${p.brand} "${p.idea}"`;

const errors = [], warns = [], infos = [];
const month = loadMonth(file);
const posts = month.posts || [];
const [Y, M] = (month.month || '').split('-').map(Number);
const daysIn = new Date(Y, M, 0).getDate();

// ---- structure
if (!Y || !M) errors.push('month key missing/invalid (expected "YYYY-MM")');
const seenSlot = new Set();
posts.forEach((p, i) => {
  const t = `#${i + 1} ${p.date || '?'} ${p.brand || '?'}`;
  for (const k of ['date', 'brand', 'pillar', 'angle', 'idea', 'hook', 'format']) if (!p[k] || !String(p[k]).trim()) errors.push(`${t}: field "${k}" kosong`);
  if (!BRANDS.includes(p.brand)) errors.push(`${t}: brand tak dikenali`);
  if (p.format && !FORMATS.includes(p.format)) errors.push(`${t}: format "${p.format}" bukan ${FORMATS.join(' | ')}`);
  if (!Array.isArray(p.steps) || p.steps.length < 2 || p.steps.length > 4) errors.push(`${t}: steps mesti 2-4`);
  if (!Array.isArray(p.times) || !p.times.length) errors.push(`${t}: times kosong`);
  if (p.date && !p.date.startsWith(month.month)) errors.push(`${t}: tarikh luar bulan ${month.month}`);
  const slot = p.date + '|' + p.brand;
  if (seenSlot.has(slot)) errors.push(`${t}: lebih dari satu post untuk brand ni pada tarikh sama`);
  seenSlot.add(slot);
  if (/brutti/i.test(JSON.stringify(p))) errors.push(`${t}: ada sebut "Brutti" (luar skop)`);
});
for (let d = 1; d <= daysIn; d++) for (const b of BRANDS) {
  const ds = `${month.month}-${String(d).padStart(2, '0')}`;
  if (!seenSlot.has(ds + '|' + b)) errors.push(`missing post: ${ds} ${b}`);
}

// ---- uniqueness within month
const dup = (label, keyFn) => {
  const m = new Map();
  for (const p of posts) { const k = keyFn(p); if (!k) continue; if (m.has(k)) errors.push(`DUPLICATE ${label}: ${tag(m.get(k))}  <->  ${tag(p)}`); else m.set(k, p); }
};
dup('idea', p => norm(p.idea));
dup('hook', p => norm(p.hook));
dup('brand+angle', p => p.brand + '|' + norm(p.angle));
const T = posts.map(p => toks(p.idea + ' ' + p.hook));
for (let i = 0; i < posts.length; i++) for (let j = i + 1; j < posts.length; j++) {
  const s = jac(T[i], T[j]);
  if (s > JT) errors.push(`SIMILAR idea+hook (Jaccard ${s.toFixed(2)}): ${tag(posts[i])}  <->  ${tag(posts[j])}`);
}

// ---- overlap with drafts (themes) — warnings only
const draftThemes = []; // {brand, text, src}
const brandOf = s => BRANDS.find(b => s.toLowerCase().includes(b)) || null;
function walk(dir) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) { if (/brutti|^cand/i.test(e.name)) continue; walk(fp); continue; }
    const b = brandOf(fp); if (!b) continue;
    // filename theme, e.g. poster_oct6_tandas.json / tumbooh-oct8-deadline/caption.md
    const nameTheme = (path.basename(fp).replace(/\.[a-z0-9]+$/i, '') + ' ' + path.basename(path.dirname(fp)))
      .replace(/poster|caption|draft[s]?|bg|oct\d*|v\d|src|week\d*|selesaai|tumbooh|saja|badax|sheet|contact|_| -|\d+/gi, ' ');
    if (/\.(json|md|txt|png|jpg)$/i.test(e.name)) draftThemes.push({ brand: b, text: nameTheme, src: fp, kind: 'name' });
    try {
      if (e.name.endsWith('.json')) {
        const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
        const items = Array.isArray(j) ? j : [j];
        for (const it of items) { const h = [].concat(it.headline || [], it.hook || []).join(' '); if (h) draftThemes.push({ brand: b, text: h, src: fp, kind: 'text' }); }
      } else if (/\.(md|txt)$/.test(e.name)) {
        const lines = fs.readFileSync(fp, 'utf8').split('\n');
        lines.filter(l => /^#{1,3} /.test(l)).forEach(l => draftThemes.push({ brand: b, text: l.replace(/^#+\s*/, ''), src: fp, kind: 'text' }));
        const first = lines.find(l => l.trim() && !/^(#|\d+\.|brand|channel)/i.test(l.trim()));
        if (first) draftThemes.push({ brand: b, text: first, src: fp, kind: 'text' });
      }
    } catch { /* ignore unreadable */ }
  }
}
// Known used themes (Dina knowledge pack, 8 Okt 2026)
const KNOWN = { selesaai: ['aircond', 'tandas', 'pintu berbunyi', 'shower', 'suis', 'tingkap', 'soket', 'breaker', 'langsir', 'flush', 'rak dinding', 'water heater', 'sinki', 'kipas', 'almari', 'lampu', 'paip bocor'],
  tumbooh: ['tip dokumen', 'shortlist', 'jejak audit', 'tarikh tutup', 'jejak permohonan', 'laporan', 'deadline', 'reviewer', 'universiti', 'ngo', 'csr', 'mesyuarat', 'borang'],
  saja: ['rm900', 'weekend', 'housemate', 'pindah', 'hias bilik', 'katil', 'bil'],
  badax: ['gear', 'road story', 'diy paint', 'tiktok', 'storage', 'glacier', 'salji', 'kabin kayu'] };
if (fs.existsSync(DRAFTS)) walk(DRAFTS); else infos.push(`drafts folder tak jumpa (${DRAFTS}) — skip semakan draft`);
// Single generic words from file names (service categories etc.) are too broad to count as a theme.
const GENERIC = new Set(['kunci', 'paip', 'elektrik', 'handyman', 'build', 'status', 'siapa', 'buka', 'mula', 'poster', 'illustration', 'logo', 'week']);
const DT = draftThemes.map(d => ({ ...d, t: toks(d.text) }))
  .filter(d => d.kind === 'text' || d.t.size > 1 || [...d.t].every(w => w.length >= 5 && !GENERIC.has(w)));
for (const p of posts) {
  const hits = [];
  const text = ' ' + norm(p.idea + ' ' + p.hook + ' ' + p.angle) + ' ';
  for (const k of KNOWN[p.brand] || []) if (text.includes(' ' + k + ' ')) hits.push(`tema "${k}" dah pernah dibuat (knowledge pack)`);
  const pt = toks(p.idea + ' ' + p.hook);
  for (const d of DT) {
    if (d.brand !== p.brand) continue;
    const s = jac(pt, d.t);
    if ((d.kind === 'text' && s >= 0.4) || (d.kind === 'name' && d.t.size && [...d.t].every(w => pt.has(w)))) hits.push(`mirip draft "${d.text.trim().slice(0, 60)}" (${path.relative(DRAFTS, d.src)})`);
  }
  if (hits.length) (p.reuseOk ? infos : warns).push(`${tag(p)}: ${[...new Set(hits)].slice(0, 3).join('; ')}${p.reuseOk ? `  [reuseOk: ${p.reuseOk}]` : ''}`);
}

// ---- overlap with earlier months
const dataDir = path.dirname(path.resolve(file));
for (const f of fs.readdirSync(dataDir).filter(f => /^\d{4}-\d{2}\.js$/.test(f)).sort()) {
  const m = f.slice(0, 7);
  if (m >= month.month) continue;
  let prev; try { prev = loadMonth(path.join(dataDir, f)); } catch (e) { warns.push(`tak boleh load ${f}: ${e.message}`); continue; }
  const PT = (prev.posts || []).map(q => ({ q, t: toks(q.idea + ' ' + q.hook) }));
  for (const p of posts) {
    const pt = toks(p.idea + ' ' + p.hook);
    for (const { q, t } of PT) if (q.brand === p.brand && (norm(q.idea) === norm(p.idea) || jac(pt, t) > JT)) warns.push(`${tag(p)}: bertindih dengan ${m} ${tag(q)}`);
  }
}

// ---- report
const byBrand = BRANDS.map(b => `${b}=${posts.filter(p => p.brand === b).length}`).join(' ');
const fm = FORMATS.map(f => `${f}=${posts.filter(p => p.format === f).length}`).join(' ');
console.log(`Checked ${file}: ${posts.length} posts (${byBrand}); ${daysIn} hari; formats: ${fm}`);
console.log(`Draft themes scanned: ${draftThemes.length}`);
infos.forEach(s => console.log('INFO  ' + s));
warns.forEach(s => console.log('WARN  ' + s));
errors.forEach(s => console.log('FAIL  ' + s));
console.log(errors.length ? `\nRESULT: FAIL (${errors.length} error, ${warns.length} warning)` : `\nRESULT: PASS (${warns.length} warning, ${infos.length} info)`);
process.exit(errors.length ? 1 : 0);
