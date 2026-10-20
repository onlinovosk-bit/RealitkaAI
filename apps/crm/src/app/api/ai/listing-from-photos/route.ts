import { createHash } from "crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";
import { sanitizePropertyInput } from "@/lib/ai/listing-content";
import type { ListingPersona, PropertyInput } from "@/lib/ai/listing-content";
import { isListingFromPhotosEnabled } from "@/lib/ai/listing-from-photos-flag";
import {
  assertTenantPhotoUrls,
  extractPropertyImageUrls,
  generateListingContentFromPhotos,
  validatePhotoRequests,
} from "@/lib/ai/listing-from-photos";
import { createAnthropicListingVisionProvider } from "@/lib/ai/anthropic-listing-vision";
import {
  ListingVisionProviderError,
  createMockListingVisionProvider,
  type ListingVisionProvider,
} from "@/lib/ai/listing-vision-provider";
import { logAiAction } from "@/lib/ai-action-audit";
import { CREDIT_ACTION_COSTS } from "@/lib/program-tier-pricing";
import { spendForAction } from "@/lib/credits/spend-for-action";
import { saveGeneration } from "@/lib/listings/generations-store";
import { validateBody } from "@/lib/api-validate";
import { errorResponse, okResponse } from "@/lib/api-response";

export const runtime = "nodejs";

const PropertySchema = z.object({
  type: z.string().min(1),
  location: z.string().min(1),
  price: z.number(),
  size_m2: z.number(),
  condition: z.string(),
  features: z.array(z.string()),
  district: z.string().optional(),
  floor: z.number().optional(),
  total_floors: z.number().optional(),
  rooms: z.string().optional(),
  agent_notes: z.string().optional(),
  charakterLokality: z
    .object({
      kind: z.enum(["malé mesto", "sídlisko", "vidiek", "centrum", "satelit", "iné"]).optional(),
      text: z.string().optional(),
    })
    .optional(),
});

const PhotoSchema = z.union([
  z.object({ type: z.literal("data_url"), dataUrl: z.string().min(1) }),
  z.object({ type: z.literal("url"), url: z.string().min(1) }),
]);

const BodySchema = z.object({
  property: PropertySchema,
  persona: z.enum(["INVESTOR", "FAMILY", "DOWNSIZER", "GENERAL"]).optional(),
  propertyId: z.string().min(1).optional(),
  photos: z.array(PhotoSchema).min(1),
});

const MOCK_LISTING = {
  portal_text: "Mock portal text z fotiek a parametrov.",
  fb_ad_copy: "Mock Facebook text.",
  ig_caption: "Mock Instagram text. #byt #presov",
  email_subject: "Mock predmet",
  email_body: "Mock telo e-mailu.",
  seo_keywords: ["byt", "prešov", "balkón", "3 izby", "predaj", "centrum"],
};

export function resolveListingVisionProvider(): ListingVisionProvider {
  if (process.env.LISTING_VISION_PROVIDER === "mock") {
    return createMockListingVisionProvider(MOCK_LISTING);
  }
  return createAnthropicListingVisionProvider();
}

/**
 * POST /api/ai/listing-from-photos
 * Flag: LISTING_FROM_PHOTOS_V0=1 (default OFF)
 * Credits: listingDescription via spendForAction
 */
export async function POST(req: Request) {
  if (!isListingFromPhotosEnabled()) {
    return errorResponse("Listing from photos is disabled", 404);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const block = await checkAiRateLimit(user.id, "listing-from-photos", 10);
  if (block) return errorResponse(String(block.error ?? "Rate limit"), 429, block);

  const parsed = await validateBody(req, BodySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const validated = validatePhotoRequests(body.photos);
  if (!validated.ok) return errorResponse(validated.error, 400);

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const agencyId = profile?.agency_id ?? null;
  if (!agencyId) return errorResponse("Missing agency_id", 403);

  const needsUrlCheck = validated.photos.some((p) => p.source === "url");
  if (needsUrlCheck) {
    if (!body.propertyId) {
      return errorResponse("URL fotografie vyžaduje propertyId vlastnej nehnuteľnosti.", 400);
    }
    const admin = createServiceRoleClient();
    if (!admin) return errorResponse("Server misconfigured", 503);
    const { data, error } = await admin
      .from("properties")
      .select("id, images, agency_id")
      .eq("id", body.propertyId)
      .eq("agency_id", agencyId)
      .maybeSingle();
    if (error || !data) return errorResponse("Property not found", 404);
    const allowed = extractPropertyImageUrls(data.images);
    const tenant = assertTenantPhotoUrls(validated.photos, allowed);
    if (!tenant.ok) return errorResponse(tenant.error, 403);
  }

  const property = sanitizePropertyInput(body.property as PropertyInput);
  const persona = (body.persona ?? "GENERAL") as ListingPersona;

  const spend = await spendForAction({
    action: "listingDescription",
    agencyId,
    idempotencyKey: `listing_from_photos:${user.id}:${createHash("sha256")
      .update(JSON.stringify({ property, persona, photos: body.photos, propertyId: body.propertyId ?? null }))
      .digest("hex")
      .slice(0, 32)}`,
  });

  if (!spend.allowed) {
    return errorResponse(
      `Nedostatok kreditov — popis inzerátu z fotiek stojí ${spend.cost} kreditov.`,
      402,
      { creditsRequired: spend.cost, upgradeUrl: "/billing" },
    );
  }

  try {
    const { content, audit } = await generateListingContentFromPhotos(
      { property, persona, photos: validated.photos },
      resolveListingVisionProvider(),
    );

    await logAiAction({
      action: "listing_from_photos",
      agencyId,
      creditsSpent: CREDIT_ACTION_COSTS.listingDescription,
      costEur: audit.costEur,
      model: audit.model,
      latencyMs: audit.latencyMs,
      meta: {
        persona,
        photoCount: validated.photos.length,
        creditsCharged: spend.charged,
        input_tokens: audit.inputTokens,
        output_tokens: audit.outputTokens,
      },
    });

    const saved = await saveGeneration({
      agencyId,
      propertyId: body.propertyId ?? null,
      persona,
      property,
      content,
      model: audit.model,
      latencyMs: audit.latencyMs,
      costEur: audit.costEur,
      creditsSpent: spend.charged ? spend.cost : 0,
    });

    return okResponse({ content, generationId: saved.id ?? null });
  } catch (err) {
    if (err instanceof ListingVisionProviderError && err.code === "missing_key") {
      return errorResponse("ANTHROPIC_API_KEY nie je nastavený", 503);
    }
    const message = err instanceof Error ? err.message : "Generovanie z fotiek zlyhalo.";
    return errorResponse(message, 502);
  }
}
