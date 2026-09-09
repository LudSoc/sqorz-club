// Tests de la colonne Catégorie du tableau club (fonctions extraites de index.html).
// Règle : en vue « Toutes » (toutes années), pas de colonne Catégorie —
// la dominante n'a pas de sens (un pilote change de catégorie selon l'année).
// Usage : node --test tests/club-table.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const commonSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'sqorz_stats', 'common.js'), 'utf8');
const SC = new Function('window', commonSrc + '\nreturn window.SqorzCommon;')({});
function block(start, indent = '  ') {
  const i = src.indexOf(start);
  if (i < 0) throw new Error('marqueur introuvable : ' + start);
  const j = src.indexOf('\n' + indent + '}\n', i);
  if (j < 0) throw new Error('fin de bloc introuvable pour : ' + start);
  return src.slice(i, j + ('\n' + indent + '}\n').length);
}
const harness = [
  'const { escape } = __SC;',
  'const classLabel = code => "[" + code + "]";', // libellé réel inchangé par ce chantier
  'const SQORZ_STATS_BASE = "https://x/";',
  'let yearFilter = new Set(), sortCol = "wins", sortDir = "desc";',
  block('function sortedPilots(pilots) {'),
  block('function buildTableHtml(pilots, totalWins, totalPodiums) {'),
].join('\n') + '\nreturn { buildTableHtml, __set: (y, c, d) => { yearFilter = y; sortCol = c; sortDir = d; } };';
const H = new Function('__SC', harness)(SC);

const PILOTS = [
  { key: 'jean dupont', firstName: 'Jean', lastName: 'Dupont', name: 'Jean Dupont',
    dominantCode: 'U11GR', years: ['2024', '2025'],
    stats: { entries: 10, wins: 2, podiums: 4, avgRank: 5.5 } },
  { key: 'paul martin', firstName: 'Paul', lastName: 'Martin', name: 'Paul Martin',
    dominantCode: 'U13GR', years: ['2025'],
    stats: { entries: 6, wins: 0, podiums: 1, avgRank: 12.0 } },
];

test('vue Toutes : pas de colonne Catégorie', () => {
  H.__set(new Set(), 'wins', 'desc');
  const out = H.buildTableHtml(PILOTS, 2, 5);
  assert.ok(!out.includes('>Catégorie<'), 'en-tête absent');
  assert.ok(!out.includes('[U11GR]') && !out.includes('[U13GR]'), 'aucune cellule catégorie');
  assert.ok(out.includes('2024') && out.includes('2025'), 'les années restent visibles');
});

test('vue année : colonne Catégorie présente', () => {
  H.__set(new Set(['2025']), 'wins', 'desc');
  const out = H.buildTableHtml(PILOTS, 2, 5);
  assert.ok(out.includes('>Catégorie<'), 'en-tête présent');
  assert.ok(out.includes('[U11GR]') && out.includes('[U13GR]'), 'cellules présentes');
});

test('vue Toutes + tri cat : repli sur victoires desc', () => {
  H.__set(new Set(), 'cat', 'asc');
  const out = H.buildTableHtml(PILOTS, 2, 5);
  assert.ok(!out.includes('>Catégorie<'), 'colonne masquée');
  const iJean = out.indexOf('Jean Dupont');
  const iPaul = out.indexOf('Paul Martin');
  assert.ok(iJean !== -1 && iPaul !== -1 && iJean < iPaul, 'trié par victoires desc (Jean 2v avant Paul 0v)');
});
