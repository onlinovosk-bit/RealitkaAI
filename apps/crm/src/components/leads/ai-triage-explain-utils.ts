import { triageBudgetScore, triageLastActivityDays } from "@/ai/triage-fallback-scoring";

export function isAiTriageFallbackReason(reason: string | null | undefined): boolean {
  const r = String(reason ?? "");
  return r.includes("Fallback skóre") || r.includes("Model nevrátil platný JSON");
}

/** Krátky ľudský hint o poslednej aktivite (bez číselnej „score“). */
export function brokerActivityHint(lastContact: string): string {
  const days = triageLastActivityDays(lastContact);
  if (days === 0) return "Nedávna reakcia — dnes alebo teraz";
  if (days === 1) return "Reagoval včera";
  if (days <= 7) return `Posledný kontakt pred ${days} dňami`;
  if (days <= 30) return "Kontakt v posledných týždňoch";
  return "Starší kontakt — odporúčaný follow-up";
}

export function brokerBudgetHint(budget: string): string {
  const b = triageBudgetScore(budget ?? "");
  if (b >= 0.72) return "Vyšší rozpočet";
  if (b >= 0.45) return "Stredný rozpočet";
  if ((budget ?? "").trim()) return "Nižší alebo nejednoznačný rozpočet";
  return "Rozpočet neuvedený";
}

export function brokerStageHint(status: string): string {
  switch (String(status ?? "").trim()) {
    case "Horúci":
      return "Horúci záujem";
    case "Obhliadka":
      return "Obhliadka v pipeline";
    case "Ponuka":
      return "Fáza ponuky";
    case "Teplý":
      return "Zahriaty lead";
    case "Nový":
      return "Nový lead";
    default:
      return `Stav: ${status}`;
  }
}

/** Krátky „prečo“ z AI dôvodu — bez technických prefixov ak ide o fallback. */
export function summarizeAiReasonForBroker(reason: string | null | undefined): string | null {
  if (!reason?.trim()) return null;
  let r = reason.trim();
  if (r.includes("→")) {
    const parts = r.split("→");
    const tail = parts[parts.length - 1]?.trim() ?? r;
    r = tail || r;
  }
  if (r.length > 200) return `${r.slice(0, 197)}…`;
  return r;
}

export function buildBrokerTriageBullets(input: {
  status: string;
  budget: string;
  lastContact: string;
}): string[] {
  return [
    brokerActivityHint(input.lastContact),
    brokerBudgetHint(input.budget),
    brokerStageHint(input.status),
  ];
}

export function priorityEmoji(priority: string | null | undefined): string {
  if (priority === "Vysoká") return "🔥";
  if (priority === "Stredná") return "◆";
  if (priority === "Nízka") return "○";
  return "◆";
}
