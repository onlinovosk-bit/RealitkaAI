import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";
import { logAiAction } from "@/lib/ai-action-audit";
import { CREDIT_ACTION_COSTS } from "@/lib/program-tier-pricing";
import { spendForAction } from "@/lib/credits/spend-for-action";
import { createHash } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { validateBody } from "@/lib/api-validate";
import { okResponse, errorResponse } from "@/lib/api-response";
import { incrementUsageMetric } from "@/lib/usage-metrics";
import {
  buildPropertyLaunchPack,
  factsFromPropertyInput,
  factsFromRealviaRow,
  isPropertyLaunchPackEnabled,
  resolveTaxonomy,
} from "@/lib/capabilities/property-launch-pack";
import { isRealviaMappingUnknown } from "@/lib/realvia/map-taxonomy";
import type { RealviaPropertyRow } from "@/lib/capabilities/_shared/realvia-property-row";

export const runtime = "nodejs";

const BodySchema = z
  .object({
    sourceId: z.string().min(1).optional(),
    propertyId: z.string().optional(),
    persona: z.enum(["INVESTOR", "FAMILY", "DOWNSIZER", "GENERAL"]).optional(),
    taxonomyConfirm: z
      .object({
        type: z.string().min(1).optional(),
        transactionType: z.string().min(1).optional(),
      })
      .optional(),
    property: z
      .object({
        type: z.string().min(1),
        location: z.string().min(1),
        price: z.number(),
        size_m2: z.number().optional(),
        condition: z.string().optional(),
        transactionType: z.string().min(1).optional(),
        features: z.array(z.string()).optional(),
        rooms: z.string().optional(),
        floor: z.number().optional(),
        total_floors: z.number().optional(),
        district: z.string().optional(),
        agent_notes: z.string().optional(),
      })
      .optional(),
  })
  .refine((b) => Boolean(b.sourceId) || Boolean(b.property), {
    message: "Provide sourceId or property",
  });

/**
 * POST /api/ai/property-launch-pack
 * Flag: PROPERTY_LAUNCH_PACK_V0=1
 * Does not write portal_listings. Export JSON only when Guardian passes.
 */
export async function POST(req: Request) {
  if (!isPropertyLaunchPackEnabled()) {
    return errorResponse("Property Launch Pack V0 is disabled", 404);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const block = await checkAiRateLimit(user.id, "property-launch-pack", 10);
  if (block) return errorResponse(String(block.error ?? "Rate limit"), 429, block);

  const parsed = await validateBody(req, BodySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const agencyId = profile?.agency_id ?? null;
  if (!agencyId) return errorResponse("Missing agency_id", 403);

  let facts;
  let propertyRow: RealviaPropertyRow | undefined;

  if (body.sourceId) {
    const admin = createServiceRoleClient();
    if (!admin) return errorResponse("Server misconfigured", 503);
    const { data, error } = await admin
      .from("properties")
      .select(
        "id, source_id, source_system, title, description, price, currency, location, type, rooms, transaction_type, usable_area, land_area, building_area, rooms_count, floor, broker_name, broker_email, broker_phone, images, payload_raw, latitude, longitude, agency_id",
      )
      .eq("agency_id", agencyId)
      .eq("source_id", String(body.sourceId))
      .maybeSingle();

    if (error || !data) return errorResponse("Property not found", 404);
    propertyRow = data as unknown as RealviaPropertyRow;
    facts = factsFromRealviaRow(propertyRow);
  } else {
    const p = body.property!;
    facts = factsFromPropertyInput(
      {
        type: p.type,
        location: p.location,
        price: p.price,
        size_m2: p.size_m2 ?? 1,
        condition: p.condition ?? "neuvedené",
        features: p.features ?? [],
        rooms: p.rooms,
        floor: p.floor,
        total_floors: p.total_floors,
        district: p.district,
        agent_notes: p.agent_notes,
      },
      { propertyId: body.propertyId ?? null, transactionType: p.transactionType ?? null },
    );
  }

  const taxonomyPeek = resolveTaxonomy(facts, body.taxonomyConfirm);
  const blockedOnTaxonomy =
    isRealviaMappingUnknown(taxonomyPeek.type) ||
    isRealviaMappingUnknown(taxonomyPeek.transactionType);

  if (blockedOnTaxonomy) {
    const result = await buildPropertyLaunchPack({
      agencyId,
      facts,
      persona: body.persona ?? "GENERAL",
      taxonomyConfirm: body.taxonomyConfirm,
      propertyRow,
    });
    return okResponse({
      exportAllowed: false,
      needsTypeConfirm: result.needsTypeConfirm,
      needsTxnConfirm: result.needsTxnConfirm,
      taxonomy: result.taxonomy,
      guardian: result.guardian,
      channels: null,
      exportPayload: null,
      message: "Guardian FLAG — potvrď type/transaction (Neznáme), potom znova. Kredity sa nestrhli.",
    });
  }

  const spend = await spendForAction({
    action: "listingDescription",
    agencyId,
    idempotencyKey: `property_launch_pack:${user.id}:${createHash("sha256")
      .update(JSON.stringify({ sourceId: body.sourceId, property: body.property, confirm: body.taxonomyConfirm }))
      .digest("hex")
      .slice(0, 32)}`,
  });

  if (!spend.allowed) {
    return errorResponse(
      `Nedostatok kreditov — launch pack stojí ${spend.cost} kreditov.`,
      402,
      { creditsRequired: spend.cost, upgradeUrl: "/billing" },
    );
  }

  const result = await buildPropertyLaunchPack({
    agencyId,
    facts,
    persona: body.persona ?? "GENERAL",
    taxonomyConfirm: body.taxonomyConfirm,
    propertyRow,
  });

  await incrementUsageMetric({
    agencyId,
    metric: "ai_openai_tokens",
    delta: 0,
  });

  await logAiAction({
    action: "property_launch_pack",
    agencyId,
    creditsSpent: CREDIT_ACTION_COSTS.listingDescription,
    costEur: result.audit?.costEur ?? 0,
    model: result.audit?.model ?? "unknown",
    latencyMs: result.audit?.latencyMs ?? 0,
    meta: {
      exportAllowed: result.exportAllowed,
      guardian: result.guardian.verdict,
      sourceId: facts.sourceId,
      creditsCharged: spend.charged,
    },
  });

  return okResponse({
    exportAllowed: result.exportAllowed,
    needsTypeConfirm: result.needsTypeConfirm,
    needsTxnConfirm: result.needsTxnConfirm,
    taxonomy: result.taxonomy,
    guardian: result.guardian,
    channels: result.channels,
    exportPayload: result.exportPayload,
    message: result.exportAllowed
      ? "Pack schválený Guardianom — stiahni exportPayload (žiadne autonómne publikovanie)."
      : "Guardian FLAG — potvrď type/transaction alebo oprav fakty, potom znova.",
  });
}
