import { createServiceRoleClient } from "@/lib/supabase/admin";

/** A/B rozdelenie variantov copy (0–1, podiel variantu A). */
export function pickOutboundAbVariant(): "A" | "B" {
  const raw = Number(process.env.OUTREACH_AB_SPLIT ?? 0.5);
  const p = Math.min(1, Math.max(0, Number.isFinite(raw) ? raw : 0.5));
  return Math.random() < p ? "A" : "B";
}

/** Minimálny odstup medzi dvoma AI emailami na jeden lead (hodiny). */
export function outreachLeadCooldownHours(): number {
  const n = Number(process.env.OUTREACH_LEAD_COOLDOWN_HOURS ?? 20);
  return Number.isFinite(n) && n >= 0 ? n : 20;
}

/**
 * Koľko hodín ubehlo od posledného AI outbound emailu na lead.
 * null = žiadna história.
 */
export async function getHoursSinceLastAiEmailToLead(
  leadId: string
): Promise<number | null> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return null;
  }

  const { data } = await sb
    .from("messages")
    .select("created_at")
    .eq("lead_id", leadId)
    .eq("direction", "outbound")
    .eq("channel", "email")
    .eq("ai_generated", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.created_at) {
    return null;
  }

  return (Date.now() - new Date(data.created_at).getTime()) / 3_600_000;
}

export async function fetchLeadAgencyId(leadId: string): Promise<string | null> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return null;
  }

  const { data } = await sb
    .from("leads")
    .select("agency_id")
    .eq("id", leadId)
    .maybeSingle();

  return data?.agency_id ?? null;
}
