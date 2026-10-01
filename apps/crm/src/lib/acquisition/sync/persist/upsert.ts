/**
 * Upsert layer for acquisition sync snapshots.
 *
 * No Google Ads writes. No-op unless ACQUISITION_PERSIST_SYNC=true.
 * Existing sync workers keep injected in-memory stores; they must not
 * import this module until the founder applies the migration and flips
 * the flag. createAcquisitionPersistWriter() returns null while off.
 */
import { isAcquisitionPersistSyncEnabled } from "./flag";
import {
  SYNC_CONFLICT,
  SYNC_TABLES,
  type AdGroupPersistRow,
  type KeywordPersistRow,
  type MetricPersistRow,
  type PersistSupabase,
  type PersistUpsertResult,
  type SearchTermPersistRow,
} from "./types";

type Env = NodeJS.ProcessEnv;

export function keywordProviderId(row: KeywordPersistRow): string {
  const existing = row.provider_keyword_id?.trim();
  if (existing) return existing;
  return `criterion:${row.provider_campaign_id}:${row.provider_ad_group_id}:${row.keyword_text}`;
}

export function searchTermProviderId(row: SearchTermPersistRow): string {
  return `${row.search_term}|${row.provider_campaign_id}|${row.metric_date}`;
}

export function metricProviderId(row: MetricPersistRow): string {
  return `${row.entity_type}|${row.provider_entity_id}|${row.metric_date}`;
}

function flagOff(): PersistUpsertResult {
  return { ok: true, written: false, reason: "flag_off" };
}

async function persistOne(
  client: PersistSupabase,
  table: string,
  onConflict: string,
  row: Record<string, unknown>,
  env: Env,
): Promise<PersistUpsertResult> {
  if (!isAcquisitionPersistSyncEnabled(env)) {
    return flagOff();
  }
  const { error } = await client.from(table).upsert(row, { onConflict });
  if (error) {
    return { ok: false, written: false, error: error.message };
  }
  return { ok: true, written: true, table };
}

function tenantFields(row: {
  agency_id: string;
  acquisition_account_id: string;
  provider: string;
  last_synced_at?: string | null;
}): Record<string, unknown> {
  return {
    agency_id: row.agency_id,
    acquisition_account_id: row.acquisition_account_id,
    provider: row.provider,
    last_synced_at: row.last_synced_at ?? null,
  };
}

export function persistAdGroup(
  client: PersistSupabase,
  row: AdGroupPersistRow,
  env: Env = process.env,
): Promise<PersistUpsertResult> {
  return persistOne(
    client,
    SYNC_TABLES.adGroups,
    SYNC_CONFLICT.adGroups,
    {
      ...tenantFields(row),
      provider_ad_group_id: row.provider_ad_group_id,
      provider_campaign_id: row.provider_campaign_id ?? null,
      name: row.name ?? null,
      status: row.status ?? null,
    },
    env,
  );
}

export function persistKeyword(
  client: PersistSupabase,
  row: KeywordPersistRow,
  env: Env = process.env,
): Promise<PersistUpsertResult> {
  return persistOne(
    client,
    SYNC_TABLES.keywords,
    SYNC_CONFLICT.keywords,
    {
      ...tenantFields(row),
      provider_keyword_id: keywordProviderId(row),
      provider_campaign_id: row.provider_campaign_id,
      provider_ad_group_id: row.provider_ad_group_id,
      keyword_text: row.keyword_text,
      match_type: row.match_type ?? null,
      status: row.status ?? null,
    },
    env,
  );
}

export function persistSearchTerm(
  client: PersistSupabase,
  row: SearchTermPersistRow,
  env: Env = process.env,
): Promise<PersistUpsertResult> {
  return persistOne(
    client,
    SYNC_TABLES.searchTerms,
    SYNC_CONFLICT.searchTerms,
    {
      ...tenantFields(row),
      provider_search_term_id: searchTermProviderId(row),
      search_term: row.search_term,
      provider_campaign_id: row.provider_campaign_id,
      metric_date: row.metric_date,
      impressions: row.impressions ?? 0,
      clicks: row.clicks ?? 0,
      cost_micros: row.cost_micros ?? 0,
    },
    env,
  );
}

export function persistMetric(
  client: PersistSupabase,
  row: MetricPersistRow,
  env: Env = process.env,
): Promise<PersistUpsertResult> {
  return persistOne(
    client,
    SYNC_TABLES.metrics,
    SYNC_CONFLICT.metrics,
    {
      ...tenantFields(row),
      provider_metric_id: metricProviderId(row),
      entity_type: row.entity_type,
      provider_entity_id: row.provider_entity_id,
      metric_date: row.metric_date,
      impressions: row.impressions ?? 0,
      clicks: row.clicks ?? 0,
      cost_micros: row.cost_micros ?? 0,
      conversions: row.conversions ?? 0,
    },
    env,
  );
}

export type AcquisitionPersistWriter = {
  persistAdGroup: (row: AdGroupPersistRow) => Promise<PersistUpsertResult>;
  persistKeyword: (row: KeywordPersistRow) => Promise<PersistUpsertResult>;
  persistSearchTerm: (row: SearchTermPersistRow) => Promise<PersistUpsertResult>;
  persistMetric: (row: MetricPersistRow) => Promise<PersistUpsertResult>;
};

export function createAcquisitionPersistWriter(
  client: PersistSupabase,
  env: Env = process.env,
): AcquisitionPersistWriter | null {
  if (!isAcquisitionPersistSyncEnabled(env)) {
    return null;
  }
  return {
    persistAdGroup: (row) => persistAdGroup(client, row, env),
    persistKeyword: (row) => persistKeyword(client, row, env),
    persistSearchTerm: (row) => persistSearchTerm(client, row, env),
    persistMetric: (row) => persistMetric(client, row, env),
  };
}
