# URLs partageables — Design

Date : 2026-07-28

## Objectif

Permettre de partager un lien direct vers un état précis de chaque outil BMX (club sélectionné, pilotes comparés, orgs/année filtrées). Le lien doit restaurer l'état complet au chargement.

## Périmètre

| Outil | Déjà fait | À faire |
|---|---|---|
| `sqorz_stats` | ✅ `?name=&year=&sort=` opérationnel | rien |
| `club_stats` | ❌ | `?club=<normKey>` |
| `h2h_stats` | ❌ | `?a=<normKey>&b=<normKey>` |
| `category_stats` | ❌ | `?orgs=<code,code>&year=<yyyy>` |

## Approche retenue : `replaceState` + `pushState`

Même pattern que `sqorz_stats` :
- `pushState` lors de la validation principale (sélection club, lancement h2h)
- `replaceState` pour les changements secondaires
- Restauration automatique au chargement depuis `location.search`

## Détail par outil

### club_stats

Paramètre : `?club=<selectedClubKey>`

Fonctions à ajouter :
```js
function parseUrlState()    // lit ?club= → retourne la clé ou null
function buildUrl(key)      // construit l'URL depuis la clé
function pushUrlState(key)  // pushState à la sélection du club
```

Restauration au chargement (après `loadPilotsIndex`) :
1. Lire `?club=`
2. Si présent et clé existante dans `clubsMap` → `selectClub(key)` + `searchRanking()`
3. Sinon → ignorer, état vide

### h2h_stats

Paramètres : `?a=<normKeyA>&b=<normKeyB>`

- `pushState` quand les deux pilotes sont sélectionnés et le h2h lancé
- `replaceState` si un pilote est effacé (retirer le paramètre correspondant)

Restauration au chargement :
1. Lire `?a=` et `?b=`
2. Les deux trouvés dans l'index → sélectionner A et B, déclencher le h2h
3. Un seul trouvé → sélectionner uniquement ce pilote
4. Aucun → état vide

### category_stats

Paramètres : `?orgs=<code1,code2>&year=<yyyy>`

Règle d'encodage : si toutes les orgs sont sélectionnées (état par défaut), **omettre** le paramètre `orgs`. Ne l'écrire que pour un sous-ensemble.

`replaceState` à chaque changement d'org ou d'année.

Restauration au chargement :
1. Lire `?orgs=` → si absent, tout sélectionner ; si présent, cocher uniquement les codes listés
2. Lire `?year=` → appliquer au sélecteur d'année
3. Déclencher le rendu

## Comportement erreur

Clé/code introuvable dans l'index → ignorer silencieusement, état vide. Pas de message d'erreur (l'index peut être en cours de chargement ou la donnée supprimée).
