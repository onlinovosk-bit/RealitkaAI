import { createClient } from "@/lib/supabase/server";
import { okResponse, errorResponse } from "@/lib/api-response";
import { incrementUsageMetric } from "@/lib/usage-metrics";
import { listGenerations, effectiveContent } from "@/lib/listings/generations-store";

/** GET — posledné drafty agentúry prihláseného používateľa. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.agency_id) return errorResponse("Chýba agency_id v profile.", 400);

  const agencyId = profile.agency_id as string;
  const rows = await listGenerations({ agencyId });

  // Contract import must be live; delta 0 avoids skewing AI token counters.
  await incrementUsageMetric({ agencyId, metric: "ai_openai_tokens", delta: 0 });

  // UI always gets latest version — maklér edit if present.
  const items = rows.map((g) => ({ ...g, content: effectiveContent(g) }));
  return okResponse({ items });
}
