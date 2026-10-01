#!/usr/bin/env bash
# Tests for scripts/ci/memory-append-only.sh (MEMORY-GUARD).
#
# Each case builds a throwaway git repo with a `main` and a `pr` branch and
# asserts the guard's exit code. The cases are the real incidents plus the real
# legitimate edits from main's history, so the rule is pinned to what happened,
# not to what we imagine:
#   #746   overwrite dropping entries            → FAIL
#   —      conflict resolved by taking one side, an entry from main lost → FAIL
#   #745   stale branch: main gained entries after the branch merged main → PASS
#          (two false alarms on #745 were exactly this — see the script header)
#   #725   one-line correction of an existing entry → PASS (warn)
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUBJECT="$HERE/../memory-append-only.sh"
failures=0
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

entry() { printf '## Session %s\n### Dokončené\n- %s\n\n' "$1" "$2"; }

repo() { # fresh repo with main = 3 entries in session-summary + 1 decision
  local d="$TMP/$1"
  rm -rf "$d"; mkdir -p "$d/memory"; cd "$d" || exit 2
  git init -q -b main
  git config user.email t@t; git config user.name t
  { entry 3 c; entry 2 b; entry 1 a; } > memory/session-summary.md
  printf '## [2026-09-01] D1\n- x\n' > memory/decisions.md
  printf 'people\n' > memory/people.md
  git add -A; git commit -qm base
  git checkout -q -b pr
}

commit() { git add -A; git commit -qm "$1" >/dev/null; }

expect() { # name, want-exit, [env...]
  local name="$1" want="$2"; shift 2
  local out got
  out="$(env "$@" "$SUBJECT" main pr 2>&1)"; got=$?
  if [ "$got" = "$want" ]; then
    echo "ok    $name  (exit $got)"
  else
    echo "FAIL  $name  chcel exit $want, dostal $got"
    echo "$out" | sed 's/^/        /'
    failures=$((failures + 1))
  fi
}

# 1. prepend only — the normal wrap-up
repo prepend
{ entry 4 d; cat memory/session-summary.md; } > s && mv s memory/session-summary.md
commit prepend
expect "prepend" 0

# 2. #746: overwrite with only the new entry
repo overwrite
entry 4 d > memory/session-summary.md
commit overwrite
expect "#746 overwrite" 1

# 3. conflict resolved by taking one side — an entry that exists on main
#    (added there after the branch point) disappears from the merge result
repo ui-resolve
git checkout -q main
{ entry 4 main-side; cat memory/session-summary.md; } > s && mv s memory/session-summary.md
commit main-adds
git checkout -q pr
{ entry 5 pr-side; cat memory/session-summary.md; } > s && mv s memory/session-summary.md
commit pr-adds
git merge -q main -m m >/dev/null 2>&1 || true
# resolve by taking the PR side only
{ entry 5 pr-side; entry 3 c; entry 2 b; entry 1 a; } > memory/session-summary.md
git add -A; git commit -qm resolve >/dev/null
expect "one-sided conflict resolution" 1

# 4. #745 stale branch: main gained entries after the PR last merged main.
#    The plain diff shows deletions; the simulated merge must not.
repo stale
{ entry 5 pr-side; cat memory/session-summary.md; } > s && mv s memory/session-summary.md
commit pr-adds
git checkout -q main
{ entry 4 restored; cat memory/session-summary.md; } > s && mv s memory/session-summary.md
commit main-restores
git checkout -q pr
expect "stale branch, merge keeps main's entries" 0

# 5. #725: one-line correction inside an existing entry
repo correction
sed -i 's/^- b$/- b (opravené)/' memory/session-summary.md
commit correction
expect "one-line correction (warn)" 0

# 6. too many lines removed even though headings survive
repo gutted
{ printf '## Session 3\n'; printf '## Session 2\n'; printf '## Session 1\n'; } > memory/session-summary.md
commit gutted
expect "headings kept, bodies gutted beyond limit" 1 MEMORY_GUARD_MAX_DELETED=3

# 7. decisions.md is guarded too
repo decisions
printf '## [2026-09-30] D2\n- y\n' > memory/decisions.md
commit decisions
expect "decisions.md entry lost" 1

# 8. the file deleted outright
repo deleted
git rm -q memory/session-summary.md
commit rm
expect "session-summary.md deleted" 1

# 9. override label
repo override
entry 4 d > memory/session-summary.md
commit overwrite
expect "overwrite allowed by label" 0 MEMORY_GUARD_ALLOW=1

# 10. unguarded memory file may change freely
repo people
printf 'other\n' > memory/people.md
commit people
expect "people.md not guarded" 0

# 11. conflict with main → skipped (GitHub blocks the merge; resolution re-runs)
repo conflict
git checkout -q main
sed -i 's/^- a$/- a main/' memory/session-summary.md; commit main-edit
git checkout -q pr
sed -i 's/^- a$/- a pr/' memory/session-summary.md; commit pr-edit
expect "merge conflict → skip" 0

# 12. unknown ref → error, never a pass
repo badref
out="$("$SUBJECT" main does-not-exist 2>&1)"; got=$?
if [ "$got" = "2" ]; then echo "ok    unknown ref → error  (exit 2)"; else echo "FAIL  unknown ref: exit $got"; failures=$((failures+1)); fi

echo
if [ "$failures" -ne 0 ]; then echo "$failures test(s) failed"; exit 1; fi
echo "all memory-guard tests passed"
