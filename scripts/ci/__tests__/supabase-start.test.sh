#!/usr/bin/env bash
# Tests for scripts/ci/supabase-start.sh against a stub CLI.
#
# What this can prove: how many times the CLI is called, which registry each
# attempt uses, what the exit code is, that a first-attempt success costs
# nothing, and that a permanent failure still terminates.
#
# What it cannot prove: anything about ghcr.io or Docker Hub. The registries are
# exactly the part no test can hold still, which is why the script treats a
# second registry as a second chance rather than a guarantee.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUBJECT="$HERE/../supabase-start.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$WORK/bin"
# Records the registry of every `start`, and succeeds once the attempt counter
# reaches SUCCEED_ON (99 = never).
cat > "$WORK/bin/supabase" <<'STUB'
#!/usr/bin/env bash
case "$1" in
  start)
    echo "${SUPABASE_INTERNAL_IMAGE_REGISTRY:-unset}" >> "$LEDGER"
    [ "$(wc -l < "$LEDGER")" -ge "${SUCCEED_ON:-99}" ] && exit 0
    echo "toomanyrequests" >&2
    exit 1 ;;
  stop) exit 0 ;;
esac
STUB
chmod +x "$WORK/bin/supabase"

export PATH="$WORK/bin:$PATH"
export SUPABASE_START_BACKOFF_SECONDS=0   # no real sleeping in tests
failures=0

check() { # name, succeed_on, want_exit, want_registries (space separated)
  local name="$1" succeed_on="$2" want_exit="$3" want_registries="$4"
  local ledger="$WORK/ledger.$RANDOM"
  : > "$ledger"
  LEDGER="$ledger" SUCCEED_ON="$succeed_on" bash "$SUBJECT" >/dev/null 2>&1
  local got_exit=$? got_registries
  got_registries="$(tr '\n' ' ' < "$ledger" | sed 's/ *$//')"
  if [ "$got_exit" = "$want_exit" ] && [ "$got_registries" = "$want_registries" ]; then
    echo "ok   $name"
  else
    echo "FAIL $name"
    echo "       exit       got '$got_exit' want '$want_exit'"
    echo "       registries got '$got_registries' want '$want_registries'"
    failures=$((failures + 1))
  fi
}

# A healthy run must be indistinguishable from calling the CLI directly: one
# call, no retries, no added latency.
check "a first-attempt success calls the CLI once, on the default registry" 1 0 "ghcr.io"

# The point of the change: the second attempt must land on a DIFFERENT limiter.
# Retrying ghcr.io here would repeat the failure that was measured in CI.
check "a ghcr.io failure falls back to Docker Hub" 2 0 "ghcr.io docker.io"

# Docker Hub is limited too, so the last attempt comes back to ghcr.io — by then
# a minute has passed, which is the only case where waiting is worth anything.
check "both registries failing still ends, after trying each" 99 1 "ghcr.io docker.io ghcr.io"

# The list is data, not structure: a deployment that wants a mirror should not
# need to edit the loop.
SUPABASE_START_REGISTRIES="mirror.internal" check "the registry list is configurable" 99 1 "mirror.internal"

[ "$failures" -eq 0 ] || { echo "$failures test(s) failed"; exit 1; }
echo "all supabase-start tests passed"
