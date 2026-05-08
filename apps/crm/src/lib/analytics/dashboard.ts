import { createClient } from "@/lib/supabase/server";

export interface DashboardStats {
  totalLeads: number;
  contactedLeads: number;
  convertedLeads: number;
  avgScore: number;
  byStatus: Record<string, number>;
}

const EMPTY: DashboardStats = {
  totalLeads: 0,
  contactedLeads: 0,
  convertedLeads: 0,
  avgScore: 0,
  byStatus: {},
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .maybeSingle();

  let query = supabase.from("leads").select("status, score, last_contact_at");
  if (profile?.agency_id) query = query.eq("agency_id", profile.agency_id);

  const { data: leads, error } = await query;
  if (error || !leads) return EMPTY;

  const byStatus: Record<string, number> = {};
  let totalScore = 0;
  let contactedLeads = 0;
  let convertedLeads = 0;

  for (const lead of leads) {
    const status = (lead.status as string) ?? "Neznámy";
    byStatus[status] = (byStatus[status] ?? 0) + 1;
    totalScore += (lead.score as number) ?? 0;

    if (lead.last_contact_at) contactedLeads++;
    if (status === "Uzatvorený" || status === "Converted") convertedLeads++;
  }

  return {
    totalLeads:     leads.length,
    contactedLeads,
    convertedLeads,
    avgScore:       leads.length ? Math.round(totalScore / leads.length) : 0,
    byStatus,
  };
}
