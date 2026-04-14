/**
 * POST /api/embeddings/index
 * Body: { entityType: "lead" | "property"; entityId: string }
 *
 * Generuje embedding pre jeden záznam a uloží ho do Supabase.
 * Volá sa async (fire-and-forget) z createLead / createProperty.
 * Môže sa zavolať aj manuálne pre backfill existujúcich záznamov.
 */

import { okResponse, errorResponse } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import {
  generateEmbedding,
  buildLeadEmbeddingText,
  buildPropertyEmbeddingText,
} from "@/lib/embeddings";
import { incrementUsageMetric, SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";

const ENTITY_TYPES = ["lead", "property"] as const;
type EntityType = (typeof ENTITY_TYPES)[number];

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Neplatné JSON telo požiadavky", 400);
  }

  const { entityType, entityId } = body as {
    entityType?: unknown;
    entityId?: unknown;
  };

  if (!ENTITY_TYPES.includes(entityType as EntityType)) {
    return errorResponse("Pole 'entityType' musí byť 'lead' alebo 'property'", 400);
  }

  if (typeof entityId !== "string" || !entityId) {
    return errorResponse("Pole 'entityId' musí byť neprázdny string (UUID)", 400);
  }

  const supabase = await createClient();

  try {
    if (entityType === "lead") {
      await indexLead(supabase, entityId);
    } else {
      await indexProperty(supabase, entityId);
    }

    return okResponse({ indexed: true, entityType, entityId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Neznáma chyba";
    console.error(`[embeddings/index] ${entityType} ${entityId}:`, message);
    return errorResponse(`Indexovanie zlyhalo: ${message}`, 500);
  }
}

// ─── Lead indexing ────────────────────────────────────────────

async function indexLead(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leadId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("leads")
    .select(
      "name, location, budget, property_type, rooms, note, status, source, agency_id"
    )
    .eq("id", leadId)
    .single();

  if (error || !data) throw new Error(`Lead ${leadId} nenájdený: ${error?.message}`);

  const text = buildLeadEmbeddingText({
    name: data.name ?? "",
    location: data.location ?? "",
    budget: data.budget ?? "",
    propertyType: data.property_type ?? "",
    rooms: data.rooms ?? "",
    note: data.note ?? "",
    status: data.status ?? "",
    source: data.source ?? "",
  });

  const { embedding, totalTokens } = await generateEmbedding(text);

  const { error: updateError } = await supabase
    .from("leads")
    .update({ embedding })
    .eq("id", leadId);

  if (updateError) throw new Error(`Uloženie embeddings pre lead zlyhalo: ${updateError.message}`);

  const agencyId = data.agency_id ?? SYSTEM_USAGE_AGENCY_ID;
  await incrementUsageMetric({
    agencyId,
    metric: "embedding_tokens",
    delta: Math.max(1, totalTokens || 1),
  });
}

// ─── Property indexing ────────────────────────────────────────

async function indexProperty(
  supabase: Awaited<ReturnType<typeof createClient>>,
  propertyId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("properties")
    .select(
      "title, location, type, rooms, description, status, features, price, agency_id"
    )
    .eq("id", propertyId)
    .single();

  if (error || !data) throw new Error(`Property ${propertyId} nenájdená: ${error?.message}`);

  const text = buildPropertyEmbeddingText({
    title: data.title ?? "",
    location: data.location ?? "",
    type: data.type ?? "",
    rooms: data.rooms ?? "",
    description: data.description ?? "",
    status: data.status ?? "",
    features: data.features ?? [],
    price: data.price ?? undefined,
  });

  const { embedding, totalTokens } = await generateEmbedding(text);

  const { error: updateError } = await supabase
    .from("properties")
    .update({ embedding })
    .eq("id", propertyId);

  if (updateError) throw new Error(`Uloženie embeddings pre property zlyhalo: ${updateError.message}`);

  const agencyId = data.agency_id ?? SYSTEM_USAGE_AGENCY_ID;
  await incrementUsageMetric({
    agencyId,
    metric: "embedding_tokens",
    delta: Math.max(1, totalTokens || 1),
  });
}
