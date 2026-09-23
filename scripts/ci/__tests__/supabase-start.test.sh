#!/usr/bin/env bash
# Tests for scripts/ci/supabase-start.sh against a stub CLI.
#
# What this can and cannot prove: it exercises the retry logic — how many times
# the CLI is called, what the exit code is, that a first-attempt success costs
# nothing and that a permanent failure still terminates. It proves nothing about
# ghcr.io, because the registry is exactly the part no test can hold still.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUBJECT="$HERE/../supabase-start.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$WORK/bin"
cat > "$WORK/bin/supabase" <<'STUB'
#!/usr/bin/env bash
case "$1" in
  start)
    n=$(( $(cat "$COUNTER" 2>/dev/null || echo 0) + 1 ))
    echo "$n" > "$COUNTER"
    [ "$n" -ge "${SUCCEED_ON:-99}" ] && exit 0
    echo "toomanyrequests" >&2
    exit 1 ;;
  stop) exit 0 ;;
esac
STUB
chmod +x "$WORK/bin/supabase"

export PATH="$WORK/bin:$PATH"
export SUPABASE_START_BACKOFF_SECONDS=0   # no real sleeping in tests
failures=0

check() { # name, expected_exit, expected_attempts, SUCCEED_ON
  local name="$1" want_exit="$2" want_attempts="$3" succeed_on="$4"
  local counter="$WORK/counter.$RANDOM"
  COUNTER="$counter" SUCCEED_ON="$succeed_on" bash "$SUBJECT" >/dev/null 2>&1
  local got_exit=$? got_attempts
  got_attempts="$(cat "$counter" 2>/dev/null || echo 0)"
  if [ "$got_exit" = "$want_exit" ] && [ "$got_attempts" = "$want_attempts" ]; then
    echo "ok   $name"
  else
    echo "FAIL $name — exit $got_exit (want $want_exit), attempts $got_attempts (want $want_attempts)"
    failures=$((failures + 1))
  fi
}

# A healthy run must be indistinguishable from calling the CLI directly: one
# call, no retries, no added latency.
check "a first-attempt success calls the CLI once" 0 1 1
check "a transient failure is ridden out" 0 3 3
# The important negative: a permanently rate-limited registry must still end the
# job rather than loop, and must end it red.
check "a permanent failure stops after the attempt budget" 1 3 99

[ "$failures" -eq 0 ] || { echo "$failures test(s) failed"; exit 1; }
echo "all supabase-start tests passed"
