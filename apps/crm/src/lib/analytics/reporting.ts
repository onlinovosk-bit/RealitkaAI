import { createClient } from "@/lib/supabase/server";

export interface ReportFilter {
  fromDate?: string;
  toDate?: string;
  agentId?: string;
  status?: string;
  channel?: string;
}

export interface LeadReportRow {
  leadId:      string;
  name:        string;
  email:       string;
  status:      string;
  score:       number;
  createdAt:   string;
  lastContact: string;
}

export async function getLeadsReport(filter: ReportFilter): Promise<LeadReportRow[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .maybeSingle();

  let query = supabase
    .from("leads")
    .select("id, name, email, status, score, created_at, last_contact_at, assigned_agent")
    .order("created_at", { ascending: false })
    .limit(500);

  if (profile?.agency_id) query = query.eq("agency_id", profile.agency_id);
  if (filter.status)      query = query.eq("status", filter.status);
  if (filter.agentId)     query = query.eq("assigned_agent", filter.agentId);
  if (filter.fromDate)    query = query.gte("created_at", filter.fromDate);
  if (filter.toDate)      query = query.lte("created_at", filter.toDate);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => ({
    leadId:      row.id      as string,
    name:        (row.name   as string) ?? "",
    email:       (row.email  as string) ?? "",
    status:      (row.status as string) ?? "",
    score:       (row.score  as number) ?? 0,
    createdAt:   (row.created_at     as string) ?? "",
    lastContact: (row.last_contact_at as string) ?? "",
  }));
}

export async function exportLeadsToCsv(rows: LeadReportRow[]): Promise<string> {
  const header = "leadId,name,email,status,score,createdAt,lastContact";
  const lines  = rows.map((r) =>
    [r.leadId, r.name, r.email, r.status, r.score, r.createdAt, r.lastContact]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header, ...lines].join("\n");
}
