import type { SupabaseClient } from "@supabase/supabase-js";

const CLOSED_STATUSES = ["Uzavretý", "Archivovaný", "Stratený", "closed", "lost"];

function parseBudgetEur(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return 0;
  const digits = raw.replace(/[^\d]/g, "");
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

type SellerRescueLead = {
  leadName?: string;
  riskReason?: string;
};

export async function generateDirectorBrief(
  agencyId: string,
  supabase: SupabaseClient,
): Promise<string> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count: newLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .gte("created_at", yesterday);

  const { data: pipeline } = await supabase
    .from("leads")
    .select("budget, status")
    .eq("agency_id", agencyId);

  const pipelineValue = (pipeline ?? [])
    .filter((row) => !CLOSED_STATUSES.includes(String(row.status ?? "")))
    .reduce((sum, row) => sum + parseBudgetEur(row.budget), 0);

  const { data: critNotifs } = await supabase
    .from("routine_notifications")
    .select("title, data")
    .eq("agency_id", agencyId)
    .eq("type", "seller_rescue")
    .eq("priority", "critical")
    .is("read_at", null)
    .gte("created_at", yesterday)
    .limit(1);

  const topRiskLead = (critNotifs?.[0]?.data as { leads?: SellerRescueLead[] } | null)
    ?.leads?.[0];

  const pipelineStr = pipelineValue >= 1_000_000
    ? `${(pipelineValue / 1_000_000).toFixed(2)}M€`
    : `${Math.round(pipelineValue / 1000)}k€`;

  return [
    "━━━━━━━━━━━━━━━━━━━━━",
    "RIADITEĽSKÝ BRÍFING",
    "━━━━━━━━━━━━━━━━━━━━━",
    topRiskLead
      ? `🔴 URGENT: ${topRiskLead.leadName} — ${topRiskLead.riskReason}`
      : "✅ Žiadne kritické riziká",
    `📊 Pipeline: ${pipelineStr}`,
    `📥 Nové leady (24h): ${newLeads ?? 0}`,
    "",
    topRiskLead
      ? `TOP AKCIA: Zavolaj ${topRiskLead.leadName} dnes`
      : "TOP AKCIA: Skontroluj HOT leady",
    "━━━━━━━━━━━━━━━━━━━━━",
  ].join("\n");
}
