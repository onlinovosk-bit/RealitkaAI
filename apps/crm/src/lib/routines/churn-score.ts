export interface LeadForChurn {
  id: string;
  name: string | null;
  last_contact?: string | null;
  ai_priority: string | null;
  status: string | null;
  created_at: string;
}

export interface ChurnResult {
  leadId: string;
  leadName: string;
  churnScore: number;
  daysSinceContact: number;
  riskReason: string;
  recommendedAction: string;
  draftSms: string;
}

function daysSinceLastContact(
  lastContact: string | null | undefined,
  _createdAt: string,
): number {
  const raw = String(lastContact ?? "").trim();
  if (!raw || raw === "Bez kontaktu" || raw === "Práve vytvorený" || raw === "Práve importovaný") {
    return 999;
  }
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) {
    return 999;
  }
  return Math.floor((Date.now() - parsed) / 86_400_000);
}

export function calculateChurnScore(lead: LeadForChurn): number {
  const days = daysSinceLastContact(lead.last_contact, lead.created_at);

  const contactScore = Math.min(50, (days / 21) * 50);
  const priorityScore =
    lead.ai_priority === "Vysoká" ? 30 :
    lead.ai_priority === "Stredná" ? 15 : 5;
  const staleStatuses = ["Nový", "Kontaktovaný", "Záujem"];
  const statusScore = staleStatuses.includes(lead.status ?? "") ? 20 : 0;

  return Math.min(100, Math.round(contactScore + priorityScore + statusScore));
}

export function buildChurnResult(
  lead: LeadForChurn,
  score: number,
  agentName: string,
): ChurnResult {
  const days = daysSinceLastContact(lead.last_contact, lead.created_at);

  const riskReason =
    days >= 14 ? `${days} dní bez kontaktu` :
    lead.ai_priority === "Vysoká" ? `HOT lead bez follow-upu ${days} dní` :
    `Stagnujúci status: ${lead.status}`;

  const recommendedAction =
    score >= 80 ? "Zavolaj dnes — kritické riziko" :
    score >= 65 ? "Pošli personalizovaný email" :
    "Naplánuj follow-up na zajtra";

  const firstName = (lead.name ?? "Klient").split(" ")[0];
  const draftSms =
    `Dobrý deň ${firstName}, chcel by som vás informovať o novinkách. ` +
    `Zavolám vám dnes? — ${agentName}`;

  return {
    leadId: lead.id,
    leadName: lead.name ?? "Neznámy",
    churnScore: score,
    daysSinceContact: days,
    riskReason,
    recommendedAction,
    draftSms,
  };
}
