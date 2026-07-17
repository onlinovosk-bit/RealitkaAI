import type { Lead } from "@/lib/mock-data";
import { priorityRank, type AiPrioritySk } from "@/lib/workflows/lead-ai-priority";

/** BRI zobrazenie zodpovedajúce W1 triáži (nie surové 0 po importe). */
export function aiPriorityToDisplayScore(priority: string | null | undefined): number | null {
  if (priority === "Vysoká") return 85;
  if (priority === "Stredná") return 55;
  if (priority === "Nízka") return 22;
  return null;
}

export function getLeadDisplayScore(
  lead: Pick<Lead, "score" | "buyer_readiness_score" | "aiPriority" | "aiTriageAt" | "lastContact">
): number | null {
  if (lead.buyer_readiness_score != null && Number.isFinite(lead.buyer_readiness_score)) {
    return Math.min(100, Math.round(lead.buyer_readiness_score));
  }
  const raw = Number(lead.score ?? 0);
  if (raw > 0) return Math.min(100, Math.round(raw));
  if (isSparseQualificationLead(lead)) return null;
  if (lead.aiTriageAt) {
    const fromPriority = aiPriorityToDisplayScore(lead.aiPriority);
    if (fromPriority != null) return fromPriority;
  }
  return 0;
}

/** Tooltip pri „—“ v tabuľke / mobile karte. */
export function getLeadScoreUnavailableHint(
  lead: Pick<Lead, "score" | "lastContact" | "aiPriority" | "aiTriageAt">,
): string | null {
  if (!isSparseQualificationLead(lead)) return null;
  return "Skóre zatiaľ nie je k dispozícii — import bez kvalifikácie. Doplňte budget, financovanie alebo prvý kontakt.";
}

/** Import / bez kontaktu — triáž Nízka, nie „horúci“ ani „kúpi dnes“. */
export function isSparseQualificationLead(
  lead: Pick<Lead, "score" | "lastContact" | "aiPriority" | "aiTriageAt">
): boolean {
  if (lead.aiTriageAt) {
    return lead.aiPriority === "Nízka";
  }
  if (Number(lead.score ?? 0) > 0) return false;
  const last = String(lead.lastContact ?? "").trim();
  return !last || last === "Bez kontaktu" || last === "Práve vytvorený";
}

export function isLeadHot(lead: Lead): boolean {
  if (isSparseQualificationLead(lead)) return false;
  if (lead.status === "Horúci") return true;
  if (lead.aiPriority === "Vysoká") return true;
  return (lead.score ?? 0) >= 85;
}

export function isLeadBuyerReadyToday(lead: Lead): boolean {
  if (isSparseQualificationLead(lead)) return false;
  if (lead.aiPriority === "Vysoká") return true;
  if (lead.status === "Horúci" && (getLeadDisplayScore(lead) ?? 0) >= 70) return true;
  if (lead.status === "Ponuka" || lead.status === "Obhliadka") {
    return (getLeadDisplayScore(lead) ?? 0) >= 60 && lead.aiPriority !== "Nízka";
  }
  if ((lead.score ?? 0) >= 75 && priorityRank(lead.aiPriority as AiPrioritySk) >= priorityRank("Stredná")) {
    return true;
  }
  return false;
}
