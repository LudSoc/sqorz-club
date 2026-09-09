// Tests de l'état partagé inter-outils côté club_stats (convention sqorz.*).
// Usage : node --test tests/shared-state.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('helpers partagés importés du socle', () => {
  assert.ok(src.includes('isFav, toggleFav, pushRecent'), 'destructure SqorzCommon');
});

test('fiche club : bouton ☆ avec état initial isFav', () => {
  assert.ok(src.includes('data-fav-club'), 'bouton présent');
  assert.ok(src.includes("isFav('clubs', selectedClubKey)"), 'état initial');
  assert.ok(src.includes("toggleFav('clubs', btn.dataset.favClub"), 'bascule au clic');
});

test('sélection club → récents partagés', () => {
  assert.ok(src.includes("pushRecent('clubs', key, club.displayName)"), 'pushRecent à la sélection');
});

test('dégradation gracieuse si le CDN common.js est en retard (helpers absents)', () => {
  assert.ok(src.includes("typeof pushRecent === 'function'"), 'pushRecent gardé');
  assert.ok(src.includes('const favNow = typeof isFav'), 'isFav gardé via favNow');
  assert.ok(src.includes("typeof toggleFav !== 'function'"), 'toggleFav gardé au clic');
});
