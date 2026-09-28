#!/usr/bin/env bash
# Tests for scripts/ci/classify-diff.sh.
#
# Čo to dokáže: že predikát pustí fastpath výhradne na docs/memory diffe, že
# každá iná cesta vynúti plný beh, a — to je najdôležitejší prípad — že
# nezistiteľný diff vedie na plný beh, nie na preskočenie brány.
#
# Čo to nedokáže: nič o tom, či `git diff HEAD^1 HEAD^2` na reálnom PR merge
# commite vráti správny zoznam. To závisí od fetch-depth v workflow a overí to
# až prvý beh; preto je fail-safe vetva testovaná ako plnohodnotný prípad.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUBJECT="$HERE/../classify-diff.sh"
failures=0

check() { # name, want(true|false), files...
  local name="$1" want="$2"; shift 2
  local files out got
  files="$(printf '%s\n' "$@")"
  out="$(CI_DIFF_FILES="$files" GITHUB_EVENT_NAME=pull_request "$SUBJECT" 2>&1)"
  got="$(echo "$out" | grep '^app_touched=' | head -1 | cut -d= -f2)"
  if [ "$got" = "$want" ]; then
    echo "ok    $name  (app_touched=$got)"
  else
    echo "FAIL  $name  chcel app_touched=$want, dostal '$got'"
    echo "$out" | sed 's/^/        /'
    failures=$((failures + 1))
  fi
}

# ── fastpath povolený ──────────────────────────────────────────────────────
check "iba docs/"                     false "docs/reports/x.md"
check "iba memory/"                   false "memory/decisions.md"
check "docs + memory spolu"           false "docs/a.md" "memory/b.md"
check "root .md"                      false "CLAUDE.md"
check "docs + root .md"               false "docs/a.md" "README.md"
check "docs iná prípona než .md"      false "docs/audit/matrix.json"
check ".ai/ ledger"                   false ".ai/bus/ledger/2026-09.jsonl"

# ── fastpath zakázaný ──────────────────────────────────────────────────────
check "jeden .tsx medzi docs"         true  "docs/a.md" "apps/crm/src/app/page.tsx"
check "migrácia"                      true  "apps/crm/supabase/migrations/1.sql"
check "workflow sám"                  true  ".github/workflows/saas-grade-pipeline.yml"
check "skript"                        true  "scripts/ci/classify-diff.sh"
check "package-lock"                  true  "apps/crm/package-lock.json"
check "root súbor bez prípony .md"    true  "Dockerfile"
check "root .ts"                      true  "vitest.config.ts"
check "docs-like prefix, iný adresár" true  "documentation/x.md"
check "memory-like prefix"            true  "memoryleak/x.md"

# ── fail-safe: neistota = plný beh ─────────────────────────────────────────
fs() { # name, env assignments...
  local name="$1"; shift
  local out got
  out="$(env "$@" "$SUBJECT" 2>&1)"
  got="$(echo "$out" | grep '^app_touched=' | head -1 | cut -d= -f2)"
  if [ "$got" = "true" ]; then
    echo "ok    $name  (fail-safe: plný beh)"
  else
    echo "FAIL  $name  fail-safe zlyhal, dostal '$got'"
    failures=$((failures + 1))
  fi
}

# Bez CI_DIFF_FILES a s eventom, ktorý nemá base.
fs "workflow_dispatch nemá base" GITHUB_EVENT_NAME=workflow_dispatch CI_DIFF_FILES=
fs "neznámy event"               GITHUB_EVENT_NAME=schedule CI_DIFF_FILES=
# Prázdny diff v repozitári bez histórie -> git zlyhá -> plný beh.
fs "prázdny zoznam súborov"      GITHUB_EVENT_NAME=pull_request CI_DIFF_FILES= GIT_DIR=/nonexistent

echo
if [ "$failures" -eq 0 ]; then
  echo "classify-diff: všetky kontroly prešli"
else
  echo "classify-diff: $failures zlyhaní"
  exit 1
fi
