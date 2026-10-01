/**
 * Stage 0 / PR-S0.7: tenant-scoped read model for the acquisition dashboard.
 *
 * Agency comes from the authenticated profile only. Never from query/body.
 * Secret pointers stay out of this select list.
 */
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const DASHBOARD_ACCOUNT_SELECT =
  "id, agency_id, provider, customer_id, manager_customer_id, status, credential_type, billing_owner, created_at, connected_at, last_sync_at";

export const DASHBOARD_CAMPAIGN_SELECT =
  "id, agency_id, acquisition_account_id, provider, provider_campaign_id, name, status, objective, daily_budget, currency, bidding_strategy, last_synced_at, created_at";

export const DASHBOARD_EVENT_SELECT =
  "id, agency_id, provider, event_type, provider_event_id, lead_id, processing_status, received_at";

export type DashboardAccount = {
  id: string;
  agency_id: string;
  provider: string;
  customer_id: string;
  manager_customer_id: string | null;
  status: string | null;
  credential_type: string | null;
  billing_owner: string | null;
  created_at: string | null;
  connected_at: string | null;
  last_sync_at: string | null;
};

export type DashboardCampaign = {
  id: string;
  agency_id: string;
  acquisition_account_id: string;
  provider: string;
  provider_campaign_id: string;
  name: string | null;
  status: string | null;
  objective: string | null;
  daily_budget: number | null;
  currency: string | null;
  bidding_strategy: string | null;
  last_synced_at: string | null;
  created_at: string | null;
};

export type DashboardEvent = {
  id: string;
  agency_id: string;
  provider: string;
  event_type: string;
  provider_event_id: string | null;
  lead_id: string | null;
  processing_status: string | null;
  received_at: string | null;
};

export type AcquisitionDashboard = {
  accounts: DashboardAccount[];
  campaigns: DashboardCampaign[];
  events: DashboardEvent[];
};

type DashboardQuery = {
  select: (cols: string) => DashboardQuery;
  eq: (col: string, val: string) => DashboardQuery;
  order: (col: string, opts: { ascending: boolean }) => DashboardQuery;
  limit: (n: number) => Promise<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>;
};

export type DashboardSupabase = {
  from: (table: string) => DashboardQuery;
};

function asAccount(row: Record<string, unknown>): DashboardAccount {
  return {
    id: String(row.id ?? ""),
    agency_id: String(row.agency_id ?? ""),
    provider: String(row.provider ?? ""),
    customer_id: String(row.customer_id ?? ""),
    manager_customer_id:
      row.manager_customer_id == null ? null : String(row.manager_customer_id),
    status: row.status == null ? null : String(row.status),
    credential_type: row.credential_type == null ? null : String(row.credential_type),
    billing_owner: row.billing_owner == null ? null : String(row.billing_owner),
    created_at: row.created_at == null ? null : String(row.created_at),
    connected_at: row.connected_at == null ? null : String(row.connected_at),
    last_sync_at: row.last_sync_at == null ? null : String(row.last_sync_at),
  };
}

function asCampaign(row: Record<string, unknown>): DashboardCampaign {
  return {
    id: String(row.id ?? ""),
    agency_id: String(row.agency_id ?? ""),
    acquisition_account_id: String(row.acquisition_account_id ?? ""),
    provider: String(row.provider ?? ""),
    provider_campaign_id: String(row.provider_campaign_id ?? ""),
    name: row.name == null ? null : String(row.name),
    status: row.status == null ? null : String(row.status),
    objective: row.objective == null ? null : String(row.objective),
    daily_budget:
      row.daily_budget == null || row.daily_budget === ""
        ? null
        : Number(row.daily_budget),
    currency: row.currency == null ? null : String(row.currency),
    bidding_strategy:
      row.bidding_strategy == null ? null : String(row.bidding_strategy),
    last_synced_at: row.last_synced_at == null ? null : String(row.last_synced_at),
    created_at: row.created_at == null ? null : String(row.created_at),
  };
}

function asEvent(row: Record<string, unknown>): DashboardEvent {
  return {
    id: String(row.id ?? ""),
    agency_id: String(row.agency_id ?? ""),
    provider: String(row.provider ?? ""),
    event_type: String(row.event_type ?? ""),
    provider_event_id:
      row.provider_event_id == null ? null : String(row.provider_event_id),
    lead_id: row.lead_id == null ? null : String(row.lead_id),
    processing_status:
      row.processing_status == null ? null : String(row.processing_status),
    received_at: row.received_at == null ? null : String(row.received_at),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export type AcquisitionSession = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string } | null;
  agencyId: string | null;
};

export async function loadAcquisitionSession(): Promise<AcquisitionSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, user: null, agencyId: null };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const agencyId = profile?.agency_id ? String(profile.agency_id) : null;
  return { supabase, user: { id: user.id }, agencyId };
}

/** Per-request memo so /acquisition does not repeat layout's auth round-trip when React cache hits. */
export const getCachedAcquisitionSession = cache(loadAcquisitionSession);

export async function loadAcquisitionDashboard(
  supabase: DashboardSupabase,
  agencyId: string,
): Promise<AcquisitionDashboard> {
  const [accountsRes, campaignsRes, eventsRes] = await Promise.all([
    supabase
      .from("acquisition_accounts")
      .select(DASHBOARD_ACCOUNT_SELECT)
      .eq("agency_id", agencyId)
      .eq("provider", "GOOGLE")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("acquisition_campaigns")
      .select(DASHBOARD_CAMPAIGN_SELECT)
      .eq("agency_id", agencyId)
      .eq("provider", "GOOGLE")
      .order("last_synced_at", { ascending: false })
      .limit(100),
    supabase
      .from("acquisition_events")
      .select(DASHBOARD_EVENT_SELECT)
      .eq("agency_id", agencyId)
      .eq("provider", "GOOGLE")
      .order("received_at", { ascending: false })
      .limit(20),
  ]);

  if (accountsRes.error) {
    throw new Error("Failed to list acquisition accounts");
  }

  if (campaignsRes.error) {
    throw new Error("Failed to list acquisition campaigns");
  }

  if (eventsRes.error) {
    throw new Error("Failed to list acquisition events");
  }

  return {
    accounts: (accountsRes.data ?? []).filter(isRecord).map(asAccount),
    campaigns: (campaignsRes.data ?? []).filter(isRecord).map(asCampaign),
    events: (eventsRes.data ?? []).filter(isRecord).map(asEvent),
  };
}
