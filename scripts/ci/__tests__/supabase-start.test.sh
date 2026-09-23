#!/usr/bin/env bash
# Tests for scripts/ci/supabase-start.sh against a stub CLI.
#
# What this can prove: how many times the CLI is called, which registry each
# attempt uses, what the exit code is, that a first-attempt success costs
# nothing, and that a permanent failure still terminates.
#
# What it cannot prove: anything about public.ecr.aws, ghcr.io or Docker Hub.
# The registries are exactly the part no test can hold still, which is why the
# script treats a second registry as a second chance rather than a guarantee.
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
#
# The registry it lands on is public.ecr.aws and that is asserted on purpose:
# the order is a measured claim (run 35908421737 went green through ECR, the
# same day three runs measured ghcr.io saturated even while authenticated), so
# a silent reordering should fail here rather than in CI an hour later.
check "a first-attempt success calls the CLI once, on the default registry" 1 0 "public.ecr.aws"

# The point of the change: the second attempt must land on a DIFFERENT limiter.
# Retrying the same registry here would repeat the failure that was measured.
check "an ECR failure falls back to Docker Hub" 2 0 "public.ecr.aws docker.io"

# Docker Hub is limited too, so the last attempt comes back to ECR — by then a
# minute has passed, which is the only case where waiting is worth anything.
# It is also the case actually seen in CI: ECR refused kong:2.8.1 on pulls per
# second and the very next attempt succeeded, because Docker kept the layers.
check "both registries failing still ends, after trying each" 99 1 "public.ecr.aws docker.io public.ecr.aws"

# The list is data, not structure: a deployment that wants a mirror should not
# need to edit the loop.
SUPABASE_START_REGISTRIES="mirror.internal" check "the registry list is configurable" 99 1 "mirror.internal"

[ "$failures" -eq 0 ] || { echo "$failures test(s) failed"; exit 1; }
echo "all supabase-start tests passed"
