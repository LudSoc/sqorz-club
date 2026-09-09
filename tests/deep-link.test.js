// Tests du deep-linking club (?club= et ?q= pré-remplissage recherche).
// Usage : node --test tests/deep-link.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('parseUrlState expose club et q', () => {
  assert.ok(src.includes("return { club: p.get('club') || '', q: p.get('q') || '' }"), 'les deux params');
});

test('init : ?q= pré-remplit et ouvre les suggestions', () => {
  assert.ok(src.includes('clubInp.value = q;'), 'pré-remplissage');
  assert.ok(src.includes('renderSuggestions(q);'), 'suggestions ouvertes');
});

test('sélection club : le ?q= est consommé (pas de re-prefill au reload)', () => {
  assert.ok(src.includes("u.searchParams.delete('q')"), 'q supprimé quand club choisi');
});
