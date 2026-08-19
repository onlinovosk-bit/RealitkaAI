export const SYNC_TABLES = {
  adGroups: "acquisition_ad_groups",
  keywords: "acquisition_keywords",
  searchTerms: "acquisition_search_terms",
  metrics: "acquisition_metrics",
} as const;

export const SYNC_CONFLICT = {
  adGroups: "provider,provider_ad_group_id",
  keywords: "provider,provider_keyword_id",
  searchTerms: "provider,provider_search_term_id",
  metrics: "provider,provider_metric_id",
} as const;

export type PersistProvider = "GOOGLE" | "META" | "MICROSOFT";

export type PersistTenant = {
  agency_id: string;
  acquisition_account_id: string;
  provider: PersistProvider;
  last_synced_at?: string | null;
};

export type AdGroupPersistRow = PersistTenant & {
  provider_ad_group_id: string;
  provider_campaign_id?: string | null;
  name?: string | null;
  status?: string | null;
};

export type KeywordPersistRow = PersistTenant & {
  provider_keyword_id?: string | null;
  provider_campaign_id: string;
  provider_ad_group_id: string;
  keyword_text: string;
  match_type?: string | null;
  status?: string | null;
};

export type SearchTermPersistRow = PersistTenant & {
  search_term: string;
  provider_campaign_id: string;
  metric_date: string;
  impressions?: number;
  clicks?: number;
  cost_micros?: number;
};

export type MetricPersistRow = PersistTenant & {
  entity_type: "campaign" | "ad_group";
  provider_entity_id: string;
  metric_date: string;
  impressions?: number;
  clicks?: number;
  cost_micros?: number;
  conversions?: number;
};

export type PersistUpsertResult =
  | { ok: true; written: false; reason: "flag_off" }
  | { ok: true; written: true; table: string }
  | { ok: false; written: false; error: string };

export type PersistQuery = {
  upsert: (
    row: Record<string, unknown>,
    opts: { onConflict: string },
  ) => Promise<{ data?: unknown; error: { message: string } | null }>;
};

export type PersistSupabase = {
  from: (table: string) => PersistQuery;
};