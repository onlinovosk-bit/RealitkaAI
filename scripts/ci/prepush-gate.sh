#!/usr/bin/env bash
# prepush-gate.sh — spusti lokálne tie brány, ktoré padajú najčastejšie,
# PREDTÝM než push zaplatí celý CI cyklus.
#
# Prečo existuje (merané, nie tušené — docs/reports/2026-09-26-baseline-benchmark.md):
#
#   8 z 30 behov CI bolo červených (27 %).
#   Červený beh nestojí len 325 s CI — stojí ďalší agentný cyklus, ďalší push
#   a ďalších ~9 min CI. Je to najdrahšia jednotlivá položka celého cyklu,
#   drahšia než ktorýkoľvek jeden krok.
#
# Táto brána beží ~70 s. CI beží 586 s. Aritmetika je celý argument.
#
# ČO TÁTO BRÁNA NEZACHYTÍ — a je dôležité, aby to bolo napísané tu, nie
# objavené po červenom behu:
#
#   migrácie          `supabase db reset` potrebuje bežiacu databázu. Bez nej
#                     sa nedá overiť, že migrácia prejde na čistej DB. Presne
#                     táto trieda chyby zhodila main v #700 a #706. Ak je
#                     dostupný `supabase`, skript to skúsi; ak nie, POVIE to.
#   vitest            183 s a potrebuje ephemerálnu DB. Zámerne tu nie je —
#                     brána, ktorá trvá dlhšie než CI, sa prestane používať.
#   Playwright smoke  potrebuje zostavenú aplikáciu a beží server.
#
# Použitie:
#   ./scripts/ci/prepush-gate.sh            # rýchle brány
#   ./scripts/ci/prepush-gate.sh --with-db  # aj replay migrácií, ak to ide
#
# Ako git hook (dobrovoľne, skript ho sám neinštaluje):
#   printf '#!/bin/sh\nexec ./scripts/ci/prepush-gate.sh\n' > .git/hooks/pre-push
#   chmod +x .git/hooks/pre-push

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CRM="$ROOT/apps/crm"
WITH_DB=0
[ "${1:-}" = "--with-db" ] && WITH_DB=1

failures=0
skipped=()

step() { # name, dir, command...
  local name="$1" dir="$2"; shift 2
  printf '\n\033[1m▸ %s\033[0m\n' "$name"
  local t0=$SECONDS
  if (cd "$dir" && "$@"); then
    printf '\033[32m  PASS\033[0m  %s  (%ss)\n' "$name" "$((SECONDS - t0))"
  else
    printf '\033[31m  FAIL\033[0m  %s  (%ss)\n' "$name" "$((SECONDS - t0))"
    failures=$((failures + 1))
  fi
}

START=$SECONDS

# Najlacnejšie prvé — chyba má vyplávať za sekundy, nie za minútu.
step "CI helper skripty"        "$ROOT" ./scripts/ci/__tests__/supabase-start.test.sh
step "classify-diff (fastpath)" "$ROOT" ./scripts/ci/__tests__/classify-diff.test.sh
step "typecheck ratchet (regex)" "$ROOT" node ./scripts/ci/__tests__/typecheck-baseline.test.mjs
step "wait-for-supabase"        "$ROOT" ./scripts/ci/__tests__/wait-for-supabase.test.sh
step "API contract (ratchet)"   "$ROOT" node apps/crm/scripts/check-api-contract.mjs --ci
step "Typecheck (baseline)"     "$CRM"  node scripts/typecheck-baseline.mjs
step "Lint"                     "$CRM"  npm run lint

# Migrácie: iba ak to prostredie dovolí. Mlčky preskočiť by znamenalo tvrdiť,
# že sú overené.
if [ "$WITH_DB" -eq 1 ]; then
  if command -v supabase >/dev/null 2>&1; then
    step "Migrácie na čistej DB" "$CRM" supabase db reset
  else
    skipped+=("migrácie: supabase CLI nie je v PATH")
  fi
else
  skipped+=("migrácie: spusti s --with-db (potrebuje supabase CLI + Docker)")
fi

printf '\n────────────────────────────────────────────────\n'
printf 'brána skončila za %ss\n' "$((SECONDS - START))"
for s in "${skipped[@]+"${skipped[@]}"}"; do
  printf '\033[33mNEOVERENÉ\033[0m  %s\n' "$s"
done

if [ "$failures" -eq 0 ]; then
  printf '\033[32mVŠETKO PREŠLO\033[0m — push nebude červený na týchto bránach.\n'
  [ ${#skipped[@]} -gt 0 ] && printf 'To nie je to isté ako "CI bude zelené" — pozri NEOVERENÉ vyššie.\n'
  exit 0
fi

printf '\033[31m%s BRÁN PADLO\033[0m — oprav pred pushom. Červené CI stojí celý cyklus.\n' "$failures"
exit 1
