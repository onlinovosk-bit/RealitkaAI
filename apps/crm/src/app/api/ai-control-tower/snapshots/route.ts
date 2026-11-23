import { z } from "zod";
import { errorResponse, okResponse } from "@/lib/api-response";
import { validateBody } from "@/lib/api-validate";
import { rateLimit } from "@/lib/rate-limit";
import { incrementUsageMetric, SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";
import { writeManualSubscriptionSnapshot } from "@/lib/ai-control-tower/subscription-write";
import { requirePlatformAdmin } from "@/lib/onboarding-mvp/require-platform-admin";

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

  // Guard heuristika berie route bez auth.getUser/createClient() v tomto súbore
  // ako verejnú. Session kontroluje requirePlatformAdmin; limit je až po nej,
  // aby anonymný traffic neminul bucket a nevolal service role.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed } = await rateLimit(`ai-control-tower-snapshot:${ip}`, 30, 60_000);
  if (!allowed) return errorResponse("Príliš veľa zápisov. Skúste o minútu.", 429);

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
