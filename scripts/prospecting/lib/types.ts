export type FinStatRow = {
  ico: string;
  nazov: string;
  web: string;
  kraj: string;
  mesto: string;
  zamestnanci: number | null;
  konatel: string;
  email: string;
  telefon: string;
  /** Firemný e-mail vhodný na B2B outreach (nie gmail/azet osobné). */
  outreach_email: string | null;
  outreach_email_flag: "company" | "personal" | "missing";
};

export type EnrichSkipReason =
  | "no_web"
  | "denied_domain"
  | "robots_disallowed"
  | "fetch_failed"
  | "timeout";

export type EnrichedRecord = {
  ico: string;
  domain: string | null;
  enriched_at: string;
  status: "ok" | "skipped";
  skip_reason?: EnrichSkipReason;
  skip_detail?: string;
  team_size_estimate: number | null;
  portals_detected: string[];
  crm_signals: string[];
  has_modern_web: boolean;
  konatel_on_web_as_broker: boolean;
  pages_fetched: string[];
};

export type ScoredProspect = FinStatRow & {
  domain: string | null;
  enrich_status: EnrichedRecord["status"];
  enrich_skip_reason?: EnrichSkipReason;
  team_size_estimate: number | null;
  portals_detected: string[];
  crm_signals: string[];
  has_modern_web: boolean;
  konatel_on_web_as_broker: boolean;
  icp_score: number;
  disqualified: boolean;
  disqualify_reason?: string;
  score_breakdown: Record<string, number>;
  personal_line?: string;
  needs_review?: boolean;
};
