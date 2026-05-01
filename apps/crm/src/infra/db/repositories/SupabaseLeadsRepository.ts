import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LeadsRepository,
  LeadSummary,
  LeadFilters,
} from "@/domain/leads/repositories/LeadsRepository";

export class SupabaseLeadsRepository implements LeadsRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<LeadSummary | null> {
    const { data, error } = await this.supabase
      .from("leads")
      .select("id,name,email,phone,status,score,bri_score,agency_id,assigned_profile_id,last_contact_at,created_at")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return mapRow(data);
  }

  async findByAgencyId(
    agencyId: string,
    filters: LeadFilters = {}
  ): Promise<LeadSummary[]> {
    let query = this.supabase
      .from("leads")
      .select("id,name,email,phone,status,score,bri_score,agency_id,assigned_profile_id,last_contact_at,created_at")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false })
      .limit(filters.limit ?? 100)
      .range(
        filters.offset ?? 0,
        (filters.offset ?? 0) + (filters.limit ?? 100) - 1
      );

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.assignedProfileId)
      query = query.eq("assigned_profile_id", filters.assignedProfileId);
    if (filters.minScore) query = query.gte("score", filters.minScore);
    if (filters.search)
      query = query.or(
        `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
      );

    const { data, error } = await query;
    if (error) throw new Error(`[SupabaseLeadsRepository] ${error.message}`);
    return (data ?? []).map(mapRow);
  }

  async findHotLeads(
    agencyId: string,
    minScore = 70
  ): Promise<LeadSummary[]> {
    const { data, error } = await this.supabase
      .from("leads")
      .select("id,name,email,phone,status,score,bri_score,agency_id,assigned_profile_id,last_contact_at,created_at")
      .eq("agency_id", agencyId)
      .gte("bri_score", minScore)
      .order("bri_score", { ascending: false })
      .limit(20);

    if (error) throw new Error(`[SupabaseLeadsRepository] ${error.message}`);
    return (data ?? []).map(mapRow);
  }

  async countByAgencyId(agencyId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId);

    if (error) throw new Error(`[SupabaseLeadsRepository] ${error.message}`);
    return count ?? 0;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): LeadSummary {
  return {
    id: row.id,
    name: row.name ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    status: row.status ?? null,
    score: row.score ?? null,
    briScore: row.bri_score ?? null,
    agencyId: row.agency_id,
    assignedProfileId: row.assigned_profile_id ?? null,
    lastContactAt: row.last_contact_at ?? null,
    createdAt: row.created_at,
  };
}
