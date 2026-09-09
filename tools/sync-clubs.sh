#!/bin/sh
# Propager le clubs.json canonique (club_stats) vers les dépôts frères.
# Usage : tools/sync-clubs.sh   (depuis la racine club_stats)
# Puis commiter dans chaque dépôt (1 commit par dépôt, sans push sauf demande).
set -eu
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BASE="$(dirname "$ROOT")"
SRC="$ROOT/clubs.json"
for d in sqorz_stats h2h_stats category_stats; do
  if [ -d "$BASE/$d" ]; then
    cp "$SRC" "$BASE/$d/clubs.json"
    echo "OK  $d/clubs.json"
  else
    echo "SKIP $d (introuvable)"
  fi
done
