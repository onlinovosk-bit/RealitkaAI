import { z } from "zod";
import { errorResponse, okResponse } from "@/lib/api-response";
import { validateBody } from "@/lib/api-validate";
import { writeManualSubscriptionSnapshot } from "@/lib/ai-control-tower/subscription-write";
import { requirePlatformAdmin } from "@/lib/onboarding-mvp/require-platform-admin";
import { createClient } from "@/lib/supabase/server";
import { incrementUsageMetric, SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";

const SnapshotBody = z.object({
  provider: z.string(),
  accountRef: z.string(),
  quotaWindow: z.string(),
  usedPercent: z.number().nullable().optional(),
  remainingPercent: z.number().nullable().optional(),
  resetAt: z.string(),
  resetTimezone: z.string(),
  capturedAt: z.string(),
  note: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("unauthorized", 401);

  const parsed = await validateBody(req, SnapshotBody);
  if (!parsed.ok) return parsed.response;

  const result = await writeManualSubscriptionSnapshot(parsed.data);
  if (!result.ok) return errorResponse(result.error, result.status);

  await incrementUsageMetric({
    agencyId: SYSTEM_USAGE_AGENCY_ID,
    metric: "ai_control_tower_snapshot",
  });

  return okResponse({
    poolId: result.snapshot.poolId,
    inserted: result.inserted,
    usedPercent: result.snapshot.usedPercent,
    remainingPercent: result.snapshot.remainingPercent,
  });
}
