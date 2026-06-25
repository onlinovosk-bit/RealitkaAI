import { DEMO_AGENCY_ID } from "@/lib/tenant-scope";

/** Smolko reference tenant — Loop 1 follow-up agent scope. */
export const FOLLOWUP_AGENCY_ID = DEMO_AGENCY_ID;

export const OPEN_LEAD_STATUSES = ["Nový", "Teplý", "Horúci", "Obhliadka", "Ponuka"] as const;

export const STALE_CONTACT_DAYS = 5;

export const MS_PER_DAY = 86_400_000;
