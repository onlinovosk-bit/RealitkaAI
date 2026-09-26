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
    # FAIL_MESSAGE decides which KIND of failure this is. The default is a
    # registry limit; a test that wants a real fault overrides it.
    echo "${FAIL_MESSAGE:-toomanyrequests}" >&2
    exit 1 ;;
  stop) exit 0 ;;
esac
STUB
chmod +x "$WORK/bin/supabase"

export PATH="$WORK/bin:$PATH"
export SUPABASE_START_BACKOFF_SECONDS=0   # no real sleeping in tests
failures=0

LAST_OUTPUT=""

check() { # name, succeed_on, want_exit, want_registries (space separated)
  local name="$1" succeed_on="$2" want_exit="$3" want_registries="$4"
  local ledger="$WORK/ledger.$RANDOM" out="$WORK/out.$RANDOM"
  : > "$ledger"
  LEDGER="$ledger" SUCCEED_ON="$succeed_on" bash "$SUBJECT" >"$out" 2>&1
  local got_exit=$? got_registries
  LAST_OUTPUT="$(cat "$out")"
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
# The registry it lands on is docker.io and that is asserted on purpose: the
# order is a measured claim, not a preference. public.ecr.aws has never carried
# a first attempt (0 for 3 in CI) while docker.io has carried every attempt it
# was given (2 for 2), so a silent reordering should fail here rather than cost
# ~85s a run in CI.
check "a first-attempt success calls the CLI once, on the default registry" 1 0 "docker.io"

# The point of the wrapper: the second attempt must land on a DIFFERENT limiter.
# Retrying the same registry here would repeat the failure that was measured.
check "a Docker Hub failure falls back to ECR" 2 0 "docker.io public.ecr.aws"

# ECR is limited too, so the last attempt comes back to Docker Hub — by then a
# minute has passed, which is the only case where waiting is worth anything.
check "both registries failing still ends, after trying each" 99 1 "docker.io public.ecr.aws docker.io"

# The list is data, not structure: a deployment that wants a mirror should not
# need to edit the loop.
SUPABASE_START_REGISTRIES="mirror.internal" check "the registry list is configurable" 99 1 "mirror.internal"

# ── Attribution ───────────────────────────────────────────────────────────────
# The regression this guards is not a crash; it is a sentence. On 2026-09-25 a
# migration failed to apply, and this script retried it on two more registries
# and then reported "That is not a fault in the diff under test." It was. A
# failure that names no pull and no registry cannot be fixed by fetching the
# images somewhere else, so it must cost one attempt, not three, and must not be
# blamed on the runner pool.
FAIL_MESSAGE='ERROR: relation "public.lead_property_scores" does not exist (SQLSTATE 42P01)' \
  check "a non-registry failure costs ONE attempt, not three" 99 1 "docker.io"

case "$LAST_OUTPUT" in
  *"not a fault in the diff under test"*)
    echo "FAIL a non-registry failure must not be blamed on the registry"
    echo "       output still claims the diff is innocent"
    failures=$((failures + 1)) ;;
  *) echo "ok   a non-registry failure is not blamed on the registry" ;;
esac

# And the real SQL error has to survive to the reader: a classifier that hides
# the CLI output would trade one wrong diagnosis for no diagnosis at all.
case "$LAST_OUTPUT" in
  *"lead_property_scores"*) echo "ok   the real error reaches the job log" ;;
  *)
    echo "FAIL the CLI output was swallowed — the reader gets no error at all"
    failures=$((failures + 1)) ;;
esac

# A genuine registry exhaustion must still spend every registry, and may still
# say so — that claim is established by then, not assumed.
check "a registry limit still gets every registry" 99 1 "docker.io public.ecr.aws docker.io"
case "$LAST_OUTPUT" in
  *"both limiters are"*) echo "ok   an exhausted registry is still reported as one" ;;
  *)
    echo "FAIL a genuine registry exhaustion lost its explanation"
    failures=$((failures + 1)) ;;
esac

[ "$failures" -eq 0 ] || { echo "$failures test(s) failed"; exit 1; }
echo "all supabase-start tests passed"
