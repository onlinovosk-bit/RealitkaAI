import type { SupabaseClient } from "@supabase/supabase-js";
import { getValuationAgency, type ValuationAgencyConfig } from "@/lib/valuation/agency-config";

export type ValuationTenantBranding = {
  slug: string;
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  calendlyUrl: string | null;
  isSandbox: boolean;
};

export type ValuationPageContext = ValuationTenantBranding & {
  agencyId: string;
  headline: string;
  subhead: string;
  contactPromise: string;
  privacyUrl: string;
};

export type ValuationTenantRecord = {
  agencyId: string;
  isSandbox: boolean;
};

export async function fetchEnabledTenantBranding(
  supabase: SupabaseClient,
  slug: string,
): Promise<ValuationTenantBranding | null> {
  const { data, error } = await supabase.rpc("get_valuation_tenant", {
    requested_slug: slug.trim().toLowerCase(),
  });

  if (error) {
    console.error("[valuation/tenant] get_valuation_tenant failed:", error.message);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    slug: String(row.slug),
    brandName: String(row.brand_name),
    logoUrl: row.logo_url ? String(row.logo_url) : null,
    primaryColor: String(row.primary_color ?? "#6D28D9"),
    calendlyUrl: row.calendly_url ? String(row.calendly_url) : null,
    isSandbox: Boolean(row.is_sandbox),
  };
}

export async function resolveTenantRecord(
  supabase: SupabaseClient,
  slug: string,
): Promise<ValuationTenantRecord | null> {
  const { data, error } = await supabase
    .from("valuation_tenants")
    .select("agency_id, is_sandbox")
    .eq("slug", slug.trim().toLowerCase())
    .eq("enabled", true)
    .maybeSingle();

  if (error) throw error;
  if (!data?.agency_id) return null;

  return {
    agencyId: String(data.agency_id),
    isSandbox: Boolean(data.is_sandbox),
  };
}

/** @deprecated Use resolveTenantRecord — kept for call sites that only need agency id. */
export async function resolveTenantAgencyId(
  supabase: SupabaseClient,
  slug: string,
): Promise<string | null> {
  const record = await resolveTenantRecord(supabase, slug);
  return record?.agencyId ?? null;
}

export function mergeTenantWithAgencyConfig(
  branding: ValuationTenantBranding,
  config: ValuationAgencyConfig | null,
): Omit<ValuationPageContext, "agencyId"> {
  return {
    ...branding,
    headline: config?.headline ?? "Orientačný odhad nehnuteľnosti zadarmo",
    subhead:
      config?.subhead ??
      "Vyplňte údaje o nehnuteľnosti — maklér vás kontaktuje s orientačným odhadom.",
    contactPromise: config?.contactPromise ?? "Ozveme sa vám v pracovnom čase.",
    privacyUrl: config?.privacyUrl ?? "/privacy-policy",
  };
}

export function getAgencyConfigForSlug(slug: string): ValuationAgencyConfig | null {
  return getValuationAgency(slug);
}
