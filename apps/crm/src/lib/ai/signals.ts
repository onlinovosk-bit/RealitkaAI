/**
 * Normalizované signály pre REVOLIS AI Sales Brain v2 (nie CRM dáta — vstup do „mozgov“).
 */

import { getEmailEngagementForLead } from "./email-engagement-store";

export type SalesBrainSignals = {
  emailOpened: number;
  emailClicked: number;
  propertyViews: number;
  responded: boolean;
  scheduledViewing: boolean;
  /** Odhadovaný počet dní od posledného kontaktu */
  daysSinceLastContact: number;
};

type LeadLike = {
  id: string;
  status: string;
};

type MatchLike = { leadId: string; matchScore: number };
type RecommendationLike = { leadId: string | null };
type TaskLike = { leadId: string | null; status: string; priority: string };
type MessageLike = { leadId: string | null; direction: string };

function normalize(text: string) {
  return String(text || "").toLowerCase().trim();
}

/** Parsuje lastContact (ISO / locale) alebo vráti konzervatívny odhad. */
export function estimateDaysSinceLastContact(lastContactLabel: string): number {
  const raw = String(lastContactLabel || "").trim();
  if (!raw || /bez kontaktu/i.test(raw)) return 14;
  if (/práve|prave|vytvorený|vytvoreny/i.test(raw)) return 0;

  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  }

  const sk = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (sk) {
    const [, day, month, year] = sk;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    if (!Number.isNaN(parsed.getTime())) {
      return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 86400000));
    }
  }

  return 5;
}

export function buildSalesBrainSignals(input: {
  lead: LeadLike & { lastContact?: string };
  matches: MatchLike[];
  recommendations: RecommendationLike[];
  tasks: TaskLike[];
  messages: MessageLike[];
}): SalesBrainSignals {
  const { lead, matches, recommendations, tasks, messages } = input;

  const leadMatches = matches.filter((m) => m.leadId === lead.id);
  const leadRecs = recommendations.filter((r) => r.leadId === lead.id);
  const leadTasks = tasks.filter((t) => t.leadId === lead.id);
  const leadMessages = messages.filter((m) => m.leadId === lead.id);

  const outbound = leadMessages.filter((m) => normalize(m.direction) === "outbound");
  const inbound = leadMessages.filter((m) => normalize(m.direction) === "inbound");

  const eg = getEmailEngagementForLead(lead.id);
  const heuristicOpen = Math.min(8, Math.max(0, outbound.length));
  const heuristicClick = Math.min(
    8,
    outbound.length > 0 && inbound.length > 0 ? 2 : outbound.length > 0 ? 1 : 0
  );

  const emailOpened =
    eg.opens > 0 ? Math.min(8, Math.max(eg.opens, heuristicOpen)) : heuristicOpen;
  const emailClicked =
    eg.clicks > 0 ? Math.min(8, Math.max(eg.clicks, heuristicClick)) : heuristicClick;

  const propertyViews = Math.min(
    12,
    leadMatches.length * 2 + Math.min(6, leadRecs.length)
  );

  const responded = inbound.length >= 1;

  const st = normalize(lead.status);
  const scheduledViewing =
    st.includes("obhli") ||
    st.includes("ponuka") ||
    leadTasks.some(
      (t) =>
        normalize(t.priority) === "high" &&
        (normalize(t.status) !== "done" || st.includes("obhli"))
    );

  const daysSinceLastContact = estimateDaysSinceLastContact(lead.lastContact ?? "");

  return {
    emailOpened,
    emailClicked,
    propertyViews,
    responded,
    scheduledViewing,
    daysSinceLastContact,
  };
}

/** Mapovanie na váhovaný scoring engine (self-learning váhy). */
export function salesBrainSignalsToWeightedRecord(s: SalesBrainSignals): Record<string, number> {
  return {
    email_open: Math.min(1, s.emailOpened / 6),
    link_click: Math.min(1, s.emailClicked / 4),
    page_view: Math.min(1, s.propertyViews / 12),
    reply: s.responded ? 1 : 0,
    call_answered: 0,
    viewing_booked: s.scheduledViewing ? 1 : 0,
  };
}
