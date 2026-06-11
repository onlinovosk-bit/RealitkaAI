import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";
import { generateListingContent } from "@/lib/ai/listing-content";
import type { PropertyInput, ListingPersona } from "@/lib/ai/listing-content";
import { logAiAction } from "@/lib/ai-action-audit";
import { CREDIT_ACTION_COSTS } from "@/lib/program-tier-pricing";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const block = await checkAiRateLimit(user.id, "listing-content", 10);
  if (block) return NextResponse.json(block, { status: 429 });

  let body: { property: PropertyInput; persona?: ListingPersona };
  try {
    body = (await req.json()) as { property: PropertyInput; persona?: ListingPersona };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.property?.type || !body.property?.location || !body.property?.price) {
    return NextResponse.json(
      { ok: false, error: "Chýbajú povinné polia: type, location, price" },
      { status: 400 },
    );
  }

  const { content, audit } = await generateListingContent(body.property, body.persona ?? "GENERAL");
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  await logAiAction({
    action: "listing_description",
    agencyId: profile?.agency_id ?? null,
    creditsSpent: CREDIT_ACTION_COSTS.listingDescription,
    costEur: audit.costEur,
    model: audit.model,
    latencyMs: audit.latencyMs,
    meta: { persona: body.persona ?? "GENERAL" },
  });

  return NextResponse.json({ ok: true, content });
}
