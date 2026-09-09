// Tests des noms complets de clubs (clubs.json + clubDisplayName dans index.html).
// Format attendu : « BMX BESANCON (BESANC) », repli sur le code seul si inconnu.
// Usage : node --test tests/club-names.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function block(start, indent = '  ') {
  const i = src.indexOf(start);
  if (i < 0) throw new Error('marqueur introuvable : ' + start);
  const j = src.indexOf('\n' + indent + '}\n', i);
  if (j < 0) throw new Error('fin de bloc introuvable pour : ' + start);
  return src.slice(i, j + ('\n' + indent + '}\n').length);
}
const harness = [
  'const normClub = s => (s || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");',
  'let clubFullNames = new Map(Object.entries(__SEED).map(([k, v]) => [normClub(k), v]));',
  block('function clubDisplayName(raw) {'),
  block('function clubCity(raw) {'),
].join('\n') + '\nreturn { clubDisplayName, clubCity };';
const H = seed => new Function('__SEED', harness)(seed);

test('connu → « Nom (CODE) »', () => {
  const h = H({ BESANC: { name: 'BMX BESANCON', city: 'BESANCON' } });
  assert.equal(h.clubDisplayName('BESANC'), 'BMX BESANCON (BESANC)');
  assert.equal(h.clubCity('BESANC'), 'BESANCON');
});

test('inconnu → code seul (DN, pays, micro-clubs)', () => {
  const h = H({});
  assert.equal(h.clubDisplayName('EABORD'), 'EABORD');
  assert.equal(h.clubDisplayName('SUI'), 'SUI');
  assert.equal(h.clubCity('AZE'), null);
});

test('insensible à la casse/espaces', () => {
  const h = H({ 'JOUE-T': { name: 'JOUE LES TOURS BMX', city: null } });
  assert.equal(h.clubDisplayName('  joue-t '), 'JOUE LES TOURS BMX (joue-t)');
});

test('clubs.json : structure + adjudications manuelles', () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'clubs.json'), 'utf8'));
  assert.ok(j._meta && j.mapping, 'enveloppe {_meta, mapping}');
  const m = j.mapping;
  assert.ok(Object.keys(m).length >= 200, 'couverture large');
  for (const [k, v] of Object.entries(m)) assert.ok(v && v.name, `nom présent pour ${k}`);
  assert.equal(m.BESANC.name, 'BMX BESANCON');
  assert.equal(m.USCBMX.name, 'US CAGNES BMX');
  assert.equal(m.BLAGNA.name, 'BLAGNAC BMX');
  assert.equal(m.BEYNOS.name, "AIN'PULSION COTIERE BMX");
  assert.equal(m.BIKRAC.name, 'BIKE RACING ACADEMY');
  assert.ok(!m.EABORD && !m.SUI, 'DN/pays exclus (repli CODE)');
});
