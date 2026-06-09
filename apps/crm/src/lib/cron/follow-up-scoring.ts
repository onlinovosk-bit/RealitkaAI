export type FollowUpUrgency = "critical" | "high" | "normal";

export interface FollowUpAction {
  leadId: string;
  leadName: string;
  urgency: FollowUpUrgency;
  suggestedAction: string;
  reason: string;
  daysSinceContact: number;
}

type LeadRow = {
  id: string;
  name?: string | null;
  last_contact?: string | null;
  ai_priority?: string | null;
};

function daysSinceLastContact(lastContact: string | null | undefined): number {
  const raw = String(lastContact ?? "").trim();
  if (!raw || raw === "Bez kontaktu" || raw === "Práve vytvorený") return 999;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return 999;
  return Math.floor((Date.now() - parsed) / 86_400_000);
}

export function scoreFollowUp(lead: LeadRow): FollowUpAction {
  const days = daysSinceLastContact(lead.last_contact);
  const urgency: FollowUpUrgency =
    days > 14 ? "critical" : days > 7 ? "high" : "normal";

  const priority = String(lead.ai_priority ?? "").trim();
  const suggestedAction =
    priority === "Vysoká"
      ? "Zavolaj dnes — HOT lead"
      : days > 14
        ? "Urgentný follow-up — hrozí strata"
        : "Pošli krátky email s aktualizáciou";

  return {
    leadId: lead.id,
    leadName: lead.name ?? "Neznámy",
    urgency,
    suggestedAction,
    reason:
      days === 999
        ? "Nikdy nekontaktovaný"
        : `Posledný kontakt pred ${days} dňami`,
    daysSinceContact: days,
  };
}

export function isCriticalFollowUp(lead: LeadRow): boolean {
  return scoreFollowUp(lead).urgency === "critical";
}
