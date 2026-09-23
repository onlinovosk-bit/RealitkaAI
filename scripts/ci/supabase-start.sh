#!/usr/bin/env bash
# Start the local Supabase stack, surviving a rate-limited image registry.
#
# `supabase start` pulls six images. The CLI defaults to ghcr.io, and on
# 2026-09-23 CI lost three jobs in a row to it:
#
#   ghcr.io/supabase/studio        attempt 1,2,3 -> toomanyrequests
#   ghcr.io/supabase/edge-runtime  attempt 1,2,3 -> toomanyrequests
#     retry-after: 353.157µs, allowed: 44000/minute
#
# Authenticating is not the lever: the workflow logs in to ghcr.io on the step
# before and the pull failed anyway. An allowance of 44000/minute is not a
# per-account budget, so the limiter is shared across the runner pool.
#
# Waiting is not enough either, and that is measured rather than assumed: a
# first version of this script retried the same registry three times with 45s
# and 90s of backoff. The step ran for 3m44s and still failed — the limit
# outlasts any backoff worth putting in a CI job.
#
# So the retries move registry instead. Supabase publishes the same images to
# Docker Hub under the same tags, verified against its API for the exact two the
# run needed:
#
#   supabase/studio:2026.08.24-sha-8ec45b2   last_updated 2026-08-24
#   supabase/edge-runtime:v1.74.3            last_updated 2026-07-31
#
# Docker Hub has its own limit, so this is not a guarantee — it is a second,
# independently limited path, which three tries against one limiter never was.
#
# The list now LEADS with public.ecr.aws, and that order is measured rather than
# preferred. Run 35908421737 took the full job green through ECR — Test, Build
# and the Playwright smoke ran for the first time that day, having been skipped
# in every earlier run. Two things came out of it:
#
#   1. ECR fails differently. ghcr.io answers `allowed: 44000/minute`, a shared
#      volume ceiling that outlasts any backoff worth putting in CI. ECR answers
#      a bare `Rate exceeded` on pulls per second:
#
#        19:21:32  Downloaded public.ecr.aws/supabase/postgres:15.8.1.085
#        19:21:33  public.ecr.aws/supabase/kong:2.8.1 -> toomanyrequests
#        19:22:30  succeeded on the next attempt, 36s later
#
#      A per-second limiter is exactly what a retry converges against, because
#      Docker keeps the layers it already has. A shared volume ceiling is not.
#
#   2. It is the CLI's own default registry, so tag parity is Supabase's problem
#      rather than ours — the reason `supabase start` reaches ECR unaided when
#      `setup-cli` has not pointed it at ghcr.io.
#
# ghcr.io is dropped from the default list, not from the repo: the workflow still
# logs in to it, so putting it back is one env var away. It is out of the default
# because three CI runs measured it saturated, including while authenticated.
#
# The step is 12th of 25, so when it fails Test and Build are skipped and the
# job goes red having said nothing about the code. That is the cost being
# avoided here. On a first-attempt success the behaviour is identical to calling
# the CLI directly.
set -uo pipefail

# Attempted in order. A registry already tried in this run is only retried after
# a wait; a fresh one is tried immediately, because a different limiter has no
# reason to be waited out.
read -ra REGISTRIES <<< "${SUPABASE_START_REGISTRIES:-public.ecr.aws docker.io public.ecr.aws}"
BACKOFF="${SUPABASE_START_BACKOFF_SECONDS:-60}"

total=${#REGISTRIES[@]}
tried=""

for index in "${!REGISTRIES[@]}"; do
  registry="${REGISTRIES[$index]}"
  attempt=$((index + 1))

  echo "supabase start: attempt ${attempt}/${total} via ${registry}"
  if SUPABASE_INTERNAL_IMAGE_REGISTRY="$registry" supabase start; then
    [ "$attempt" -gt 1 ] && echo "supabase start succeeded on attempt ${attempt}/${total} via ${registry}"
    exit 0
  fi

  # A partial start leaves containers holding ports, which would make the next
  # attempt fail for a reason that has nothing to do with any registry.
  supabase stop --no-backup >/dev/null 2>&1 || true

  [ "$attempt" -ge "$total" ] && break

  next="${REGISTRIES[$((index + 1))]}"
  if [[ " $tried $registry " == *" $next "* ]]; then
    echo "::warning::${registry} failed; next attempt reuses ${next}, waiting ${BACKOFF}s first"
    sleep "$BACKOFF"
  else
    echo "::warning::${registry} failed; trying ${next} immediately — a different limiter"
  fi
  tried="$tried $registry"
done

echo "::error::supabase start failed on every registry: ${REGISTRIES[*]}"
echo "If each attempt says 'toomanyrequests', both registries are limiting the" >&2
echo "shared runner pool. That is not a fault in the diff under test." >&2
exit 1
