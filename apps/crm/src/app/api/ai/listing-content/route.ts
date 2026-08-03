import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";
import { generateListingContent } from "@/lib/ai/listing-content";
import { generateListingVariants } from "@/lib/ai/listing-variants";
import type { PropertyInput, ListingPersona } from "@/lib/ai/listing-content";
import { logAiAction } from "@/lib/ai-action-audit";
import { CREDIT_ACTION_COSTS } from "@/lib/program-tier-pricing";
import { spendForAction, creditsEnforcementEnabled } from "@/lib/credits/spend-for-action";
import { createHash } from "crypto";
import { saveGeneration } from "@/lib/listings/generations-store";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const block = await checkAiRateLimit(user.id, "listing-content", 10);
  if (block) return NextResponse.json(block, { status: 429 });

  let body: { property: PropertyInput; persona?: ListingPersona; propertyId?: string; variants?: boolean };
  try {
    body = (await req.json()) as { property: PropertyInput; persona?: ListingPersona; propertyId?: string; variants?: boolean };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.property?.type || !body.property?.location || !body.property?.price) {
    return NextResponse.json(
      { ok: false, error: "Chýbajú povinné polia: type, location, price" },
      { status: 400 },
    );
  }

  // Profil sa načíta PRED generovaním — bez agency_id sa nedá účtovať
  // a zbytočne by sme minuli tokeny na úkon, ktorý zákazník nemá pokrytý.
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // Odpočet kreditov. Predvolene VYPNUTÝ (CREDITS_ENFORCEMENT != "enforce") —
  // vtedy len vráti cenu a pustí ďalej. Audit: nález A1.
  const spend = await spendForAction({
    action: "listingDescription",
    agencyId: profile?.agency_id ?? null,
    idempotencyKey: `listing_description:${user.id}:${createHash("sha256")
      .update(JSON.stringify(body.property))
      .digest("hex")
      .slice(0, 32)}`,
  });

  if (!spend.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Nedostatok kreditov — popis inzerátu stojí ${spend.cost} kreditov.`,
        creditsRequired: spend.cost,
        upgradeUrl: "/billing",
      },
      { status: 402 },
    );
  }

  // variants=true vygeneruje 4 štýlové varianty jedným volaním. Input sa
  // neopakuje, násobí sa len output — 0,064 EUR oproti 0,0185 EUR za jeden.
  const multi = body.variants === true;
  const generated = multi
    ? await generateListingVariants(body.property, body.persona ?? "GENERAL")
    : await generateListingContent(body.property, body.persona ?? "GENERAL");

  const variants = "variants" in generated ? generated.variants : null;
  const content = "content" in generated ? generated.content : generated.variants.conversion;
  const audit = generated.audit;

  await logAiAction({
    action: "listing_description",
    agencyId: profile?.agency_id ?? null,
    creditsSpent: CREDIT_ACTION_COSTS.listingDescription,
    costEur: audit.costEur,
    model: audit.model,
    latencyMs: audit.latencyMs,
    meta: { persona: body.persona ?? "GENERAL", creditsCharged: spend.charged },
  });

  // Perzistencia draftu — bez nej maklér stratí text zavretím tabu.
  // Best-effort: zlyhanie zápisu nesmie zhodiť odpoveď.
  // .cursor/rules/revolis-incidents.mdc — I-03
  const saved = await saveGeneration({
    agencyId: profile?.agency_id ?? null,
    propertyId: body.propertyId ?? null,
    persona: body.persona ?? "GENERAL",
    property: body.property,
    content,
    variants,
    model: audit.model,
    latencyMs: audit.latencyMs,
    costEur: audit.costEur,
    creditsSpent: spend.charged ? spend.cost : 0,
  });

  return NextResponse.json({
    ok: true,
    content,
    variants,
    generationId: saved.id ?? null,
    credits: { cost: spend.cost, charged: spend.charged, enforced: creditsEnforcementEnabled() },
  });
}
