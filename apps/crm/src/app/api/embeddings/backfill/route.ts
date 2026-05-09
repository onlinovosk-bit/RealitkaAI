/**
 * POST /api/embeddings/backfill
 * Body: { entityType: "leads" | "properties"; batchSize?: number }
 *
 * Zaindexuje všetky záznamy ktoré ešte nemajú embedding.
 * Spúšťa sa raz manuálne po nasadení pgvector migrácie.
 *
 * Rate-limit: 1 req / 200ms medzi volaniami OpenAI (text-embedding-3-small
 * má limit 3000 RPM na free tier → ~50 req/s → 200ms medzera je bezpečná).
 */

import { createAdminClient } from "@/lib/supabase/server";
import { okResponse, errorResponse } from "@/lib/api-response";
import {
  generateEmbedding,
  buildLeadEmbeddingText,
  buildPropertyEmbeddingText,
} from "@/lib/embeddings";
import { incrementUsageMetric, SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";

const ENTITY_TYPES = ["leads", "properties"] as const;
type EntityType = (typeof ENTITY_TYPES)[number];

const DEFAULT_BATCH = 50;
const MAX_BATCH = 200;
const RATE_LIMIT_MS = 200; // ms medzi OpenAI volaniami

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return errorResponse("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Neplatné JSON telo požiadavky", 400);
  }

  const { entityType, batchSize: rawBatch } = body as {
    entityType?: unknown;
    batchSize?: unknown;
  };

  if (!ENTITY_TYPES.includes(entityType as EntityType)) {
    return errorResponse("Pole 'entityType' musí byť 'leads' alebo 'properties'", 400);
  }

  const batchSize = Math.min(
    typeof rawBatch === "number" && rawBatch > 0 ? rawBatch : DEFAULT_BATCH,
    MAX_BATCH
  );

  const supabase = createAdminClient();

  try {
    const result =
      entityType === "leads"
        ? await backfillLeads(supabase, batchSize)
        : await backfillProperties(supabase, batchSize);

    return okResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Neznáma chyba";
    console.error(`[embeddings/backfill] ${entityType}:`, message);
    return errorResponse(`Backfill zlyhal: ${message}`, 500);
  }
}

// ─── Lead backfill ────────────────────────────────────────────

async function backfillLeads(
  supabase: ReturnType<typeof createAdminClient>,
  batchSize: number
) {
  const { data: rows, error } = await supabase
    .from("leads")
    .select(
      "id, name, location, budget, property_type, rooms, note, status, source, agency_id"
    )
    .is("embedding", null)
    .limit(batchSize);

  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) return { indexed: 0, skipped: 0, total: 0, done: true };

  let indexed = 0;
  let skipped = 0;

  for (const row of rows) {
    try {
      const text = buildLeadEmbeddingText({
        name: row.name ?? "",
        location: row.location ?? "",
        budget: row.budget ?? "",
        propertyType: row.property_type ?? "",
        rooms: row.rooms ?? "",
        note: row.note ?? "",
        status: row.status ?? "",
        source: row.source ?? "",
      });

      const { embedding, totalTokens } = await generateEmbedding(text);

      const { error: updateError } = await supabase
        .from("leads")
        .update({ embedding })
        .eq("id", row.id);

      if (updateError) {
        console.warn(`[backfill] lead ${row.id} update zlyhalo:`, updateError.message);
        skipped++;
      } else {
        indexed++;
        await incrementUsageMetric({
          agencyId: row.agency_id ?? SYSTEM_USAGE_AGENCY_ID,
          metric: "embedding_tokens",
          delta: Math.max(1, totalTokens || 1),
        });
      }

      await sleep(RATE_LIMIT_MS);
    } catch (err) {
      console.warn(`[backfill] lead ${row.id} embedding zlyhalo:`, err);
      skipped++;
    }
  }

  // Zisti koľko zostáva bez embeddingu
  const { count: remaining } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .is("embedding", null);

  return {
    indexed,
    skipped,
    remaining: remaining ?? 0,
    done: (remaining ?? 0) === 0,
  };
}

// ─── Property backfill ────────────────────────────────────────

async function backfillProperties(
  supabase: ReturnType<typeof createAdminClient>,
  batchSize: number
) {
  const { data: rows, error } = await supabase
    .from("properties")
    .select(
      "id, title, location, type, rooms, description, status, features, price, agency_id"
    )
    .is("embedding", null)
    .limit(batchSize);

  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) return { indexed: 0, skipped: 0, remaining: 0, done: true };

  let indexed = 0;
  let skipped = 0;

  for (const row of rows) {
    try {
      const text = buildPropertyEmbeddingText({
        title: row.title ?? "",
        location: row.location ?? "",
        type: row.type ?? "",
        rooms: row.rooms ?? "",
        description: row.description ?? "",
        status: row.status ?? "",
        features: Array.isArray(row.features) ? row.features : [],
        price: row.price ?? undefined,
      });

      const { embedding, totalTokens } = await generateEmbedding(text);

      const { error: updateError } = await supabase
        .from("properties")
        .update({ embedding })
        .eq("id", row.id);

      if (updateError) {
        console.warn(`[backfill] property ${row.id} update zlyhalo:`, updateError.message);
        skipped++;
      } else {
        indexed++;
        await incrementUsageMetric({
          agencyId: row.agency_id ?? SYSTEM_USAGE_AGENCY_ID,
          metric: "embedding_tokens",
          delta: Math.max(1, totalTokens || 1),
        });
      }

      await sleep(RATE_LIMIT_MS);
    } catch (err) {
      console.warn(`[backfill] property ${row.id} embedding zlyhalo:`, err);
      skipped++;
    }
  }

  const { count: remaining } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .is("embedding", null);

  return {
    indexed,
    skipped,
    remaining: remaining ?? 0,
    done: (remaining ?? 0) === 0,
  };
}
