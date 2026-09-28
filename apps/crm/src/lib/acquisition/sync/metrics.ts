/**
 * Stage 0 / PR-S0.5 — read-only campaign / ad-group metrics snapshot (mock-first).
 *
 * Persistence is an injected store (no metrics table on main). Upsert key:
 * (entity_type, provider_id, date). Search is read-only GAQL — no mutations.
 */

import type { GoogleAdsClient } from "../google-ads-client";

export const ACQUISITION_PROVIDER_GOOGLE = "GOOGLE" as const;

export const CAMPAIGN_METRICS_GAQL = [
  "SELECT",
  "  campaign.id,",
  "  segments.date,",
  "  metrics.impressions,",
  "  metrics.clicks,",
  "  metrics.cost_micros,",
  "  metrics.conversions",
  "FROM campaign",
  "WHERE segments.date DURING LAST_7_DAYS",
].join("\n");

export const AD_GROUP_METRICS_GAQL = [
  "SELECT",
  "  ad_group.id,",
  "  segments.date,",
  "  metrics.impressions,",
  "  metrics.clicks,",
  "  metrics.cost_micros,",
  "  metrics.conversions",
  "FROM ad_group",
  "WHERE segments.date DURING LAST_7_DAYS",
].join("\n");

export type AcquisitionProvider = typeof ACQUISITION_PROVIDER_GOOGLE;

export type MetricsEntityType = "campaign" | "ad_group";

export type GoogleAdsSearchClient = Pick<GoogleAdsClient, "search">;

export type MetricsRecord = {
  provider: AcquisitionProvider;
  entity_type: MetricsEntityType;
  provider_id: string;
  date: string;
  impressions: number;
  clicks: number;
  cost_micros: number;
  conversions: number;
};

export type MetricsStore = {
  getByKey(key: string): MetricsRecord | undefined;
  put(key: string, row: MetricsRecord): void;
  list(): MetricsRecord[];
};

export type SyncMetricsResult = {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
};

export function metricsUpsertKey(row: MetricsRecord): string {
  return `${row.entity_type}|${row.provider_id}|${row.date}`;
}

export function extractSearchResults(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];
  const results = record.results ?? record.Results;
  return Array.isArray(results) ? results : [];
}

export function normalizeMetricsRow(
  raw: unknown,
  entityType: MetricsEntityType,
): MetricsRecord | null {
  const row = asRecord(raw);
  if (!row) return null;

  const entity = asRecord(
    entityType === "campaign"
      ? pick(row, "campaign")
      : pick(row, "adGroup", "ad_group"),
  );
  const segments = asRecord(pick(row, "segments"));
  const metrics = asRecord(pick(row, "metrics"));

  const providerId = asString(
    pick(entity, "id") ??
      (entityType === "campaign"
        ? pick(row, "campaignId", "campaign_id", "provider_id")
        : pick(row, "adGroupId", "ad_group_id", "provider_id")),
  );
  const date = asString(pick(segments, "date") ?? pick(row, "date"));

  if (!providerId || !date) {
    return null;
  }

  return {
    provider: ACQUISITION_PROVIDER_GOOGLE,
    entity_type: entityType,
    provider_id: providerId,
    date,
    impressions: asNumber(pick(metrics, "impressions") ?? pick(row, "impressions")),
    clicks: asNumber(pick(metrics, "clicks") ?? pick(row, "clicks")),
    cost_micros: asNumber(
      pick(metrics, "costMicros", "cost_micros") ??
        pick(row, "costMicros", "cost_micros"),
    ),
    conversions: asNumber(
      pick(metrics, "conversions") ?? pick(row, "conversions"),
    ),
  };
}

export async function syncMetrics(options: {
  client: GoogleAdsSearchClient;
  store: MetricsStore;
  campaignQuery?: string;
  adGroupQuery?: string;
}): Promise<SyncMetricsResult> {
  const campaignPayload = await options.client.search(
    options.campaignQuery ?? CAMPAIGN_METRICS_GAQL,
  );
  const adGroupPayload = await options.client.search(
    options.adGroupQuery ?? AD_GROUP_METRICS_GAQL,
  );

  return upsertSnapshots(options.store, [
    { entityType: "campaign", payload: campaignPayload },
    { entityType: "ad_group", payload: adGroupPayload },
  ]);
}

function upsertSnapshots(
  store: MetricsStore,
  batches: Array<{ entityType: MetricsEntityType; payload: unknown }>,
): SyncMetricsResult {
  let fetched = 0;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const batch of batches) {
    const results = extractSearchResults(batch.payload);
    fetched += results.length;

    for (const raw of results) {
      const normalized = normalizeMetricsRow(raw, batch.entityType);
      if (!normalized) {
        skipped += 1;
        continue;
      }

      const key = metricsUpsertKey(normalized);
      const existing = store.getByKey(key);
      if (existing) {
        store.put(key, { ...existing, ...normalized });
        updated += 1;
      } else {
        store.put(key, normalized);
        inserted += 1;
      }
    }
  }

  return { fetched, inserted, updated, skipped };
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
