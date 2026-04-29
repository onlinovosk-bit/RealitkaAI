#!/usr/bin/env bash
# ================================================================
# Revolis.AI — Surgical Fix
# Odstraňuje IBA kolíznu /(app) vetvu, nič iné sa nedotýka.
#
# Spusti z koreňa projektu (tam kde je package.json):
#   bash cleanup-app-group.sh
# ================================================================
set -euo pipefail

TARGET="src/app/(app)"

if [ ! -d "$TARGET" ]; then
  echo "✅  $TARGET neexistuje — nič na čistenie."
  exit 0
fi

echo "🗑  Odstraňujem kolíznu vetvu: $TARGET"
rm -rf "$TARGET"
echo "✅  Hotovo — $TARGET zmazaný."

echo ""
echo "Overenie — zostatok v src/app:"
find src/app -maxdepth 2 -type d | sort
