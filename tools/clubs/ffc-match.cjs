// Matching codes Sqorz (tronqués ~6 lettres) ↔ clubs FFC (nom officiel + ville).
// Sortie : mapping + listes à valider. /tmp only (la table curée ira dans le repo).
const fs = require('fs');
const norm = s => (s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '');
const pilots = JSON.parse(fs.readFileSync('/home/ludovic.socie/Documents/sqorz_tools/sqorz_stats/pilots-index.json', 'utf8'));
const ffc = JSON.parse(fs.readFileSync('/tmp/opencode/ffc-clubs.json', 'utf8'));

// Fréquence des codes Sqorz (priorité de revue).
const freq = new Map();
for (const ev of pilots.events) for (const cls of ev.classes) for (const c of cls.competitors) {
  const gn = (c.gn || '').trim();
  if (gn) freq.set(gn, (freq.get(gn) || 0) + 1);
}
const codes = [...freq.entries()].sort((a, b) => b[1] - a[1]);

function isSubseq(short, long) {
  let j = 0;
  for (const ch of long) { if (ch === short[j]) j++; if (j === short.length) return true; }
  return false;
}
function scoreCandidate(codeN, club) {
  const cityN = norm(club.city || '');
  const titleN = norm(club.title || '');
  const words = (club.title || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^A-Z0-9]+/).filter(Boolean);
  const wordsN = words.map(w => w.replace(/[^A-Z0-9]/g, ''));
  // 1. préfixe de ville (cas standard : BESANC ⊂ BESANCON)
  if (cityN && cityN.startsWith(codeN)) return { score: 100 - cityN.length * 0.1, how: 'prefix-city' };
  // 2. mot du titre == code ou commence par le code (UCBH, UVA…)
  for (const w of wordsN) {
    if (w === codeN) return { score: 95, how: 'word-exact' };
    if (w.startsWith(codeN) && codeN.length >= 3) return { score: 90 - w.length * 0.1, how: 'word-prefix' };
    if (codeN.startsWith(w) && w.length >= 4) return { score: 85, how: 'code-has-word' };
  }
  // 3. préfixe de titre compact (sans espaces)
  if (titleN.startsWith(codeN)) return { score: 80, how: 'prefix-title' };
  // 4. sous-séquence de la ville (LMPDES ⊂ LEMPDES, LRYON ⊂ LAROCHESURYON)
  if (cityN && codeN.length >= 4 && isSubseq(codeN, cityN)) {
    // compacité : pénalise les sauts
    let j = 0, jumps = 0;
    for (const ch of cityN) { if (ch === codeN[j]) j++; else if (j > 0 && j < codeN.length) jumps++; if (j === codeN.length) break; }
    return { score: Math.max(30, 70 - jumps * 8 - cityN.length * 0.2), how: 'subseq-city' };
  }
  // 5. sous-séquence du titre (dernier recours)
  if (codeN.length >= 5 && isSubseq(codeN, titleN)) return { score: 40, how: 'subseq-title' };
  return null;
}

const auto = {}, review = [], none = [];
for (const [code, count] of codes) {
  const codeN = norm(code);
  const cands = [];
  for (const club of ffc) {
    const s = scoreCandidate(codeN, club);
    if (s) cands.push({ club, ...s });
  }
  cands.sort((a, b) => b.score - a.score);
  const entry = { code, count };
  if (!cands.length) { none.push(entry); continue; }
  entry.best = { title: cands[0].club.title, city: cands[0].club.city, score: +cands[0].score.toFixed(1), how: cands[0].how };
  if (cands.length > 1) entry.second = { title: cands[1].club.title, score: +cands[1].score.toFixed(1), how: cands[1].how };
  // auto si score élevé ET net détachement du 2e (ou 2e dans la même ville = même club probable... non : ambigu)
  const gap = cands.length > 1 ? cands[0].score - cands[1].score : 99;
  if (entry.best.score >= 85 && gap >= 10) { auto[code] = entry; }
  else { review.push(entry); }
}
const totEng = [...freq.values()].reduce((s, x) => s + x, 0);
const cov = list => list.reduce((s, e) => s + (freq.get(e.code || e) || 0), 0) / totEng * 100;
console.log(`codes: ${codes.length} | auto: ${Object.keys(auto).length} (${cov(Object.keys(auto)).toFixed(1)}% eng.) | à revoir: ${review.length} (${cov(review.map(r => r.code)).toFixed(1)}%) | sans candidat: ${none.length} (${cov(none.map(r => r.code)).toFixed(1)}%)`);
fs.writeFileSync('/tmp/opencode/match-auto.json', JSON.stringify(auto, null, 1));
fs.writeFileSync('/tmp/opencode/match-review.json', JSON.stringify(review, null, 1));
fs.writeFileSync('/tmp/opencode/match-none.json', JSON.stringify(none.map(r => r.code), null, 1));
console.log('\n--- TOP 25 à revoir (score, méthode) ---');
for (const r of review.slice(0, 25)) {
  console.log(`${String(r.count).padStart(6)} ${r.code.padEnd(9)} → ${r.best.title} [${r.best.city}] (${r.best.score}, ${r.best.how})` +
    (r.second ? `  VS ${r.second.title} (${r.second.score}, ${r.second.how})` : ''));
console.log('\n--- SANS CANDIDAT (top 30) ---');
console.log(none.slice(0, 30).map(r => `${r.code}(${r.count})`).join(' '));
}
