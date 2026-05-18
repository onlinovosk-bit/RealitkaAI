import type { AiPrioritySk } from "@/lib/workflows/lead-ai-priority";

/** Váhy z požiadavky: urgence 50 %, rozpočet 30 %, posledná aktivita 20 %. */
export const TRIAGE_FALLBACK_WEIGHTS = {
  urgency: 0.5,
  budget: 0.3,
  activity: 0.2,
} as const;

const STATUS_URGENCY: Record<string, number> = {
  Horúci: 1,
  Obhliadka: 0.92,
  Ponuka: 0.88,
  Teplý: 0.58,
  Nový: 0.48,
};

/** Určuje „urgency_score“ ∈ [0,1] zo statusu a numerického skóre leadu. */
export function triageUrgencyScore(status: string, leadScore: number): number {
  const st = STATUS_URGENCY[String(status ?? "").trim()] ?? 0.42;
  const sc = Math.min(1, Math.max(0, Number(leadScore) / 100));
  return 0.55 * st + 0.45 * sc;
}

/**
 * „budget_score“ ∈ [0,1] z textu rozpočtu (EUR / tis. — heuristika).
 * Bez čísel → mierne podpriemer (stabilný fallback).
 */
export function triageBudgetScore(budgetRaw: string | null | undefined): number {
  const s = String(budgetRaw ?? "")
    .toLowerCase()
    .replace(/\s/g, " ")
    .trim();
  if (!s) return 0.42;

  const compact = s.replace(/\s/g, "");
  const m = compact.match(/(\d+(?:[.,]\d+)?)\s*(?:€|eur|e|k|tis)?/i);
  if (!m) {
    const anyDigits = /\d/.test(s);
    return anyDigits ? 0.5 : 0.4;
  }

  let n = parseFloat(m[1].replace(",", "."));
  if (Number.isNaN(n) || n <= 0) return 0.42;

  if (/k|tis/i.test(s) && n < 1_000) n *= 1_000;

  return Math.min(1, n / 450_000);
}

/**
 * „last_activity_score“ ∈ [0,1] — nedávny kontakt vyššie.
 * ISO dátum alebo slovenské textové stavy z CRM.
 */
export function triageLastActivityScore(lastContact: string | null | undefined): number {
  const t = String(lastContact ?? "").trim();
  if (!t) return 0.35;

  const d = new Date(t);
  if (!Number.isNaN(d.getTime()) && /\d{4}-\d{2}-\d{2}/.test(t)) {
    const days = (Date.now() - d.getTime()) / 86_400_000;
    if (days <= 1) return 1;
    if (days <= 7) return 0.82;
    if (days <= 14) return 0.65;
    if (days <= 30) return 0.48;
    if (days <= 90) return 0.32;
    return 0.2;
  }

  if (/práve|prave|dnes|dneska|teraz/i.test(t)) return 0.95;
  if (/včera|vcera/i.test(t)) return 0.78;
  if (/týždeň|tyzden|7\s*d|posledný týždeň/i.test(t)) return 0.6;
  return 0.48;
}

export type TriageFallbackBreakdown = {
  urgency_score: number;
  budget_score: number;
  last_activity_score: number;
  composite: number;
};

export function triageFallbackBreakdown(input: {
  status: string;
  score: number;
  budget: string | null | undefined;
  last_contact: string | null | undefined;
}): TriageFallbackBreakdown {
  const urgency_score = triageUrgencyScore(input.status, input.score);
  const budget_score = triageBudgetScore(input.budget);
  const last_activity_score = triageLastActivityScore(input.last_contact);
  const composite =
    TRIAGE_FALLBACK_WEIGHTS.urgency * urgency_score +
    TRIAGE_FALLBACK_WEIGHTS.budget * budget_score +
    TRIAGE_FALLBACK_WEIGHTS.activity * last_activity_score;
  return { urgency_score, budget_score, last_activity_score, composite };
}

/** Mapovanie kompozitu na trojúrovňovú SK prioritu. */
export function triageCompositeToPriority(composite: number): AiPrioritySk {
  const x = Math.min(1, Math.max(0, composite));
  if (x >= 2 / 3) return "Vysoká";
  if (x >= 1 / 3) return "Stredná";
  return "Nízka";
}

/** Pre AI prompt: skóre 0..1 → celé číslo 1..10 (tokenovo kompaktné). */
export function triageScoreToBand01(score01: number): number {
  const x = Math.min(1, Math.max(0, score01));
  return Math.min(10, Math.max(1, Math.round(x * 10)));
}

/** Počet celých dní od poslednej aktivity (0 = dnes / práve). */
export function triageLastActivityDays(lastContact: string | null | undefined): number {
  const t = String(lastContact ?? "").trim();
  if (!t) return 30;

  const d = new Date(t);
  if (!Number.isNaN(d.getTime()) && /\d{4}-\d{2}-\d{2}/.test(t)) {
    const days = (Date.now() - d.getTime()) / 86_400_000;
    return Math.min(365, Math.max(0, Math.floor(days)));
  }

  if (/práve|prave|dnes|dneska|teraz/i.test(t)) return 0;
  if (/včera|vcera/i.test(t)) return 1;
  if (/týždeň|tyzden|7\s*d|posledný týždeň/i.test(t)) return 7;
  return 14;
}

const STAGE_SLUG: Record<string, string> = {
  Nový: "new",
  Teplý: "warm",
  Horúci: "hot",
  Obhliadka: "viewing",
  Ponuka: "offer",
};

/** Krátky stage slug pre model (namiesto dlhých textov). */
export function triageStageSlug(status: string): string {
  return STAGE_SLUG[String(status ?? "").trim()] ?? "unknown";
}

/**
 * Odhad „počtu interakcií“ 1..10 bez ťahania historie z DB:
 * dĺžka poznámky + bonus za zdroj.
 */
export function triageInteractionsEstimate(
  note: string | null | undefined,
  source: string | null | undefined,
): number {
  const n = (note ?? "").trim().length;
  const bonus = (source ?? "").trim() ? 1 : 0;
  const raw = Math.round(n / 100) + bonus;
  return Math.min(10, Math.max(1, raw));
}

/** Kompaktný riadok pre Haiku triage — minimum tokenov, žiadne full texty. */
export type TriageAiCompactRow = {
  id: string;
  urgency: number;
  budget: number;
  last_activity_days: number;
  stage: string;
  interactions: number;
};

export type TriageCompactSource = {
  id: string;
  status: string;
  score: number;
  budget?: string | null;
  last_contact?: string | null;
  note?: string | null;
  source?: string | null;
};

export function buildTriageAiCompactRow(row: TriageCompactSource): TriageAiCompactRow {
  return {
    id: row.id,
    urgency: triageScoreToBand01(triageUrgencyScore(row.status, row.score)),
    budget: triageScoreToBand01(triageBudgetScore(row.budget)),
    last_activity_days: triageLastActivityDays(row.last_contact),
    stage: triageStageSlug(row.status),
    interactions: triageInteractionsEstimate(row.note, row.source),
  };
}

export function triageFallbackPriority(input: {
  status: string;
  score: number;
  budget: string | null | undefined;
  last_contact: string | null | undefined;
}): { priority: AiPrioritySk; reason: string; breakdown: TriageFallbackBreakdown } {
  const breakdown = triageFallbackBreakdown(input);
  const priority = triageCompositeToPriority(breakdown.composite);
  const u = breakdown.urgency_score.toFixed(2);
  const b = breakdown.budget_score.toFixed(2);
  const a = breakdown.last_activity_score.toFixed(2);
  const c = breakdown.composite.toFixed(2);
  const reason = `Fallback skóre (${c}) = urgentnosť ${u}×0,5 + rozpočet ${b}×0,3 + aktivita ${a}×0,2 → ${priority}.`;
  return { priority, reason, breakdown };
}
