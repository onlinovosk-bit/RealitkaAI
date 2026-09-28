/**
 * Stage 0 / PR-S0.4: read-only Google Ads ad group sync.
 *
 * Persistence table is OUT OF THIS PR (no acquisition_ad_groups migration).
 * Inject a repository/upsert port so tests prove idempotency without a new table.
 * Key: (provider, provider_ad_group_id). Read-only GAQL only - no mutations.
 */

import type { GoogleAdsClient } from "../google-ads-client";

export const ACQUISITION_PROVIDER_GOOGLE = "GOOGLE" as const;

/** Read-only ad group snapshot. Stage 0 never mutates Google Ads. */
export const AD_GROUP_SYNC_GAQL = [
  "SELECT",
  "  ad_group.id,",
  "  ad_group.name,",
  "  ad_group.status,",
  "  ad_group.campaign,",
  "  campaign.id",
  "FROM ad_group",
].join("\n");

export type AcquisitionAdGroupRecord = {
  agency_id: string;
  acquisition_account_id: string;
  provider: typeof ACQUISITION_PROVIDER_GOOGLE;
  provider_ad_group_id: string;
  provider_campaign_id: string | null;
  name: string | null;
  status: string | null;
  last_synced_at: string;
};

/**
 * Injected persistence port. No DB table in this PR - callers supply the store.
 * Idempotent upsert keyed by (provider, provider_ad_group_id).
 */
export type AdGroupStore = {
  upsert(
    row: AcquisitionAdGroupRecord,
  ): Promise<AcquisitionAdGroupRecord> | AcquisitionAdGroupRecord;
};

export type AdGroupSyncSearchClient = Pick<GoogleAdsClient, "search">;

export type SyncGoogleAdGroupsInput = {
  client: AdGroupSyncSearchClient;
  store: AdGroupStore;
  agencyId: string;
  acquisitionAccountId: string;
  now?: () => Date;
};

export type SyncGoogleAdGroupsResult = {
  fetched: number;
  upserted: number;
  skipped: number;
};

export async function syncGoogleAdGroups(
  input: SyncGoogleAdGroupsInput,
): Promise<SyncGoogleAdGroupsResult> {
  const { client, store, agencyId, acquisitionAccountId } = input;
  const now = input.now ?? (() => new Date());

  const body = await client.search(AD_GROUP_SYNC_GAQL);
  const results = extractSearchResults(body);

  let upserted = 0;
  let skipped = 0;

  for (const result of results) {
    const mapped = mapGoogleAdGroupResult(result, {
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

export function mapGoogleAdGroupResult(
  result: unknown,
  ctx: {
    agencyId: string;
    acquisitionAccountId: string;
    lastSyncedAt: string;
  },
): AcquisitionAdGroupRecord | null {
  if (!isRecord(result)) {
    return null;
  }

  const adGroup = asRecord(result.adGroup) ?? asRecord(result.ad_group);
  const campaign = asRecord(result.campaign);

  const providerAdGroupId = firstNonEmpty(
    stringifyId(adGroup?.id),
    idFromResourceName(
      stringifyId(adGroup?.resourceName) ?? stringifyId(adGroup?.resource_name),
      "adGroups",
    ),
    idFromResourceName(
      stringifyId(adGroup?.resourceName) ?? stringifyId(adGroup?.resource_name),
      "ad_groups",
    ),
  );
  if (!providerAdGroupId) {
    return null;
  }

  const campaignResource =
    stringifyId(adGroup?.campaign) ??
    stringifyId(campaign?.resourceName) ??
    stringifyId(campaign?.resource_name);

  const providerCampaignId = firstNonEmpty(
    stringifyId(campaign?.id),
    idFromResourceName(campaignResource, "campaigns"),
  );

  return {
    agency_id: ctx.agencyId,
    acquisition_account_id: ctx.acquisitionAccountId,
    provider: ACQUISITION_PROVIDER_GOOGLE,
    provider_ad_group_id: providerAdGroupId,
    provider_campaign_id: providerCampaignId,
    name: asNullableString(adGroup?.name),
    status: asNullableString(adGroup?.status),
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
