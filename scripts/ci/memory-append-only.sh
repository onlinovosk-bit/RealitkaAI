#!/usr/bin/env bash
# memory-append-only.sh — MEMORY-GUARD: a PR must not destroy memory history.
#
# memory/session-summary.md and memory/decisions.md are chronological logs:
# every session PREPENDS an entry, nothing older is removed (CLAUDE.md,
# "Session Wrap-up"). That rule was broken twice, each time silently:
# #701 (write instead of prepend, 1339 lines, caught before merge) and #746
# (overwrite, −1090 lines, 44 entries — merged, restored by #751).
#
# WHAT IS COMPARED
# ================
# Not the branch diff. A stale branch shows "deletions" a real merge never
# makes, and that produced two false alarms on #745 alone: −72 lines (the
# entry had landed on main 1.5 min AFTER the branch merged main — replay:
# `memory-append-only.sh 167a99b 9774b2c` → ok) and −1211 lines (#751 landed
# after the branch merged main). The first one was acted on: ff37498 "restored"
# an entry that was never lost. So the guard simulates the merge
# (`git merge-tree`) and compares its result with the base — exactly what
# GitHub would write.
#
# RULES (measured on main's history, 2026-09-30)
# ===============================================
#   FAIL  an entry heading present on the base (`## …`) is missing after merge
#   FAIL  more than MAX_DELETED lines of a log disappear
#   WARN  1..MAX_DELETED lines change without losing an entry — a correction
#         of an existing entry. #692 (−2), #709 (−2), #725 (−1), #726 (−4)
#         were such corrections; a zero-deletion rule would have blocked them.
#   PASS  prepend only
# Deliberate rewrites (e.g. a restoration like #751) pass with the PR label
# `memory-rewrite-approved`, which the workflow turns into MEMORY_GUARD_ALLOW=1.
#
# FAIL-SAFE
# =========
# A merge conflict cannot be evaluated; GitHub blocks merging a conflicted PR
# anyway and the resolution push re-runs this check, so a conflict is reported
# and skipped (exit 0). Any other git failure is an error (exit 2), never a pass.
#
# Usage: memory-append-only.sh <base-ref> <head-ref>

set -uo pipefail

BASE="${1:-}"
HEAD="${2:-}"
MAX_DELETED="${MEMORY_GUARD_MAX_DELETED:-20}"
FILES=(memory/session-summary.md memory/decisions.md)

if [ -z "$BASE" ] || [ -z "$HEAD" ]; then
  echo "usage: $0 <base-ref> <head-ref>" >&2
  exit 2
fi
for ref in "$BASE" "$HEAD"; do
  if ! git rev-parse --verify --quiet "$ref^{commit}" >/dev/null; then
    echo "::error::MEMORY-GUARD: ref '$ref' not found (fetch-depth?)" >&2
    exit 2
  fi
done

merged="$(git merge-tree --write-tree "$BASE" "$HEAD" 2>/dev/null)"
status=$?
if [ "$status" -eq 1 ]; then
  echo "::warning::MEMORY-GUARD: PR is in merge conflict with $BASE — skipped; the resolution push re-runs this check."
  exit 0
elif [ "$status" -ne 0 ]; then
  echo "::error::MEMORY-GUARD: git merge-tree failed (exit $status)" >&2
  exit 2
fi
merged_tree="$(printf '%s\n' "$merged" | head -1)"

headings() { # <tree-ish> <path> → entry headings, one per line
  git show "$1:$2" 2>/dev/null | grep -E '^## ' || true
}

failed=0
warned=0
for f in "${FILES[@]}"; do
  if ! git cat-file -e "$BASE:$f" 2>/dev/null; then
    echo "ok    $f  (not on base)"
    continue
  fi
  if ! git cat-file -e "$merged_tree:$f" 2>/dev/null; then
    echo "FAIL  $f  would be DELETED by this PR"
    failed=1
    continue
  fi

  deleted="$(git diff --numstat "$BASE" "$merged_tree" -- "$f" | awk '{print $2}')"
  added="$(git diff --numstat "$BASE" "$merged_tree" -- "$f" | awk '{print $1}')"
  deleted="${deleted:-0}"; added="${added:-0}"

  lost="$(comm -23 <(headings "$BASE" "$f" | sort -u) <(headings "$merged_tree" "$f" | sort -u))"

  if [ -n "$lost" ]; then
    echo "FAIL  $f  +$added −$deleted — entries present on $BASE would disappear:"
    printf '%s\n' "$lost" | head -20 | sed 's/^/        /'
    failed=1
  elif [ "$deleted" -gt "$MAX_DELETED" ]; then
    echo "FAIL  $f  +$added −$deleted — more than $MAX_DELETED lines of history removed"
    failed=1
  elif [ "$deleted" -gt 0 ]; then
    echo "WARN  $f  +$added −$deleted — existing entry edited, no entry lost:"
    git diff -U0 "$BASE" "$merged_tree" -- "$f" | grep -E '^-[^-]' | head -"$MAX_DELETED" | sed 's/^/        /'
    warned=1
  else
    echo "ok    $f  +$added −0"
  fi
done

if [ "$failed" -ne 0 ]; then
  if [ "${MEMORY_GUARD_ALLOW:-0}" = "1" ]; then
    echo "::warning::MEMORY-GUARD: history would be lost, ALLOWED by label memory-rewrite-approved."
    exit 0
  fi
  cat >&2 <<'EOF'
::error::MEMORY-GUARD: this PR removes memory history (see above).
memory/session-summary.md and memory/decisions.md are PREPEND-ONLY logs.
Typical cause: a conflict resolved by taking one side, or `write` instead of prepend.
Fix: keep both sides' entries (new ones on top), or — for an intentional rewrite —
add the PR label `memory-rewrite-approved`.
EOF
  exit 1
fi
[ "$warned" -ne 0 ] && echo "::warning::MEMORY-GUARD: existing memory lines edited (no entry lost) — review the lines above."
exit 0
