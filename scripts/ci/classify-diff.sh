#!/usr/bin/env bash
# classify-diff.sh — rozhodne, či diff môže ovplyvniť zostavenú aplikáciu.
#
# CI-FASTPATH-01. Zmerané na jobe 108467951031 (main, 586 s celkom):
#
#   Build (next build)            90 s
#   Upload artifact              18 s
#   Install Playwright Chromium  31 s
#   Playwright smoke             16 s
#   ────────────────────────────────
#   spolu                       155 s  = 26 % behu
#
# Diff, ktorý sa dotýka výhradne docs/ a memory/, nemôže zmeniť ani jeden
# z týchto štyroch výsledkov: v apps/crm/src nie je jediný import .md ani
# .mdx, next.config nemá mdx loader, a tri smoke specs, ktoré CI spúšťa
# (smoke, proof-funnel, universal-import-smoke), neotvárajú žiadny súbor
# z docs/ ani memory/. Overené grepom, nie predpokladom.
#
# ČO TENTO SKRIPT ÚMYSLNE NEPRESKAKUJE: `Test` (vitest, 183 s) a `Start local
# Supabase` + `Reset DB` (145 s). Vitest suite **číta reálne súbory z docs/** —
# tests/verification/*.verification.test.ts, tests/rls/rls-tenant-isolation.test.ts
# a listing fixtures odkazujú na 30+ konkrétnych ciest v docs/. Zmena .md teda
# testy rozbiť DOKÁŽE. Fastpath, ktorý by ich preskočil, by prepustil reálne
# zlyhanie — a to je horšie než 183 s.
#
# FAIL-SAFE: keď sa zoznam zmenených súborov nedá zistiť, skript hlási
# app_touched=true, teda plný beh. Neistota nikdy nevedie k preskočeniu brány.
#
# Testovateľnosť: keď je nastavené CI_DIFF_FILES (zoznam ciest, jedna na riadok),
# skript nepoužije git vôbec. To používa scripts/ci/__tests__/classify-diff.test.sh.

set -uo pipefail

emit() {
  # $1 = true|false, $2 = dôvod
  echo "app_touched=$1"
  echo "reason=$2"
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    {
      echo "app_touched=$1"
      echo "reason=$2"
    } >> "$GITHUB_OUTPUT"
  fi
}

full_run() {
  emit true "$1"
  exit 0
}

# ── 1. zoznam zmenených súborov ────────────────────────────────────────────
if [ -n "${CI_DIFF_FILES:-}" ]; then
  files="$CI_DIFF_FILES"
else
  event="${GITHUB_EVENT_NAME:-}"
  case "$event" in
    pull_request)
      # Checkout na PR je merge commit: ^1 je base, ^2 je head.
      # Presne to je diff PR. Vyžaduje fetch-depth >= 2.
      files=$(git diff --name-only HEAD^1 HEAD^2 2>/dev/null) || files=""
      ;;
    push)
      files=$(git diff --name-only HEAD^ HEAD 2>/dev/null) || files=""
      ;;
    *)
      # workflow_dispatch a všetko ostatné: nevieme, proti čomu porovnať.
      full_run "event '$event' nemá porovnateľný base - plný beh"
      ;;
  esac

  if [ -z "$files" ]; then
    # Prázdno znamená buď chybu git-u, alebo diff bez súborov. Ani jedno
    # nie je dôkaz, že sa aplikácia nezmenila.
    full_run "zoznam zmenených súborov sa nedal zistiť (shallow checkout?) - plný beh"
  fi
fi

# ── 2. predikát ────────────────────────────────────────────────────────────
# Cesta je "dokumentačná", ak je pod docs/, memory/ alebo .ai/, alebo je to
# .md súbor v koreni repa. Čokoľvek iné - vrátane .github/, scripts/ a apps/ -
# znamená plný beh.
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    docs/*|memory/*|.ai/*) continue ;;
    */*) full_run "mimo docs/memory: $f" ;;
    *.md)  continue ;;
    *)     full_run "mimo docs/memory: $f" ;;
  esac
done <<< "$files"

count=$(echo "$files" | grep -c . || true)
emit false "iba docs/memory ($count súborov) - Build, artifact a Playwright sa preskočia; Lint, Typecheck a Test bežia celé"
