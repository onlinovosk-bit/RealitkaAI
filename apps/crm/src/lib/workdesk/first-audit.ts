import {
  countStaleLeads,
  isLastContactStale,
  OPEN_DEAL_STATUSES,
  getDealTriggerStaleDays,
} from "@/lib/agents/deal-trigger";
import { OUTCOME } from "@/lib/copy/outcome-copy";
import type { Lead } from "@/lib/leads-store";
import { sortLeadsByTriagePriority, truncateReason } from "@/lib/triage/top-priority-leads";
import {
  buildExecutiveSignals,
  parseBudgetCommission,
} from "@/lib/workdesk/executive-signals";

export type FirstAuditDataQuality = "empty" | "sparse" | "ready";

export type FirstAuditCallTarget = {
  id: string;
  name: string;
  reason: string;
  moneyEur: number | null;
};

export type FirstAuditResult = {
  leadCount: number;
  forgottenLeads: number;
  atRiskDeals: number;
  /** Sum of 3% budget on at-risk open deals; null if no budgets present. */
  atRiskCommissionEur: number | null;
  /** Sum of 3% budget across open deals with budget; null if none. */
  commissionEstimateEur: number | null;
  topCallTargets: FirstAuditCallTarget[];
  todaySteps: string[];
  dataQuality: FirstAuditDataQuality;
  computedAt: string;
};

export type FirstAuditLeadInput = Pick<
  Lead,
  "id" | "name" | "status" | "budget" | "score" | "lastContact" | "createdAt" | "aiPriority" | "aiReason"
>;

const OPEN = new Set<string>(OPEN_DEAL_STATUSES);

function isOpenDeal(status: string): boolean {
  return OPEN.has(status);
}

function resolveDataQuality(leads: FirstAuditLeadInput[]): FirstAuditDataQuality {
  if (leads.length === 0) return "empty";
  const withBudget = leads.filter((l) => parseBudgetCommission(l.budget) != null).length;
  const withContact = leads.filter((l) => {
    const raw = String(l.lastContact ?? "").trim();
    return raw && raw !== "Bez kontaktu" && raw !== "Práve vytvorený";
  }).length;
  if (leads.length < 5 || (withBudget === 0 && withContact === 0)) return "sparse";
  return "ready";
}

function isAtRisk(lead: FirstAuditLeadInput, staleDays: number): boolean {
  if (!isOpenDeal(lead.status)) return false;
  const score = Number(lead.score ?? 0);
  const highValue = score >= 70 || lead.status === "Horúci" || lead.status === "Ponuka";
  return highValue && isLastContactStale(lead.lastContact, staleDays);
}

function buildTodaySteps(result: Omit<FirstAuditResult, "todaySteps" | "computedAt">): string[] {
  const steps: string[] = [];
  if (result.topCallTargets[0]) {
    steps.push(`Zavolať: ${result.topCallTargets[0].name}`);
  }
  if (result.forgottenLeads > 0) {
    steps.push(`Zachrániť ${result.forgottenLeads} stagnujúcich kontaktov`);
  }
  if (result.atRiskDeals > 0) {
    steps.push(`Skontrolovať ${result.atRiskDeals} ohrozených obchodov`);
  }
  if (steps.length === 0 && result.leadCount > 0) {
    steps.push("Prejsť Action Queue a označiť prvý hovor");
  }
  if (steps.length === 0) {
    steps.push("Importovať kontakty");
    steps.push("Spustiť 60-sekundový prehľad znova");
    steps.push("Urobiť prvý hovor z priorít");
  }
  return steps.slice(0, 3);
}

/**
 * Pure 60s “first value” audit from CRM leads — no LLM, no fake numbers.
 */
export function buildFirstAudit(
  leads: FirstAuditLeadInput[],
  options?: { staleDays?: number; now?: Date },
): FirstAuditResult {
  const staleDays = options?.staleDays ?? getDealTriggerStaleDays();
  const computedAt = (options?.now ?? new Date()).toISOString();
  const openLeads = leads.filter((l) => isOpenDeal(l.status));

  const forgottenLeads = countStaleLeads(leads, staleDays);
  const atRiskList = openLeads.filter((l) => isAtRisk(l, staleDays));
  const atRiskDeals = atRiskList.length;

  const atRiskCommissions = atRiskList
    .map((l) => parseBudgetCommission(l.budget))
    .filter((n): n is number => n != null);
  const atRiskCommissionEur =
    atRiskCommissions.length > 0
      ? atRiskCommissions.reduce((a, b) => a + b, 0)
      : null;

  const openCommissions = openLeads
    .map((l) => parseBudgetCommission(l.budget))
    .filter((n): n is number => n != null);
  const commissionEstimateEur =
    openCommissions.length > 0
      ? openCommissions.reduce((a, b) => a + b, 0)
      : null;

  const signals = buildExecutiveSignals(leads as Lead[], 3);
  const triageSorted = sortLeadsByTriagePriority(leads as Lead[]).slice(0, 3);

  const topCallTargets: FirstAuditCallTarget[] =
    signals.length > 0
      ? signals.map((s) => ({
          id: s.leadId,
          name: s.name,
          reason: s.action || s.timing,
          moneyEur: s.moneyEur,
        }))
      : triageSorted.map((l) => ({
          id: l.id,
          name: l.name,
          reason:
            truncateReason(l.aiReason) ||
            (l.aiPriority ? `Priorita: ${l.aiPriority}` : "Skontrolovať kontakt"),
          moneyEur: parseBudgetCommission(l.budget),
        }));

  const dataQuality = resolveDataQuality(leads);
  const base = {
    leadCount: leads.length,
    forgottenLeads,
    atRiskDeals,
    atRiskCommissionEur,
    commissionEstimateEur,
    topCallTargets,
    dataQuality,
  };

  const todaySteps =
    dataQuality === "empty"
      ? [OUTCOME.emptyNoLeads.replace(/\.$/, ""), "Importovať kontakty", "Spustiť prehľad znova"]
      : buildTodaySteps(base);

  return {
    ...base,
    todaySteps: todaySteps.slice(0, 3),
    computedAt,
  };
}

export function formatAuditMoney(eur: number | null): string {
  if (eur == null) return "—";
  return `${eur.toLocaleString("sk-SK")} €`;
}
