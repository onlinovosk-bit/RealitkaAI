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
# The list LEADS with docker.io, and that order is measured rather than preferred.
# Every registry here has now been watched in CI, and the tally is one-sided:
#
#   registry          first attempt            as a later attempt
#   ghcr.io           0 for 3, authenticated   never reached
#   public.ecr.aws    0 for 3                  1 for 1
#   docker.io         never tried first        2 for 2
#
# public.ecr.aws led the list first, on the reasoning that it is the CLI's own
# default and so tag parity is Supabase's problem rather than ours. That part
# still holds, and it is why ECR stays in the list. What did not hold is that
# it should go first: it has never once carried `supabase start` on the first
# attempt. Its failure mode is a bare `Rate exceeded` on pulls per second,
#
#   20:15:32  attempt 1/3 via public.ecr.aws   (9 of 10 images pulled)
#   20:16:56  public.ecr.aws/supabase/edge-runtime:v1.74.3 -> toomanyrequests
#   20:17:36  succeeded on attempt 2/3 via docker.io
#
# which a retry does converge against — but paying ~85s for a first attempt that
# has never succeeded is a worse trade than starting on the registry that has.
#
# One thing ECR-first was assumed to buy, and does not: it does NOT spend less of
# Docker Hub's anonymous allowance. The attempt above re-pulled all ten images
# from Docker Hub, because `public.ecr.aws/supabase/postgres` and
# `supabase/postgres` are different repositories to Docker and the manifest is
# fetched again. Only the layers are reused, which buys time (37s instead of 84s)
# and no quota at all.
#
# ghcr.io is dropped from the default list, not from the repo: the workflow still
# logs in to it, so putting it back is one env var away. It is out of the default
# because three CI runs measured it saturated, including while authenticated, and
# because backoff does not outlast a shared volume ceiling.
#
# The step is 12th of 25, so when it fails Test and Build are skipped and the
# job goes red having said nothing about the code. That is the cost being
# avoided here. On a first-attempt success the behaviour is identical to calling
# the CLI directly.
set -uo pipefail

# Attempted in order. A registry already tried in this run is only retried after
# a wait; a fresh one is tried immediately, because a different limiter has no
# reason to be waited out.
read -ra REGISTRIES <<< "${SUPABASE_START_REGISTRIES:-docker.io public.ecr.aws docker.io}"
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
