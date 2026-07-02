import { DEMO_AGENCY_ID } from "@/lib/tenant-scope";

/** Smolko reference tenant — Loop 1 follow-up agent scope. */
export const FOLLOWUP_AGENCY_ID = DEMO_AGENCY_ID;

/** Genome Prediction Registry — agent identifier for Loop 1 writes. */
export const FOLLOWUP_AGENT_NAME = "followup_agent";

export const OPEN_LEAD_STATUSES = ["Nový", "Teplý", "Horúci", "Obhliadka", "Ponuka"] as const;

export const STALE_CONTACT_DAYS = 5;

export const MS_PER_DAY = 86_400_000;
