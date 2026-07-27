export type GuardianRuleCode = "STALE" | "NO_OWNER" | "NO_PHONE" | "HOT_IGNORED";

export type GuardianLeadRow = {
  id: string;
  agency_id: string;
  status: string;
  phone: string | null;
  ai_priority: string | null;
  assigned_profile_id: string | null;
  assigned_agent: string | null;
  created_at: string;
  updated_at: string | null;
};

export type GuardianRunStats = {
  agencyId: string;
  leadsScanned: number;
  inserted: number;
  autoResolved: number;
  openAfterRun: number;
  byRule: Record<GuardianRuleCode, number>;
  mode: "baseline" | "normal";
  durationMs: number;
};
