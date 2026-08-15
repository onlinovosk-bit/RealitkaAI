/**
 * Stage 0 / PR-S0.4: read-only Google Ads campaign sync.
 *
 * GAQL via GoogleAdsClient.search -> map rows -> upsert into an injected store.
 * Persistence key: UNIQUE (provider, provider_campaign_id) on acquisition_campaigns.
 * No campaign mutations, no budget writes, no live Google calls in CI.
 */

import type { GoogleAdsClient } from "../google-ads-client";

export const ACQUISITION_PROVIDER_GOOGLE = "GOOGLE" as const;

/** Read-only campaign snapshot. Stage 0 never mutates Google Ads. */
export const CAMPAIGN_SYNC_GAQL = [
  "SELECT",
  "  campaign.id,",
  "  campaign.name,",
  "  campaign.status,",
  "  campaign.advertising_channel_type,",
  "  campaign.bidding_strategy_type,",
  "  campaign_budget.amount_micros,",
  "  customer.currency_code",
  "FROM campaign",
].join("\n");

export type AcquisitionCampaignRecord = {
  agency_id: string;
  acquisition_account_id: string;
  provider: typeof ACQUISITION_PROVIDER_GOOGLE;
  provider_campaign_id: string;
  name: string | null;
  status: string | null;
  objective: string | null;
  daily_budget: number | null;
  currency: string | null;
  bidding_strategy: string | null;
  last_synced_at: string;
};

/**
 * Injected persistence port.
 *
 * In-memory in tests. Optional supabase-shaped adapter:
 *   from("acquisition_campaigns").upsert(row, { onConflict: "provider,provider_campaign_id" })
 */
export type CampaignStore = {
  upsert(
    row: AcquisitionCampaignRecord,
  ): Promise<AcquisitionCampaignRecord> | AcquisitionCampaignRecord;
};

export type CampaignSyncSearchClient = Pick<GoogleAdsClient, "search">;

export type SyncGoogleCampaignsInput = {
  client: CampaignSyncSearchClient;
  store: CampaignStore;
  agencyId: string;
  acquisitionAccountId: string;
  now?: () => Date;
};

export type SyncGoogleCampaignsResult = {
  fetched: number;
  upserted: number;
  skipped: number;
};

export async function syncGoogleCampaigns(
  input: SyncGoogleCampaignsInput,
): Promise<SyncGoogleCampaignsResult> {
  const { client, store, agencyId, acquisitionAccountId } = input;
  const now = input.now ?? (() => new Date());

  const body = await client.search(CAMPAIGN_SYNC_GAQL);
  const results = extractSearchResults(body);

  let upserted = 0;
  let skipped = 0;

  for (const result of results) {
    const mapped = mapGoogleCampaignResult(result, {
      agencyId,
      acquisitionAccountId,
      lastSyncedAt: now().toISOString(),
    });
    if (!mapped) {
      skipped += 1;
      continue;
    }
    await store.upsert(mapped);
    upserted += 1;
  }

  return { fetched: results.length, upserted, skipped };
}

export function mapGoogleCampaignResult(
  result: unknown,
  ctx: {
    agencyId: string;
    acquisitionAccountId: string;
    lastSyncedAt: string;
  },
): AcquisitionCampaignRecord | null {
  if (!isRecord(result)) {
    return null;
  }

  const campaign = asRecord(result.campaign);
  const budget = asRecord(result.campaignBudget) ?? asRecord(result.campaign_budget);
  const customer = asRecord(result.customer);

  const providerCampaignId = firstNonEmpty(
    stringifyId(campaign?.id),
    idFromResourceName(
      stringifyId(campaign?.resourceName) ?? stringifyId(campaign?.resource_name),
      "campaigns",
    ),
  );
  if (!providerCampaignId) {
    return null;
  }

  return {
    agency_id: ctx.agencyId,
    acquisition_account_id: ctx.acquisitionAccountId,
    provider: ACQUISITION_PROVIDER_GOOGLE,
    provider_campaign_id: providerCampaignId,
    name: asNullableString(campaign?.name),
    status: asNullableString(campaign?.status),
    objective: asNullableString(
      campaign?.advertisingChannelType ?? campaign?.advertising_channel_type,
    ),
    daily_budget: microsToUnits(budget?.amountMicros ?? budget?.amount_micros),
    currency: asNullableString(customer?.currencyCode ?? customer?.currency_code),
    bidding_strategy: asNullableString(
      campaign?.biddingStrategyType ?? campaign?.bidding_strategy_type,
    ),
    last_synced_at: ctx.lastSyncedAt,
  };
}

export function extractSearchResults(body: unknown): unknown[] {
  if (Array.isArray(body)) {
    return body;
  }
  if (isRecord(body) && Array.isArray(body.results)) {
    return body.results;
  }
  return [];
}

function microsToUnits(value: unknown): number | null {
  if (value == null || value === "") {
    return null;
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  return n / 1_000_000;
}

function stringifyId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  return null;
}

function idFromResourceName(resourceName: string | null, segment: string): string | null {
  if (!resourceName) {
    return null;
  }
  const parts = resourceName.split("/");
  const idx = parts.lastIndexOf(segment);
  if (idx >= 0 && parts[idx + 1]) {
    return parts[idx + 1];
  }
  return null;
}

function firstNonEmpty(...values: Array<string | null>): string | null {
  for (const value of values) {
    if (value) {
      return value;
    }
  }
  return null;
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}
