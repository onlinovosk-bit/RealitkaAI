import type { SupabaseClient } from "@supabase/supabase-js";

type LeadRow = {
  source: string | null;
  status: string | null;
  last_contact: string | null;
  created_at: string;
};

type SellerRescueRow = {
  priority: string | null;
  read_at: string | null;
  created_at: string;
};

export type CeoCommandSection = {
  id: string;
  title: string;
  status: "live" | "pending";
  value: string;
  note: string;
};

export type CeoCommandSummary = {
  generatedAt: string;
  sections: CeoCommandSection[];
  recommendations: string[];
};

const PIPELINE_STATUSES = new Set(["Teplý", "Horúci", "Obhliadka", "Ponuka"]);
const NO_CONTACT_VALUES = new Set(["", "Bez kontaktu", "Práve vytvorený", "Práve importovaný"]);

function countBySource(rows: LeadRow[]): string {
  if (rows.length === 0) return "0";
  const counts = new Map<string, number>();
  for (const row of rows) {
    const source = String(row.source ?? "").trim() || "Neznámy zdroj";
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? `${top[0]} (${top[1]})` : "0";
}

function isNoContact(value: string | null): boolean {
  const normalized = String(value ?? "").trim();
  return NO_CONTACT_VALUES.has(normalized);
}

export function buildCeoCommandSummary(input: {
  leads: LeadRow[];
  sellerRescueNotifications: SellerRescueRow[];
  nowMs?: number;
}): CeoCommandSummary {
  const nowMs = input.nowMs ?? Date.now();
  const since24h = nowMs - 24 * 60 * 60 * 1000;
  const leads = input.leads;

  const newLeads = leads.filter((lead) => Date.parse(lead.created_at) >= since24h).length;
  const bySource = countBySource(leads);
  const uncontacted = leads.filter((lead) => isNoContact(lead.last_contact)).length;
  const warmPipeline = leads.filter((lead) => PIPELINE_STATUSES.has(String(lead.status ?? ""))).length;
  const urgentRescue = input.sellerRescueNotifications.filter((row) => {
    return row.read_at == null && row.priority === "critical" && Date.parse(row.created_at) >= since24h;
  }).length;

  const sections: CeoCommandSection[] = [
    {
      id: "new_leads",
      title: "Nové leady (24h)",
      status: "live",
      value: String(newLeads),
      note: "Počet nových leadov z reálnych CRM záznamov.",
    },
    {
      id: "lead_source",
      title: "Najsilnejší zdroj",
      status: "live",
      value: bySource,
      note: "Top zdroj podľa počtu leadov v aktuálnych dátach.",
    },
    {
      id: "uncontacted",
      title: "Nekontaktované leady",
      status: "live",
      value: String(uncontacted),
      note: "Leady bez prvého kontaktu (Action Queue základ).",
    },
    {
      id: "warm_pipeline",
      title: "Leady v pipeline (Teplý+)",
      status: "live",
      value: String(warmPipeline),
      note: "Počet leadov vo fázach Teplý/Horúci/Obhliadka/Ponuka.",
    },
    {
      id: "rescue_urgent",
      title: "Seller Rescue urgent (24h)",
      status: "live",
      value: String(urgentRescue),
      note: "Kritické rescue signály za posledných 24h.",
    },
    {
      id: "top_brokers",
      title: "Najvýkonnejší makléri",
      status: "pending",
      value: "pending",
      note: "Aktivuje sa po stabilnom multi-maklér usage.",
    },
    {
      id: "revenue_prediction",
      title: "Predikcia obratu/provízií",
      status: "pending",
      value: "pending",
      note: "Potrebuje uzatvorené obchody + budget disciplínu.",
    },
    {
      id: "deal_risk",
      title: "Ohrozené zákazky",
      status: "pending",
      value: "pending",
      note: "Napojí sa po doručení Deal Risk skeletonu.",
    },
  ];

  const recommendations: string[] = [];
  if (uncontacted > 0) {
    recommendations.push(`${uncontacted} leadov čaká na prvý kontakt. Spusť Action Queue follow-up dnes.`);
  }
  if (urgentRescue > 0) {
    recommendations.push(`${urgentRescue} leadov má kritický Seller Rescue signál. Priorita: kontakt do 24h.`);
  }
  if (newLeads > 0) {
    recommendations.push(`${newLeads} nových leadov prišlo za 24h. Over priradenie a rýchlosť prvého kontaktu.`);
  }
  if (recommendations.length === 0) {
    recommendations.push("Dnes nie je urgentná CEO akcia z live dát. Pokračuj v dennej exekúcii Action Queue.");
  }

  return {
    generatedAt: new Date(nowMs).toISOString(),
    sections,
    recommendations,
  };
}

export async function getCeoCommandSummary(
  supabase: SupabaseClient,
  agencyId: string,
): Promise<CeoCommandSummary> {
  const [{ data: leads }, { data: notifications }] = await Promise.all([
    supabase
      .from("leads")
      .select("source, status, last_contact, created_at")
      .eq("agency_id", agencyId)
      .limit(1000),
    supabase
      .from("routine_notifications")
      .select("priority, read_at, created_at")
      .eq("agency_id", agencyId)
      .eq("type", "seller_rescue")
      .limit(200),
  ]);

  return buildCeoCommandSummary({
    leads: (leads ?? []) as LeadRow[],
    sellerRescueNotifications: (notifications ?? []) as SellerRescueRow[],
  });
}

