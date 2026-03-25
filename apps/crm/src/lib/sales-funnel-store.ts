import { createClient } from "@supabase/supabase-js";
import { createActivity } from "@/lib/activities-store";

export type SaaSLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  agentsCount: number;
  city: string;
  note: string;
  source: string;
  status: "new" | "contacted" | "demo_booked" | "proposal_sent" | "won" | "lost";
  createdAt?: string;
};

const demoSaasLeads: SaaSLead[] = [
  {
    id: "saas-demo-1",
    name: "Martin Novotný",
    email: "martin@premiumreality.sk",
    phone: "+421900111111",
    company: "Premium Reality",
    agentsCount: 12,
    city: "Bratislava",
    note: "Záujem o demo pre celý tím.",
    source: "Landing page",
    status: "new",
  },
  {
    id: "saas-demo-2",
    name: "Petra Kováčová",
    email: "petra@byvanieplus.sk",
    phone: "+421900222222",
    company: "Bývanie Plus",
    agentsCount: 6,
    city: "Trnava",
    note: "Chce vidieť AI scoring a outreach.",
    source: "Demo request",
    status: "demo_booked",
  },
];

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return createClient(url, key);
}

async function logSaasLeadActivity(lead: SaaSLead) {
  try {
    await createActivity({
      leadId: null,
      type: "Sales Funnel",
      title: "Nový SaaS demo lead",
      text: `Prišiel nový záujemca o demo: ${lead.company}.`,
      entityType: "saas_lead",
      entityId: lead.id,
      actorName: lead.name,
      source: "sales",
      severity: "success",
      meta: {
        company: lead.company,
        email: lead.email,
        agentsCount: lead.agentsCount,
        source: lead.source,
        status: lead.status,
      },
    });

    console.log("[sales-funnel] Activity úspešne zapísaná pre SaaS lead:", lead.id);
  } catch (error) {
    console.error("[sales-funnel] Nepodarilo sa zapísať activity pre SaaS lead:", {
      leadId: lead.id,
      company: lead.company,
      error: error instanceof Error ? error.message : error,
    });
  }
}

export async function listSaasLeads(): Promise<SaaSLead[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return demoSaasLeads;
  }

  const { data, error } = await supabase
    .from("saas_leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[sales-funnel] listSaasLeads fallback:", error?.message);
    return demoSaasLeads;
  }

  return data.map((item: any) => ({
    id: item.id,
    name: item.name ?? "",
    email: item.email ?? "",
    phone: item.phone ?? "",
    company: item.company ?? "",
    agentsCount: Number(item.agents_count ?? 0),
    city: item.city ?? "",
    note: item.note ?? "",
    source: item.source ?? "Landing page",
    status: item.status ?? "new",
    createdAt: item.created_at,
  }));
}

export async function createSaasLead(input: {
  name: string;
  email: string;
  phone?: string;
  company: string;
  agentsCount: number;
  city?: string;
  note?: string;
  source?: string;
}) {
  const supabase = getSupabaseClient();

  const fallbackLead: SaaSLead = {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email,
    phone: input.phone ?? "",
    company: input.company,
    agentsCount: input.agentsCount,
    city: input.city ?? "",
    note: input.note ?? "",
    source: input.source ?? "Landing page",
    status: "new",
  };

  if (!supabase) {
    await logSaasLeadActivity(fallbackLead);
    return fallbackLead;
  }

  const { data, error } = await supabase
    .from("saas_leads")
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone ?? "",
      company: input.company,
      agents_count: Number(input.agentsCount ?? 0),
      city: input.city ?? "",
      note: input.note ?? "",
      source: input.source ?? "Landing page",
      status: "new",
    })
    .select("*")
    .single();

  if (error) {
    console.error("[sales-funnel] createSaasLead fallback:", error.message);
    await logSaasLeadActivity(fallbackLead);
    return fallbackLead;
  }

  const result: SaaSLead = {
    id: data.id,
    name: data.name ?? "",
    email: data.email ?? "",
    phone: data.phone ?? "",
    company: data.company ?? "",
    agentsCount: Number(data.agents_count ?? 0),
    city: data.city ?? "",
    note: data.note ?? "",
    source: data.source ?? "Landing page",
    status: data.status ?? "new",
    createdAt: data.created_at,
  };

  await logSaasLeadActivity(result);
  return result;
}

export async function getSalesFunnelData() {
  const leads = await listSaasLeads();

  const kpis = {
    total: leads.length,
    newCount: leads.filter((item) => item.status === "new").length,
    demoBooked: leads.filter((item) => item.status === "demo_booked").length,
    won: leads.filter((item) => item.status === "won").length,
    avgAgents:
      leads.length > 0
        ? Math.round(leads.reduce((sum, item) => sum + item.agentsCount, 0) / leads.length)
        : 0,
  };

  return {
    kpis,
    leads,
  };
}
