/**
 * Stage 0 / PR-S0.5 — read-only keyword sync (mock-first).
 *
 * Google Ads is queried via `GoogleAdsClient.search` only. Persistence is an
 * injected store: schema on main has no keywords table, so tests prove
 * idempotency without inventing DDL.
 */

import type { GoogleAdsClient } from "../google-ads-client";

export const ACQUISITION_PROVIDER_GOOGLE = "GOOGLE" as const;

export const KEYWORD_GAQL = [
  "SELECT",
  "  ad_group_criterion.criterion_id,",
  "  ad_group_criterion.keyword.text,",
  "  ad_group_criterion.keyword.match_type,",
  "  ad_group_criterion.status,",
  "  campaign.id,",
  "  ad_group.id",
  "FROM keyword_view",
].join("\n");

export type AcquisitionProvider = typeof ACQUISITION_PROVIDER_GOOGLE;

export type GoogleAdsSearchClient = Pick<GoogleAdsClient, "search">;

export type KeywordRecord = {
  provider: AcquisitionProvider;
  provider_keyword_id: string | null;
  provider_campaign_id: string;
  provider_ad_group_id: string;
  text: string;
  match_type: string | null;
  status: string | null;
};

export type KeywordStore = {
  getByKey(key: string): KeywordRecord | undefined;
  put(key: string, row: KeywordRecord): void;
  list(): KeywordRecord[];
};

export type SyncKeywordsResult = {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
};

/**
 * Identity: (provider, provider_keyword_id) when the criterion id exists,
 * otherwise (provider, campaign, ad group, keyword text).
 */
export function keywordUpsertKey(row: KeywordRecord): string {
  if (row.provider_keyword_id) {
    return `${row.provider}|keyword|${row.provider_keyword_id}`;
  }
  return `${row.provider}|criterion|${row.provider_campaign_id}|${row.provider_ad_group_id}|${row.text}`;
}

export function extractSearchResults(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];
  const results = record.results ?? record.Results;
  return Array.isArray(results) ? results : [];
}

export function normalizeKeywordRow(raw: unknown): KeywordRecord | null {
  const row = asRecord(raw);
  if (!row) return null;

  const criterion = asRecord(
    pick(row, "adGroupCriterion", "ad_group_criterion"),
  );
  const keyword = asRecord(pick(criterion, "keyword") ?? pick(row, "keyword"));
  const campaign = asRecord(pick(row, "campaign"));
  const adGroup = asRecord(pick(row, "adGroup", "ad_group"));

  const providerKeywordId = asString(
    pick(criterion, "criterionId", "criterion_id") ??
      pick(row, "criterionId", "criterion_id"),
  );
  const providerCampaignId = asString(
    pick(campaign, "id") ?? pick(row, "campaignId", "campaign_id"),
  );
  const providerAdGroupId = asString(
    pick(adGroup, "id") ?? pick(row, "adGroupId", "ad_group_id"),
  );
  const text = asString(
    pick(keyword, "text") ?? pick(row, "text", "keywordText", "keyword_text"),
  );

  if (!providerCampaignId || !providerAdGroupId || !text) {
    return null;
  }

  return {
    provider: ACQUISITION_PROVIDER_GOOGLE,
    provider_keyword_id: providerKeywordId,
    provider_campaign_id: providerCampaignId,
    provider_ad_group_id: providerAdGroupId,
    text,
    match_type: asString(
      pick(keyword, "matchType", "match_type") ??
        pick(row, "matchType", "match_type"),
    ),
    status: asString(pick(criterion, "status") ?? pick(row, "status")),
  };
}

export async function syncKeywords(options: {
  client: GoogleAdsSearchClient;
  store: KeywordStore;
  query?: string;
}): Promise<SyncKeywordsResult> {
  const payload = await options.client.search(options.query ?? KEYWORD_GAQL);
  const results = extractSearchResults(payload);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const raw of results) {
    const normalized = normalizeKeywordRow(raw);
    if (!normalized) {
      skipped += 1;
      continue;
    }

    const key = keywordUpsertKey(normalized);
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
