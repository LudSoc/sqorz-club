// Assemble le mapping clubs.json : auto (règles sûres) + adjudications manuelles.
// Rejouable : node tools/clubs/clubs-build.cjs (entrées = ce dossier, sortie = ../../clubs.json).
// La couverture (% engagements) requiert ../.. /sqorz_stats/pilots-index.json en local.
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const auto = JSON.parse(fs.readFileSync(path.join(DIR, 'match-auto.json'), 'utf8'));
const review = JSON.parse(fs.readFileSync(path.join(DIR, 'match-review.json'), 'utf8'));
const byCode = new Map(review.map(r => [r.code, r]));
const cleanCity = s => String(s || '').replace(/^\d{5}\s+/, '').replace(/\s+/g, ' ').trim() || null;

// code -> 'best' | 'second' | {name, city} (vérifiés un par un, cf. session)
const MANUAL = {
  BICLUB: 'best', 'LR-YON': 'best', LPMIRA: 'best', STAVER: 'best', ARGTAN: 'best',
  STNAZA: 'best', STBRIE: 'best', MONTME: 'best', ASTBMX: 'best',
  AVNSAN: 'best', STMAXI: 'best', RID07: 'best', CHANCX: 'best', LUCBMX: 'best',
  VALBMX: 'best', PRQBMX: 'best', PTEVEQ: 'best', STQUEN: 'best', STMARC: 'best',
  MTDMAR: 'best', MER: 'best', UVA: 'best', STP3CH: 'best', CHARTR: 'best',
  VILLSG: 'best', BMXLUC: 'best',
  PERNES: 'second', STEVIC: 'second', CHGONT: 'second', STGEOR: 'second',
  VITROL: { name: 'VITROLLES VELO CLUB BMX', city: 'VITROLLES' },
  BLAGNA: 'best',
  USCBMX: { name: 'US CAGNES BMX', city: 'CAGNES SUR MER' },
  BIKRAC: { name: 'BIKE RACING ACADEMY', city: 'SAIX' },
  FAMILY: { name: 'FAMILY BMX TARASCON', city: 'TARASCON' },
  BEYNOS: { name: "AIN'PULSION COTIERE BMX", city: 'BEYNOST' },
  MEDOC: { name: 'Médoc BMX', city: 'AVENSAN' },
  CSSD: { name: 'CLUB SPORTIF SAINT DENIS BMX 974', city: 'SAINT-DENIS' },
  UCBH: { name: 'UC BASSIN HOUILLER', city: 'SAINT AVOLD' },
};
const out = {};
for (const [code, e] of Object.entries(auto)) {
  out[code] = { name: e.best.title, city: cleanCity(e.best.city), src: 'auto' };
}
let nManual = 0, missing = [];
for (const [code, sel] of Object.entries(MANUAL)) {
  if (typeof sel === 'string') {
    const r = byCode.get(code);
    if (!r) { missing.push(code); continue; }
    const pick = sel === 'best' ? r.best : r.second;
    if (!pick) { missing.push(code); continue; }
    out[code] = { name: pick.title, city: cleanCity(pick.city), src: 'manual' };
    nManual++;
  } else {
    out[code] = { name: sel.name, city: sel.city, src: 'manual' };
    nManual++;
  }
}
// Couverture en engagements (optionnelle : requiert pilots-index.json local).
let covN = 0, covMsg = '';
try {
  const pilotsPath = path.join(DIR, '..', '..', '..', 'sqorz_stats', 'pilots-index.json');
  const pilots = JSON.parse(fs.readFileSync(pilotsPath, 'utf8'));
  const freq = new Map();
  for (const ev of pilots.events) for (const cls of ev.classes) for (const c of cls.competitors) {
    const gn = (c.gn || '').trim();
    if (gn) freq.set(gn, (freq.get(gn) || 0) + 1);
  }
  const tot = [...freq.values()].reduce((s, x) => s + x, 0);
  let cov = 0;
  for (const [code, e] of freq) {
    if (out[code]) { cov += e; covN++; }
  }
  covMsg = ` (${(100 * cov / tot).toFixed(1)}% engagements)`;
} catch { covN = Object.keys(out).length; covMsg = ' (pilots-index.json absent : couverture non calculée)'; }
const _meta = {
  generated: new Date().toISOString().slice(0, 10),
  source: 'Annuaire FFC (wp-json sn/cpt/clubs, 13 régions + DOM) + adjudication manuelle',
  entries: Object.keys(out).length,
};
fs.writeFileSync(path.join(DIR, '..', '..', 'clubs.json'), JSON.stringify({ _meta, mapping: out }, null, 1) + '\n');
console.log(`mapping: ${covN} codes${covMsg}, dont ${nManual} manuels`);
console.log('manuels introuvables:', missing.length ? missing.join(',') : 'aucun');
