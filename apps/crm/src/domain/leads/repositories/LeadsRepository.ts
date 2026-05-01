export interface LeadSummary {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  score: number | null;
  briScore: number | null;
  agencyId: string;
  assignedProfileId: string | null;
  lastContactAt: string | null;
  createdAt: string;
}

export interface LeadFilters {
  agencyId?: string;
  status?: string;
  search?: string;
  minScore?: number;
  assignedProfileId?: string;
  limit?: number;
  offset?: number;
}

export interface LeadsRepository {
  findById(id: string): Promise<LeadSummary | null>;
  findByAgencyId(agencyId: string, filters?: LeadFilters): Promise<LeadSummary[]>;
  findHotLeads(agencyId: string, minScore?: number): Promise<LeadSummary[]>;
  countByAgencyId(agencyId: string): Promise<number>;
}
