/**
 * POST /api/search/semantic
 * Body: { query: string; type: "leads" | "properties"; limit?: number }
 *
 * Tok:
 *   1. Generuj embedding pre query (OpenAI)
 *   2. Zavolaj Supabase RPC match_leads / match_properties
 *   3. Načítaj detaily nájdených záznamov
 *   4. Fallback na ILIKE ak embeddingy nie sú dostupné
 */

import { okResponse, errorResponse } from "@/lib/api-response";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";
import { incrementUsageMetric, SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";

const ENTITY_TYPES = ["leads", "properties"] as const;
type EntityType = (typeof ENTITY_TYPES)[number];

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const SIMILARITY_THRESHOLD = 0.3;

// ─── Typy výsledkov ───────────────────────────────────────────

type LeadSearchResult = {
  id: string;
  name: string;
  location: string;
  status: string;
  score: number;
  budget: string;
  similarity: number;
};

type PropertySearchResult = {
  id: string;
  title: string;
  location: string;
  type: string;
  rooms: string;
  price: number;
  status: string;
  similarity: number;
};

type SearchResult = LeadSearchResult | PropertySearchResult;

// ─── Handler ──────────────────────────────────────────────────

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Neplatné JSON telo požiadavky", 400);
  }

  const { query, type, limit: rawLimit } = body as {
    query?: unknown;
    type?: unknown;
    limit?: unknown;
  };

  if (typeof query !== "string" || query.trim().length < 2) {
    return errorResponse("Pole 'query' musí mať aspoň 2 znaky", 400);
  }

  if (!ENTITY_TYPES.includes(type as EntityType)) {
    return errorResponse("Pole 'type' musí byť 'leads' alebo 'properties'", 400);
  }

  const limit = Math.min(
    typeof rawLimit === "number" && rawLimit > 0 ? rawLimit : DEFAULT_LIMIT,
    MAX_LIMIT
  );

  const supabase = await createClient();

  try {
    // ── Pokus o semantic search ──────────────────────────────
    const results = await semanticSearch(
      supabase,
      query.trim(),
      type as EntityType,
      limit
    );
    return okResponse({ results, mode: "semantic", query });
  } catch (embeddingError) {
    // ── Fallback: ILIKE textové vyhľadávanie ─────────────────
    console.warn("[semantic-search] Embedding zlyhalo, fallback na ILIKE:", embeddingError);
    try {
      const results = await ilikeFallback(supabase, query.trim(), type as EntityType, limit);
      return okResponse({ results, mode: "fallback", query });
    } catch (fallbackError) {
      console.error("[semantic-search] ILIKE fallback tiež zlyhal:", fallbackError);
      return errorResponse("Vyhľadávanie zlyhalo", 500);
    }
  }
}

// ─── Semantic search cez pgvector RPC ────────────────────────

async function semanticSearch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: string,
  type: EntityType,
  limit: number
): Promise<SearchResult[]> {
  const { embedding: queryEmbedding, totalTokens } = await generateEmbedding(query);

  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;
  const agencyId = profile?.agency_id ?? SYSTEM_USAGE_AGENCY_ID;
  await incrementUsageMetric({
    agencyId,
    metric: "embedding_tokens",
    delta: Math.max(1, totalTokens || 1),
  });

  const rpcName = type === "leads" ? "match_leads" : "match_properties";
  const { data: matches, error: rpcError } = await supabase.rpc(rpcName, {
    query_embedding: queryEmbedding,
    match_threshold: SIMILARITY_THRESHOLD,
    match_count: limit,
  }) as { data: Array<{ id: string; similarity: number }> | null; error: unknown };

  if (rpcError) throw rpcError;
  if (!matches || matches.length === 0) return [];

  const ids = matches.map((m) => m.id);
  const similarityMap = new Map(matches.map((m) => [m.id, m.similarity]));

  return type === "leads"
    ? fetchLeadDetails(supabase, ids, similarityMap)
    : fetchPropertyDetails(supabase, ids, similarityMap);
}

// ─── ILIKE fallback ───────────────────────────────────────────

async function ilikeFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: string,
  type: EntityType,
  limit: number
): Promise<SearchResult[]> {
  const pattern = `%${query}%`;

  if (type === "leads") {
    const { data, error } = await supabase
      .from("leads")
      .select("id, name, location, status, score, budget")
      .or(`name.ilike.${pattern},location.ilike.${pattern},budget.ilike.${pattern},note.ilike.${pattern}`)
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map((row) => ({ ...row, similarity: 0 }));
  } else {
    const { data, error } = await supabase
      .from("properties")
      .select("id, title, location, type, rooms, price, status")
      .or(`title.ilike.${pattern},location.ilike.${pattern},description.ilike.${pattern}`)
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map((row) => ({ ...row, similarity: 0 }));
  }
}

// ─── Detail loaders ───────────────────────────────────────────

async function fetchLeadDetails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
  similarityMap: Map<string, number>
): Promise<LeadSearchResult[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("id, name, location, status, score, budget")
    .in("id", ids);

  if (error) throw error;

  return (data ?? [])
    .map((row) => ({
      id: row.id as string,
      name: row.name as string,
      location: row.location as string,
      status: row.status as string,
      score: (row.score as number) ?? 0,
      budget: row.budget as string,
      similarity: similarityMap.get(row.id as string) ?? 0,
    }))
    .sort((a, b) => b.similarity - a.similarity);
}

async function fetchPropertyDetails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
  similarityMap: Map<string, number>
): Promise<PropertySearchResult[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("id, title, location, type, rooms, price, status")
    .in("id", ids);

  if (error) throw error;

  return (data ?? [])
    .map((row) => ({
      id: row.id as string,
      title: row.title as string,
      location: row.location as string,
      type: row.type as string,
      rooms: row.rooms as string,
      price: (row.price as number) ?? 0,
      status: row.status as string,
      similarity: similarityMap.get(row.id as string) ?? 0,
    }))
    .sort((a, b) => b.similarity - a.similarity);
}
