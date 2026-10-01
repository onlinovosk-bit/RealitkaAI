import type { SupabaseClient } from "@supabase/supabase-js";
import type { StealthProspect } from "@/types/acquisition-hub";
import { resolveTenantSupabase } from "@/lib/supabase/resolve-client";

export type StealthProspectStatus =
  | "identified"
  | "outreached"
  | "converted"
  | "cancelled";

export type StealthProspectRow = {
  id: string;
  agency_id: string;
  profile_id: string | null;
  address: string;
  source: string;
  score: number;
  status: StealthProspectStatus;
  outreach_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type StealthProspectUpsertInput = {
  address: string;
  source: string;
  score: number;
  status?: StealthProspectStatus;
  metadata?: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function mapStealthProspectRow(row: StealthProspectRow): StealthProspect {
  const meta = asRecord(row.metadata);
  const originalPrice = toNumber(meta.originalPrice ?? meta.original_price);
  const currentPrice = toNumber(meta.currentPrice ?? meta.current_price);
  const explicitDrop = meta.priceDropPercent ?? meta.price_drop_percent;
  const priceDropPercent =
    explicitDrop !== undefined
      ? toNumber(explicitDrop)
      : originalPrice > 0
        ? Math.round(((originalPrice - currentPrice) / originalPrice) * 1000) / 10
        : 0;

  const platformRaw = String(meta.platform ?? row.source ?? "other");
  const platform = (
    ["bazos", "nehnutelnosti", "reality", "facebook", "other"].includes(platformRaw)
      ? platformRaw
      : "other"
  ) as StealthProspect["platform"];

  const uiStatus = row.status === "cancelled" ? "identified" : row.status;

  return {
    id: row.id,
    address: row.address,
    platform,
    daysListed: toNumber(meta.daysListed ?? meta.days_listed),
    originalPrice,
    currentPrice,
    priceDropPercent,
    score: row.score,
    status: uiStatus as StealthProspect["status"],
    aiOutreach: row.outreach_message ?? undefined,
  };
}

export async function listStealthProspects(
  agencyId: string,
  options: { minScore?: number; limit?: number } = {},
  scopedSupabase?: SupabaseClient | null,
): Promise<StealthProspect[]> {
  const supabase = await resolveTenantSupabase(scopedSupabase);
  if (!supabase) {
    throw new Error("Supabase klient nie je dostupný.");
  }

  const minScore = options.minScore ?? 0;
  const limit = options.limit ?? 20;

  const { data, error } = await supabase
    .from("stealth_recruiter_prospects")
    .select("*")
    .eq("agency_id", agencyId)
    .gte("score", minScore)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapStealthProspectRow(row as StealthProspectRow));
}

export async function upsertStealthProspects(
  agencyId: string,
  profileId: string | null,
  inputs: StealthProspectUpsertInput[],
  scopedSupabase?: SupabaseClient | null,
): Promise<StealthProspect[]> {
  const supabase = await resolveTenantSupabase(scopedSupabase);
  if (!supabase) {
    throw new Error("Supabase klient nie je dostupný.");
  }

  if (inputs.length === 0) {
    return [];
  }

  const now = new Date().toISOString();
  const rows = inputs.map((input) => ({
    agency_id: agencyId,
    profile_id: profileId,
    address: input.address,
    source: input.source,
    score: input.score,
    status: input.status ?? "identified",
    metadata: input.metadata ?? {},
    updated_at: now,
  }));

  const { data, error } = await supabase
    .from("stealth_recruiter_prospects")
    .upsert(rows, { onConflict: "agency_id,address" })
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapStealthProspectRow(row as StealthProspectRow));
}

export async function updateStealthProspectStatus(
  agencyId: string,
  prospectId: string,
  patch: {
    status?: StealthProspectStatus;
    outreachMessage?: string | null;
  },
  scopedSupabase?: SupabaseClient | null,
): Promise<StealthProspect> {
  const supabase = await resolveTenantSupabase(scopedSupabase);
  if (!supabase) {
    throw new Error("Supabase klient nie je dostupný.");
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.status) payload.status = patch.status;
  if (patch.outreachMessage !== undefined) {
    payload.outreach_message = patch.outreachMessage;
  }

  const { data, error } = await supabase
    .from("stealth_recruiter_prospects")
    .update(payload)
    .eq("id", prospectId)
    .eq("agency_id", agencyId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Prospect nebol nájdený.");
  }

  return mapStealthProspectRow(data as StealthProspectRow);
}
