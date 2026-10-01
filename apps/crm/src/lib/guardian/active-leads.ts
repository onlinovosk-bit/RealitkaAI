import { isTerminalLeadStatus } from "@/lib/agents/followup/outcomeWriter";

/**
 * Open pipeline statuses — same set as follow-up-sweep (`OPEN_STATUSES`).
 * Terminal statuses: `TERMINAL_LEAD_STATUSES` in outcomeWriter.ts.
 */
export const OPEN_PIPELINE_STATUSES = [
  "Nový",
  "Teplý",
  "Horúci",
  "Obhliadka",
  "Ponuka",
] as const;

/** R3: conservative — early funnel stages that require phone contact. */
export const CONTACT_REQUIRED_STATUSES = ["Nový", "Teplý", "Horúci"] as const;

export function isActiveLeadStatus(status: string): boolean {
  return !isTerminalLeadStatus(status);
}

export function isContactRequiredStatus(status: string): boolean {
  return (CONTACT_REQUIRED_STATUSES as readonly string[]).includes(status);
}

export function hasUsablePhone(phone: string | null | undefined): boolean {
  const p = (phone ?? "").trim();
  return p.length >= 6;
}

export function isUnassignedOwner(lead: {
  assigned_profile_id?: string | null;
  assigned_agent?: string | null;
}): boolean {
  if (lead.assigned_profile_id) return false;
  const agent = (lead.assigned_agent ?? "").trim();
  return !agent || agent === "Nepriradený";
}
