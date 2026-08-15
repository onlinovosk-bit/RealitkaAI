/**
 * Stage 0 / PR-S0.5 — read-only search-term impression sync (mock-first).
 *
 * Persistence is an injected store (no search_terms table on main). Upsert key:
 * (provider, search_term, campaign_id, date). Search is read-only GAQL.
 */

import type { GoogleAdsClient } from "../google-ads-client";

export const ACQUISITION_PROVIDER_GOOGLE = "GOOGLE" as const;

export const SEARCH_TERM_GAQL = [
  "SELECT",
  "  search_term_view.search_term,",
  "  campaign.id,",
  "  segments.date,",
  "  metrics.impressions,",
  "  metrics.clicks,",
  "  metrics.cost_micros",
  "FROM search_term_view",
].join("\n");

export type AcquisitionProvider = typeof ACQUISITION_PROVIDER_GOOGLE;

export type GoogleAdsSearchClient = Pick<GoogleAdsClient, "search">;

export type SearchTermRecord = {
  provider: AcquisitionProvider;
  search_term: string;
  campaign_id: string;
  date: string;
  impressions: number;
  clicks: number;
  cost_micros: number;
};

export type SearchTermStore = {
  getByKey(key: string): SearchTermRecord | undefined;
  put(key: string, row: SearchTermRecord): void;
  list(): SearchTermRecord[];
};

export type SyncSearchTermsResult = {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
};

export function searchTermUpsertKey(row: SearchTermRecord): string {
  return `${row.provider}|${row.search_term}|${row.campaign_id}|${row.date}`;
}

export function extractSearchResults(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];
  const results = record.results ?? record.Results;
  return Array.isArray(results) ? results : [];
}

export function normalizeSearchTermRow(raw: unknown): SearchTermRecord | null {
  const row = asRecord(raw);
  if (!row) return null;

  const view = asRecord(pick(row, "searchTermView", "search_term_view"));
  const campaign = asRecord(pick(row, "campaign"));
  const segments = asRecord(pick(row, "segments"));
  const metrics = asRecord(pick(row, "metrics"));

  const searchTerm = asString(
    pick(view, "searchTerm", "search_term") ??
      pick(row, "searchTerm", "search_term"),
  );
  const campaignId = asString(
    pick(campaign, "id") ?? pick(row, "campaignId", "campaign_id"),
  );
  const date = asString(pick(segments, "date") ?? pick(row, "date"));

  if (!searchTerm || !campaignId || !date) {
    return null;
  }

  return {
    provider: ACQUISITION_PROVIDER_GOOGLE,
    search_term: searchTerm,
    campaign_id: campaignId,
    date,
    impressions: asNumber(pick(metrics, "impressions") ?? pick(row, "impressions")),
    clicks: asNumber(pick(metrics, "clicks") ?? pick(row, "clicks")),
    cost_micros: asNumber(
      pick(metrics, "costMicros", "cost_micros") ??
        pick(row, "costMicros", "cost_micros"),
    ),
  };
}

export async function syncSearchTerms(options: {
  client: GoogleAdsSearchClient;
  store: SearchTermStore;
  query?: string;
}): Promise<SyncSearchTermsResult> {
  const payload = await options.client.search(options.query ?? SEARCH_TERM_GAQL);
  const results = extractSearchResults(payload);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const raw of results) {
    const normalized = normalizeSearchTermRow(raw);
    if (!normalized) {
      skipped += 1;
      continue;
    }

    const key = searchTermUpsertKey(normalized);
    const existing = options.store.getByKey(key);
    if (existing) {
      options.store.put(key, { ...existing, ...normalized });
      updated += 1;
    } else {
      options.store.put(key, normalized);
      inserted += 1;
    }
  }

  return { fetched: results.length, inserted, updated, skipped };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pick(
  record: Record<string, unknown> | null | undefined,
  ...keys: string[]
): unknown {
  if (!record) return undefined;
  for (const key of keys) {
    if (record[key] != null) return record[key];
  }
  return undefined;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}
