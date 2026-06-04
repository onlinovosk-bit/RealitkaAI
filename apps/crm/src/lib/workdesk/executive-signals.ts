import { getNextBestAction } from "@/lib/ai-engine";
import type { Lead } from "@/lib/leads-store";
import { getLeadDisplayScore } from "@/lib/leads/lead-display-score";

export type SignalUrgency = "critical" | "high" | "medium";

export type ExecutiveSignal = {
  leadId: string;
  name: string;
  action: string;
  timing: string;
  confidence: number;
  moneyEur: number | null;
  urgency: SignalUrgency;
  status: Lead["status"];
};

function parseBudgetCommission(budget: string): number | null {
  const digits = budget.replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number(digits);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 0.03);
}

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 999;
  const raw = dateStr.trim();
  if (!raw || raw === "Bez kontaktu" || raw === "Práve vytvorený") return 999;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return 999;
  return Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
}

function toAiLead(lead: Lead) {
  return {
    id: lead.id,
    name: lead.name,
    status: lead.status,
    last_contact_at: lead.lastContact,
  };
}

function resolveTiming(lead: Lead): string {
  const days = daysSince(lead.lastContact);
  if (lead.status === "Horúci") return "volať do 15 min";
  if (lead.status === "Ponuka") return "uzavrieť dnes";
  if (lead.status === "Obhliadka") return "potvrdiť termín";
  if (days >= 5) return "follow-up dnes";
  if (days >= 2) return "poslať SMS dnes";
  return "posunúť pipeline";
}

function resolveUrgency(lead: Lead): SignalUrgency {
  const days = daysSince(lead.lastContact);
  if (lead.score >= 85 || lead.status === "Horúci") return "critical";
  if (lead.score >= 70 || lead.status === "Ponuka" || days >= 5) return "high";
  return "medium";
}

function resolveConfidence(lead: Lead): number {
  if (lead.buyer_readiness_score != null) {
    return Math.min(100, Math.round(lead.buyer_readiness_score));
  }
  return Math.min(100, Math.round(lead.score));
}

export function formatMoneyEur(value: number | null): string {
  if (value == null) return "";
  return `€${value.toLocaleString("sk-SK")}`;
}

export function buildExecutiveSignals(leads: Lead[], limit = 3): ExecutiveSignal[] {
  return leads
    .filter((l) => !["Uzatvorený", "Stratený", "Zamietnutý"].includes(l.status as string))
    .sort((a, b) => getLeadDisplayScore(b) - getLeadDisplayScore(a))
    .slice(0, limit)
    .map((lead) => ({
      leadId: lead.id,
      name: lead.name,
      action: getNextBestAction(toAiLead(lead)),
      timing: resolveTiming(lead),
      confidence: resolveConfidence(lead),
      moneyEur: parseBudgetCommission(lead.budget),
      urgency: resolveUrgency(lead),
      status: lead.status,
    }));
}

export function getTopExecutiveSignal(leads: Lead[]): ExecutiveSignal | null {
  return buildExecutiveSignals(leads, 1)[0] ?? null;
}
