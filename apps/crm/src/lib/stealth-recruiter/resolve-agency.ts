import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_AGENCY_ID = "11111111-1111-1111-1111-111111111111";
const DEFAULT_AGENCY_SLUG = "reality-smolko";

export type ResolveStealthAgencyResult = {
  agencyId: string;
  resolvedVia: "param" | "slug" | "fallback";
  warning?: string;
};

export async function resolveStealthAgencyId(
  supabase: SupabaseClient,
  opts: { agencyId?: string | null; agencySlug?: string | null },
): Promise<ResolveStealthAgencyResult | null> {
  const explicitId = String(opts.agencyId ?? "").trim();
  if (explicitId) {
    const { data, error } = await supabase
      .from("agencies")
      .select("id")
      .eq("id", explicitId)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return { agencyId: data.id, resolvedVia: "param" };
    return null;
  }

  const slug =
    String(opts.agencySlug ?? "").trim() ||
    process.env.STEALTH_RECRUITER_AGENCY_SLUG?.trim() ||
    DEFAULT_AGENCY_SLUG;

  const { data, error } = await supabase
    .from("agencies")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;

  if (data?.id) {
    return { agencyId: data.id, resolvedVia: "slug" };
  }

  const fallback =
    process.env.STEALTH_RECRUITER_DEFAULT_AGENCY_ID?.trim() || DEFAULT_AGENCY_ID;

  return {
    agencyId: fallback,
    resolvedVia: "fallback",
    warning: `agency_slug_not_found:${slug}`,
  };
}
