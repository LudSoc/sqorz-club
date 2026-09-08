# URLs partageables — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter des URLs partageables sur club_stats, h2h_stats et category_stats pour qu'un lien copié restaure exactement l'état affiché.

**Architecture:** Même pattern que `sqorz_stats` (déjà opérationnel) : `history.pushState` à la sélection principale (action utilisateur), `history.replaceState` pour les changements secondaires. Restauration automatique au chargement depuis `location.search`. Chaque outil est modifié indépendamment dans son `index.html`.

**Tech Stack:** HTML/JS vanilla inline, History API (`pushState`/`replaceState`), `URLSearchParams`

---

## Task 1 : club_stats — `?club=<key>`

**Files:**
- Modify: `club_stats/index.html` — ajouter 3 fonctions URL + modifier `selectClub` + restauration au chargement

### Contexte

- La variable `selectedClubKey` contient la clé normalisée du club sélectionné (ex. `vc montlucon`)
- `selectClub(key)` sélectionne un club et appelle `renderResults()` — elle est déjà isolée
- `loadIndex()` charge l'index puis appelle `renderOrgSelectorList()` en interne ; après son retour, `clubsMap` est disponible
- La `norm` locale est définie ligne 484 : `const norm = s => ...`

### Étapes

- [ ] **Étape 1 : Ajouter les 3 fonctions URL après `window._getState`**

Localiser la ligne `window._getState = () => ...` (~ligne 719) et insérer juste après :

```js
  // --- URL state ---
  function parseUrlState() {
    const p = new URLSearchParams(location.search);
    return { club: p.get('club') || '' };
  }
  function buildUrl(key) {
    const u = new URL(location.href);
    if (key) u.searchParams.set('club', key);
    else u.searchParams.delete('club');
    return u.pathname + (u.search || '');
  }
  function pushUrlState(key) {
    const newUrl = buildUrl(key);
    const cur = location.pathname + location.search;
    if (newUrl === cur) history.replaceState(null, '', newUrl);
    else history.pushState(null, '', newUrl);
  }
```

- [ ] **Étape 2 : Appeler `pushUrlState` dans `selectClub`**

Localiser `function selectClub(key)` (~ligne 704). Ajouter `pushUrlState(key);` juste avant la fermeture de la fonction, après `renderResults()` :

```js
  function selectClub(key) {
    selectedClubKey = key;
    const club = clubsMap.get(key);
    if (!club) return;
    clubInp.value = club.displayName;
    hideSuggestions();
    yearFilter     = new Set();
    catFilter      = '';
    catSectionOpen = false;
    sortCol        = 'wins';
    sortDir    = 'desc';
    renderResults();
    pushUrlState(key);  // ← ajout
  }
```

- [ ] **Étape 3 : Restaurer l'état au chargement**

Localiser la section `// --- Init ---` en fin de fichier (~ligne 1273). Remplacer :

```js
  loadIndex();
```

par :

```js
  loadIndex().then(() => {
    const { club } = parseUrlState();
    if (club && clubsMap.has(club)) {
      selectClub(club);
      history.replaceState(null, '', buildUrl(club));
    }
  });
```

> Note : `pushUrlState` est appelé par `selectClub`, mais au chargement on veut `replaceState` (pas d'entrée supplémentaire dans l'historique). On corrige avec le `replaceState` explicite après.

- [ ] **Étape 4 : Vérifier que `loadIndex` retourne une Promise**

Localiser `async function loadIndex()` (~ligne 609). Vérifier qu'elle est bien `async` (ce qui la fait retourner une Promise automatiquement). Si ce n'est pas le cas, ajouter le mot-clé `async`.

- [ ] **Étape 5 : Tester manuellement**

Ouvrir `club_stats/index.html` dans un navigateur local (`file://` ou serveur local).
1. Sélectionner un club → vérifier que l'URL change : `?club=vc%20montlucon` (ou équivalent)
2. Copier l'URL, ouvrir un nouvel onglet → le club doit se charger et afficher ses résultats
3. Cliquer sur "retour" du navigateur → l'état doit revenir à vide
4. Sélectionner un club introuvable en éditant l'URL manuellement (`?club=zzz`) → aucun crash, état vide

- [ ] **Étape 6 : Commit**

```bash
git -C /home/ludovic.socie/Documents/sqorz_tools/club_stats add index.html
git -C /home/ludovic.socie/Documents/sqorz_tools/club_stats commit -m "feat: add shareable URL for club selection (?club=)"
```

---

## Task 2 : h2h_stats — `?a=<normKeyA>&b=<normKeyB>`

**Files:**
- Modify: `h2h_stats/index.html` — ajouter helper `findPilotByNormKey` + fonctions URL + appels dans `selectPilotB`, `clearPilotA`, `clearPilotB` + restauration au chargement

### Contexte

- `pilotA` et `pilotB` sont des objets `{ firstName, lastName, groupName, age, normKey }`
- `selectPilotA(pilot)` → sélectionne A, active le champ B
- `selectPilotB(pilot)` → sélectionne B ET déclenche `computeAndRenderH2H()`
- `clearPilotA()` → vide A et B, retour à l'état initial
- `clearPilotB()` → vide B seulement
- `norm` est définie ligne ~1357 (scope global)
- `loadIndex()` est une fonction `async` appelée ligne 1940
- L'index est dans `pilotsIndex.events[].classes[].competitors[]` avec `firstName`, `lastName`, `groupName`, `age`

### Étapes

- [ ] **Étape 1 : Ajouter `findPilotByNormKey` juste après la définition de `norm`**

Localiser `const norm = s => ...` (~ligne 1357). Insérer après :

```js
function findPilotByNormKey(key) {
  if (!pilotsIndex || !key) return null;
  const seen = new Map();
  for (const ev of (pilotsIndex.events || [])) {
    for (const cls of (ev.classes || [])) {
      for (const c of (cls.competitors || [])) {
        const k = norm((c.firstName || '') + ' ' + (c.lastName || '')).trim();
        if (k === key && !seen.has(k)) {
          seen.set(k, { firstName: c.firstName || '', lastName: c.lastName || '', groupName: c.groupName || '', age: c.age ?? null, normKey: k });
        }
      }
    }
  }
  return seen.get(key) ?? null;
}
```

- [ ] **Étape 2 : Ajouter les fonctions URL juste après `findPilotByNormKey`**

```js
function parseUrlState() {
  const p = new URLSearchParams(location.search);
  return { a: p.get('a') || '', b: p.get('b') || '' };
}
function buildUrl() {
  const u = new URL(location.href);
  if (pilotA?.normKey) u.searchParams.set('a', pilotA.normKey);
  else u.searchParams.delete('a');
  if (pilotB?.normKey) u.searchParams.set('b', pilotB.normKey);
  else u.searchParams.delete('b');
  return u.pathname + (u.search || '');
}
function pushUrlState() {
  const newUrl = buildUrl();
  const cur = location.pathname + location.search;
  if (newUrl === cur) history.replaceState(null, '', newUrl);
  else history.pushState(null, '', newUrl);
}
function replaceUrlState() {
  history.replaceState(null, '', buildUrl());
}
```

- [ ] **Étape 3 : Appeler `pushUrlState()` à la fin de `selectPilotB`**

Localiser `function selectPilotB(pilot)` (~ligne 1565). Ajouter `pushUrlState();` en dernière ligne de la fonction, après `computeAndRenderH2H()` :

```js
function selectPilotB(pilot) {
  pilotB = pilot;
  inputB.value = '';
  inputB.hidden = true;
  badgeB.innerHTML = renderBadge(pilot);
  badgeB.hidden = false;
  badgeB.querySelector('.psb-clear').addEventListener('click', clearPilotB);
  invertBtn.disabled = false;
  computeAndRenderH2H();
  pushUrlState();  // ← ajout
}
```

- [ ] **Étape 4 : Appeler `replaceUrlState()` dans `clearPilotA` et `clearPilotB`**

Dans `clearPilotA` (~ligne 1549), ajouter `replaceUrlState();` juste avant `inputA.focus();` :

```js
function clearPilotA() {
  pilotA = null;
  inputA.value = '';
  inputA.hidden = false;
  badgeA.hidden = true;
  badgeA.innerHTML = '';
  inputB.disabled = true;
  inputB.value = '';
  invertBtn.disabled = true;
  clearPilotB();
  suggestionsSection.hidden = true;
  h2hResults.innerHTML = '';
  document.title = 'Sqorz Head to Head';
  document.body.classList.remove('has-results');
  replaceUrlState();  // ← ajout
  inputA.focus();
}
```

Dans `clearPilotB` (~ligne 1577), ajouter `replaceUrlState();` juste avant `inputB.focus();` :

```js
function clearPilotB() {
  pilotB = null;
  inputB.value = '';
  inputB.hidden = false;
  inputB.focus();
  badgeB.hidden = true;
  badgeB.innerHTML = '';
  invertBtn.disabled = !(pilotA);
  h2hResults.innerHTML = '';
  document.body.classList.remove('has-results');
  replaceUrlState();  // ← ajout
}
```

- [ ] **Étape 5 : Restaurer l'état au chargement**

Localiser `loadIndex();` (~ligne 1940). Remplacer par :

```js
(async () => {
  await loadIndex();
  const { a, b } = parseUrlState();
  if (!a) return;
  const pA = findPilotByNormKey(a);
  if (!pA) return;
  selectPilotA(pA);
  if (!b) return;
  const pB = findPilotByNormKey(b);
  if (!pB) return;
  selectPilotB(pB);
  history.replaceState(null, '', buildUrl());
})();
```

- [ ] **Étape 6 : Tester manuellement**

1. Sélectionner pilote A → URL doit rester inchangée (pas encore de B)
2. Sélectionner pilote B → URL doit devenir `?a=tom-dupont&b=lea-martin` (normKeys)
3. Copier l'URL, nouvel onglet → les deux pilotes chargés, h2h affiché
4. Cliquer "retour" → état vide
5. `?a=valide` seul → pilote A sélectionné, champ B vide
6. `?a=zzz` → aucun crash, état vide

- [ ] **Étape 7 : Commit**

```bash
git -C /home/ludovic.socie/Documents/sqorz_tools/h2h_stats add index.html
git -C /home/ludovic.socie/Documents/sqorz_tools/h2h_stats commit -m "feat: add shareable URL for head-to-head (?a=&b=)"
```

---

## Task 3 : category_stats — `?orgs=<code,code>&year=<yyyy>`

**Files:**
- Modify: `category_stats/index.html` — ajouter fonctions URL + override dans `loadIndex` + `replaceState` sur changements + restauration

### Contexte

- `selectedCodes` est un `Set` contenant les `accountCode` des orgs sélectionnées
- `accounts` est un tableau `{ accountCode, accountName }` (disponible après `loadIndex`)
- `rankYearSel` est le `<select>` d'année (ses `<option>` sont hardcodées dans le HTML)
- `renderOrgSelectorList()` recrée les checkboxes à partir de `accounts` et `selectedCodes`
- `updateOrgSelectorUI()` met à jour le label résumé
- `searchRanking()` déclenche le calcul et l'affichage du tableau
- Le checkbox change appelle `selectedCodes.add/delete` puis `updateOrgSelectorUI()` (ligne ~699)
- `rankYearSel.addEventListener('change', ...)` (~ligne 790) appelle `searchRanking()` si des lignes sont présentes
- Règle d'encodage : si `selectedCodes.size === accounts.length` → omettre `?orgs=`

### Étapes

- [ ] **Étape 1 : Ajouter les fonctions URL juste avant la section `// --- DOM refs ---`**

Localiser le commentaire `// --- DOM refs ---` (~ligne 659). Insérer avant :

```js
  // --- URL state ---
  function parseUrlState() {
    const p = new URLSearchParams(location.search);
    const orgsRaw = p.get('orgs');
    return {
      orgs: orgsRaw ? orgsRaw.split(',').filter(Boolean) : null,
      year: p.get('year') || ''
    };
  }
  function buildUrl() {
    const u = new URL(location.href);
    if (accounts.length > 0 && selectedCodes.size < accounts.length) {
      u.searchParams.set('orgs', [...selectedCodes].join(','));
    } else {
      u.searchParams.delete('orgs');
    }
    const year = document.getElementById('rankYearSel')?.value || '';
    if (year) u.searchParams.set('year', year);
    else u.searchParams.delete('year');
    return u.pathname + (u.search || '');
  }
  function replaceUrlState() {
    history.replaceState(null, '', buildUrl());
  }
```

- [ ] **Étape 2 : Appeler `replaceUrlState()` sur changement d'org**

Localiser le bloc du listener checkbox (~ligne 699) :

```js
        if (cb.checked) selectedCodes.add(cb.value);
        else selectedCodes.delete(cb.value);
```

Ajouter `replaceUrlState();` juste après `updateOrgSelectorUI();` dans ce listener :

```js
        if (cb.checked) selectedCodes.add(cb.value);
        else selectedCodes.delete(cb.value);
        updateOrgSelectorUI();
        replaceUrlState();  // ← ajout
```

- [ ] **Étape 3 : Appeler `replaceUrlState()` sur changement d'année**

Localiser `rankYearSel.addEventListener('change', ...)` (~ligne 790). Ajouter `replaceUrlState();` en première ligne du handler :

```js
  rankYearSel.addEventListener('change', () => {
    replaceUrlState();  // ← ajout
    if (currentRows.length > 0) searchRanking();
  });
```

- [ ] **Étape 4 : Appliquer l'état URL dans `loadIndex` avant le rendu**

Localiser dans `async function loadIndex()` le bloc success, juste après la ligne `for (const a of accounts) { if (isDefaultOrg(...)) selectedCodes.add(...) }`. Remplacer ce bloc par :

```js
      // Sélection par défaut : orgs "officielles"
      for (const a of accounts) {
        if (isDefaultOrg(a.accountName)) selectedCodes.add(a.accountCode);
      }
      // Override depuis l'URL si présent
      const urlState = parseUrlState();
      if (urlState.orgs !== null) {
        selectedCodes.clear();
        urlState.orgs.forEach(code => selectedCodes.add(code));
      }
      if (urlState.year) {
        const sel = document.getElementById('rankYearSel');
        if (sel) sel.value = urlState.year;
      }
```

- [ ] **Étape 5 : Déclencher `searchRanking` si URL avait un état**

Toujours dans `loadIndex`, après `updateRankingForm()` et `setStatus('')`, ajouter :

```js
      if (urlState.orgs !== null || urlState.year) {
        searchRanking();
      }
```

> `urlState` est accessible car déclarée dans le même bloc `try` à l'étape 4.

- [ ] **Étape 6 : Tester manuellement**

1. Décocher quelques orgs + sélectionner une année → URL doit se mettre à jour en temps réel
2. Copier l'URL, nouvel onglet → les mêmes orgs cochées et la même année sélectionnée, résultats affichés
3. Si toutes les orgs sont cochées → `?orgs=` absent de l'URL
4. URL avec `?year=2024` seul (sans `?orgs=`) → toutes les orgs + année 2024 + résultats

- [ ] **Étape 7 : Commit**

```bash
git -C /home/ludovic.socie/Documents/sqorz_tools/category_stats add index.html
git -C /home/ludovic.socie/Documents/sqorz_tools/category_stats commit -m "feat: add shareable URL for category stats (?orgs=&year=)"
```
