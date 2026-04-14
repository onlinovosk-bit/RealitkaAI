/**
 * Revolis.AI – Embedding utilities
 * Model: text-embedding-3-small (OpenAI), 1536 dimensions
 * Server-only – nepoužívaj v "use client" komponentoch
 */

import type { Lead } from "@/lib/mock-data";
import type { Property } from "@/lib/properties-store";

const EMBEDDING_MODEL = "text-embedding-3-small" as const;
const EMBEDDING_DIMENSIONS = 1536 as const;

// ─── OpenAI client (lazy init) ────────────────────────────────

function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY nie je nastavený v .env.local");
  return key;
}

// ─── Core: generateEmbedding ──────────────────────────────────

export type EmbeddingResult = {
  embedding: number[];
  totalTokens: number;
};

/**
 * Generuje embedding vektor pre zadaný text cez OpenAI API.
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const input = text.trim().slice(0, 8000); // max ~8k znakov pre bezpečnosť
  if (!input) {
    return {
      embedding: new Array(EMBEDDING_DIMENSIONS).fill(0) as number[],
      totalTokens: 0,
    };
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getOpenAIKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI Embeddings API error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
    usage?: { total_tokens?: number };
  };

  const embedding = data.data[0]?.embedding;
  if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error("Neplatná odpoveď z OpenAI Embeddings API");
  }

  return {
    embedding,
    totalTokens: data.usage?.total_tokens ?? 0,
  };
}

// ─── Text builders ────────────────────────────────────────────

/**
 * Vytvorí embedding text pre príležitosť (lead).
 * Konkatenácia kľúčových polí pre sémantické vyhľadávanie.
 */
export function buildLeadEmbeddingText(lead: Pick<Lead,
  "name" | "location" | "budget" | "propertyType" | "rooms" | "note" | "status" | "source"
>): string {
  return [
    lead.name,
    lead.location,
    lead.budget,
    lead.propertyType,
    lead.rooms,
    lead.status,
    lead.source,
    lead.note,
  ]
    .filter(Boolean)
    .join(" | ");
}

/**
 * Vytvorí embedding text pre nehnuteľnosť (property).
 */
export function buildPropertyEmbeddingText(property: Pick<Property,
  "title" | "location" | "type" | "rooms" | "description" | "status" | "features"
> & { price?: number }): string {
  return [
    property.title,
    property.location,
    property.type,
    property.rooms,
    property.status,
    property.price != null ? `${property.price} EUR` : null,
    property.features?.join(", "),
    property.description,
  ]
    .filter(Boolean)
    .join(" | ");
}

// ─── Konštanty pre externé použitie ──────────────────────────

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
