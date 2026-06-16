/**
 * Tenant-scoped tables enumerated from apps/crm/supabase/migrations/.
 * Platform tables (no tenant boundary) are listed separately in PLATFORM_TABLES.
 */

export type TenantScopeKind =
  | "agency_id"
  | "lead_id"
  | "profile_id"
  | "property_id"
  | "user_id"
  | "agency_pk";

export interface TenantTableDef {
  table: string;
  scope: TenantScopeKind;
  /** Column used for cross-tenant filter (defaults per scope kind) */
  scopeColumn?: string;
  pk: string;
  /** service_role-only tables: RLS check only, no cross-tenant CRUD */
  serviceRoleOnly?: boolean;
  /** Maps to conceptual domain in product docs */
  domain?: string;
}

/** Tables that must enforce agency / profile isolation */
export const TENANT_TABLES: TenantTableDef[] = [
  { table: "agencies", scope: "agency_pk", pk: "id", domain: "agencies" },
  { table: "teams", scope: "agency_id", pk: "id", domain: "agencies" },
  { table: "profiles", scope: "agency_id", pk: "id", domain: "agencies" },
  { table: "leads", scope: "agency_id", pk: "id", domain: "leads" },
  { table: "properties", scope: "agency_id", pk: "id", domain: "properties" },
  { table: "activities", scope: "lead_id", pk: "id", domain: "communications" },
  { table: "tasks", scope: "lead_id", pk: "id", domain: "deals" },
  { table: "ai_recommendations", scope: "lead_id", pk: "id", domain: "deals" },
  { table: "lead_property_matches", scope: "lead_id", pk: "id", domain: "properties" },
  { table: "lead_events", scope: "agency_id", pk: "id", domain: "leads" },
  { table: "lead_scores", scope: "agency_id", pk: "id", domain: "leads" },
  { table: "client_dna", scope: "agency_id", pk: "id", domain: "clients" },
  { table: "deal_risk", scope: "agency_id", pk: "id", domain: "deals" },
  { table: "deal_moments", scope: "agency_id", pk: "id", domain: "deals" },
  { table: "ai_actions", scope: "agency_id", pk: "id", domain: "deals" },
  { table: "lead_action_scores", scope: "agency_id", pk: "id", domain: "deals" },
  { table: "lead_closing_windows", scope: "agency_id", pk: "id", domain: "deals" },
  { table: "lead_rescue_runs", scope: "agency_id", pk: "id", domain: "deals" },
  { table: "lead_micro_actions", scope: "agency_id", pk: "id", domain: "deals" },
  { table: "ai_action_audit", scope: "agency_id", pk: "id", domain: "communications" },
  { table: "ai_sourced_deals", scope: "agency_id", pk: "id", domain: "deals" },
  { table: "scheduled_events", scope: "agency_id", pk: "id", domain: "deals" },
  { table: "routine_notifications", scope: "agency_id", pk: "id", domain: "communications" },
  { table: "credit_ledger", scope: "agency_id", pk: "id", domain: "billing" },
  { table: "dashboard_insights_cache", scope: "agency_id", pk: "agency_id", domain: "agencies" },
  { table: "import_jobs", scope: "agency_id", pk: "id", domain: "documents" },
  { table: "import_rows", scope: "agency_id", pk: "id", domain: "documents" },
  { table: "realsoft_import_logs", scope: "agency_id", pk: "id", domain: "documents" },
  { table: "stealth_recruiter_prospects", scope: "agency_id", pk: "id", domain: "prospects" },
  { table: "demand_signals", scope: "profile_id", pk: "id", domain: "leads" },
  { table: "competitor_monitoring", scope: "profile_id", pk: "id", domain: "agencies" },
  {
    table: "competitor_activity_logs",
    scope: "profile_id",
    scopeColumn: "competitor_id",
    pk: "id",
    domain: "agencies",
  },
  { table: "strategic_alerts", scope: "profile_id", pk: "id", domain: "agencies" },
  { table: "morning_brief_settings", scope: "profile_id", pk: "profile_id", domain: "communications" },
  { table: "morning_briefs", scope: "profile_id", pk: "id", domain: "communications" },
  { table: "profile_integrations", scope: "profile_id", pk: "id", domain: "integrations" },
  {
    table: "profile_google_calendar",
    scope: "profile_id",
    pk: "profile_id",
    domain: "integrations",
  },
  { table: "outreach_campaigns", scope: "profile_id", pk: "id", domain: "communications" },
  { table: "outreach_segments", scope: "profile_id", pk: "id", domain: "communications" },
  { table: "outreach_templates", scope: "profile_id", pk: "id", domain: "communications" },
  { table: "events", scope: "profile_id", pk: "id", domain: "communications" },
  { table: "integrity_alerts", scope: "profile_id", pk: "id", domain: "agencies" },
  { table: "bri_score_history", scope: "profile_id", pk: "id", domain: "leads" },
  { table: "bri_config", scope: "profile_id", pk: "profile_id", domain: "leads" },
  {
    table: "lead_conversions",
    scope: "user_id",
    scopeColumn: "broker_id",
    pk: "id",
    domain: "deals",
  },
  {
    table: "broker_performance_stats",
    scope: "user_id",
    scopeColumn: "broker_id",
    pk: "id",
    domain: "agencies",
  },
  { table: "notifications", scope: "user_id", pk: "id", domain: "communications" },
  { table: "push_subscriptions", scope: "user_id", pk: "id", domain: "communications" },
  { table: "watched_parcels", scope: "profile_id", pk: "id", domain: "properties" },
  { table: "property_price_trail", scope: "profile_id", pk: "id", domain: "properties" },
  { table: "seller_motivation", scope: "profile_id", pk: "id", domain: "properties" },
  { table: "price_alerts", scope: "profile_id", pk: "id", domain: "properties" },
  { table: "outreach_logs", scope: "lead_id", pk: "id", domain: "communications" },
  { table: "arbitrage_config", scope: "profile_id", pk: "profile_id", domain: "properties" },
  { table: "arbitrage_matches", scope: "profile_id", pk: "id", domain: "properties" },
  { table: "broker_profiles", scope: "user_id", pk: "id", domain: "agencies" },
  { table: "broker_events", scope: "user_id", pk: "id", domain: "agencies" },
];

/** RLS-enabled but not tenant-scoped (platform / ops) */
export const PLATFORM_TABLES = [
  { table: "demo_prospects", note: "B2B demo ops — no agency_id; service_role crons" },
  { table: "demo_bookings", note: "Calendly pipeline — no agency_id; service_role crons" },
  { table: "migration_cases", note: "Import ops — service_role only policy" },
  { table: "rate_limit_buckets", note: "System rate limiting" },
  { table: "developer_api_key_requests", note: "Public insert onboarding form" },
  { table: "api_keys", note: "B2B API — service_role only" },
  { table: "api_usage_logs", note: "B2B API — service_role only" },
  { table: "bsm_campaign_config", note: "Global campaign config" },
  { table: "bsm_reforma_leads", note: "Public lead capture" },
  { table: "portal_listings", note: "Shared portal inventory" },
  { table: "listing_price_history", note: "Portal-linked history" },
  { table: "kataster_events", note: "Scoped via watched_parcels (tested indirectly)" },
  { table: "realvia_metrics", note: "Cron batch metrics — service_role only; no agency_id" },
] as const;

export function scopeColumnFor(def: TenantTableDef): string {
  if (def.scopeColumn) return def.scopeColumn;
  switch (def.scope) {
    case "agency_pk":
      return "id";
    case "agency_id":
      return "agency_id";
    case "lead_id":
      return "lead_id";
    case "profile_id":
      return "profile_id";
    case "property_id":
      return "property_id";
    case "user_id":
      return "user_id";
    default:
      return "agency_id";
  }
}
