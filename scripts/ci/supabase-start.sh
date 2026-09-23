#!/usr/bin/env bash
# Start the local Supabase stack, riding out a rate-limited image registry.
#
# `supabase start` pulls six images from ghcr.io. On 2026-09-23 CI hit
# `toomanyrequests` twice in a row, on every attempt the CLI makes internally:
#
#   ghcr.io/supabase/studio        attempt 1,2,3 -> toomanyrequests
#   ghcr.io/supabase/edge-runtime  attempt 1,2,3 -> toomanyrequests
#     retry-after: 353.157µs, allowed: 44000/minute
#
# Authenticating does not fix it — the workflow already logs in to ghcr.io on
# the step before, and the failure persisted. An allowance of 44000/minute is
# not a per-account budget, so the limiter is shared and bursty: the CLI's own
# three attempts all land inside the same burst, microseconds apart, and all
# lose. What it needs is distance in time, not more attempts.
#
# This step is 11th of 24, so when it fails Test and Build are skipped and the
# job goes red having said nothing about the code. That is the cost being
# avoided here.
#
# On a first-attempt success the behaviour is identical to calling the CLI
# directly. Retries only ever happen on a failure that would have been fatal.
set -uo pipefail

ATTEMPTS="${SUPABASE_START_ATTEMPTS:-3}"
# Overridable so the test suite does not sleep for minutes.
BACKOFF="${SUPABASE_START_BACKOFF_SECONDS:-45}"

for attempt in $(seq 1 "$ATTEMPTS"); do
  if supabase start; then
    [ "$attempt" -gt 1 ] && echo "supabase start succeeded on attempt ${attempt}/${ATTEMPTS}"
    exit 0
  fi

  # A partial start leaves containers holding ports, which would make the next
  # attempt fail for a reason that has nothing to do with the registry.
  supabase stop --no-backup >/dev/null 2>&1 || true

  if [ "$attempt" -lt "$ATTEMPTS" ]; then
    delay=$((attempt * BACKOFF))
    echo "::warning::supabase start failed (attempt ${attempt}/${ATTEMPTS}) — retrying in ${delay}s"
    sleep "$delay"
  fi
done

echo "::error::supabase start failed ${ATTEMPTS} times — see the log above for the cause"
echo "If every attempt says 'toomanyrequests', the image registry is rate limiting" >&2
echo "the shared runner pool. That is not a fault in the diff under test." >&2
exit 1
