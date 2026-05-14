export const AI_PRIORITY_SK = ["Vysoká", "Stredná", "Nízka"] as const;

export type AiPrioritySk = (typeof AI_PRIORITY_SK)[number];

export function normalizeAiPriority(raw: string | undefined | null): AiPrioritySk {
  const t = String(raw ?? "").trim();
  if ((AI_PRIORITY_SK as readonly string[]).includes(t)) return t as AiPrioritySk;
  const low = t.toLowerCase();
  if (low.includes("vysok")) return "Vysoká";
  if (low.includes("stred")) return "Stredná";
  if (low.includes("níz") || low.includes("niz")) return "Nízka";
  return "Stredná";
}

export function priorityRank(p: AiPrioritySk | string | null | undefined): number {
  if (p === "Vysoká") return 2;
  if (p === "Stredná") return 1;
  if (p === "Nízka") return 0;
  return -1;
}
