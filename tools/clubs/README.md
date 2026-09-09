# Outils clubs — noms complets (`clubs.json`)

`clubs.json` (racine du dépôt) mappe les codes clubs Sqorz (tronqués, ex. `BESANC`)
vers le nom officiel + ville, issus de l'annuaire FFC.

## Régénérer le mapping

```sh
node tools/clubs/clubs-build.cjs
```

- Entrées : `match-auto.json` (acceptés auto) + `match-review.json` + adjudications
  `MANUAL` en tête de `clubs-build.cjs` (vérifiées une par une : région × pistes courues).
- Sortie : `../../clubs.json` (`{_meta, mapping}`).
- La couverture (% engagements) est calculée si `../../../sqorz_stats/pilots-index.json`
  existe en local (disposition `sqorz_tools/`), sinon elle est ignorée.

## Refaire crawl + matching (rare : nouveaux clubs)

1. `ffc-crawl.cjs` — crawl l'annuaire FFC (`velo.ffc.fr/wp-json/sn/cpt/clubs`,
   13 régions + DOM) → `ffc-clubs.json`.
2. `ffc-match.cjs` — matche les codes Sqorz (`pilots-index.json`, champ `gn`)
   contre le crawl → `match-auto.json` / `match-review.json` / `match-none.json`.
3. Adjuger `match-review.json` à la main (région × top pistes du club), compléter
   `MANUAL`, relancer `clubs-build.cjs`, propager via `tools/sync-clubs.sh`.

Règles : auto si score ≥ 85 et écart ≥ 10 ; `single60`, `tie-bmx` ; codes
`DN*/EA*`, pays et teams gardés tels quels (repli : code seul dans l'app).
⚠️ Ces deux scripts portent encore des chemins absolus de la session initiale
(`/tmp/opencode`, `sqorz_tools`) — les adapter avant réusage.

## Propager aux autres dépôts

```sh
tools/sync-clubs.sh
```

Copie le `clubs.json` canonique vers `sqorz_stats/`, `h2h_stats/` et
`category_stats/` (dépôts frères dans `sqorz_tools/`). Commiter ensuite dans
chaque dépôt (déploiements GitHub Pages indépendants → copies versionnées,
pas de dépendance croisée au runtime).
