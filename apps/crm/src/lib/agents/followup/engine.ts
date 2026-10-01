import { FOLLOWUP_AGENCY_ID, MS_PER_DAY, STALE_CONTACT_DAYS } from "@/lib/agents/followup/constants";
import type {
  DraftAction,
  FollowupDecision,
  FollowupEngineResult,
  FollowupLeadInput,
  Prediction,
} from "@/lib/agents/followup/types";

export type FollowupEngineOptions = {
  agencyId?: string;
  nowMs?: number;
};

function parseMs(value?: string | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function daysSince(iso: string | null | undefined, nowMs: number): number | null {
  const ms = parseMs(iso);
  if (ms == null) return null;
  return Math.max(0, Math.floor((nowMs - ms) / MS_PER_DAY));
}

function hasChannel(lead: FollowupLeadInput, channel: "email" | "sms"): boolean {
  if (channel === "email") return Boolean(lead.email?.trim());
  return Boolean(lead.phone?.trim());
}

function buildDraftBody(lead: FollowupLeadInput, channel: "email" | "sms"): string {
  const greeting = lead.name?.trim() ? `Dobrý deň, ${lead.name.trim()},` : "Dobrý deň,";
  if (channel === "sms") {
    return `${greeting} volám sa z Reality Smolko — máte ešte záujem o nehnuteľnosti z vášho dopytu? Stačí krátka odpoveď. Ďakujem.`;
  }
  return `${greeting}\n\npíšem z Reality Smolko v súvislosti s vaším dopytom. Ak máte ešte záujem, rád/a vám pošlem aktuálne ponuky alebo dohodneme krátky hovor.\n\nS pozdravom,\nReality Smolko`;
}

function estimatePrediction(
  decision: FollowupDecision,
  agencyId: string,
  leadId: string,
): Prediction | null {
  if (decision === "wait" || decision === "broker_review") return null;

  const isEmail = decision === "follow_up_email";
  return {
    agency_id: agencyId,
    lead_id: leadId,
    decision,
    p_outcome: isEmail ? 0.22 : 0.18,
    expected_value_eur: isEmail ? 420 : 310,
    confidence: isEmail ? 0.62 : 0.55,
    expected_outcome: isEmail ? "reply_or_meeting" : "sms_reply",
    status: "open",
  };
}

/**
 * Rule-based follow-up recommender — DRAFT only, no outbound send.
 */
export function evaluateFollowupLead(
  lead: FollowupLeadInput,
  options: FollowupEngineOptions = {},
): FollowupEngineResult {
  const nowMs = options.nowMs ?? Date.now();
  const agencyId = options.agencyId ?? FOLLOWUP_AGENCY_ID;

  const closedStatuses = ["Uzavretý", "Stratený", "Neaktívny"];
  if (closedStatuses.includes(lead.status)) {
    return {
      draft: {
        leadId: lead.id,
        leadName: lead.name,
        decision: "wait",
        channel: "none",
        body: "",
        reason: "Lead je v uzavretom stave — follow-up sa negeneruje.",
      },
      prediction: null,
    };
  }

  const daysIdle = daysSince(lead.last_contact ?? lead.updated_at, nowMs);
  const contactedRecently = daysIdle != null && daysIdle < 2;

  if (contactedRecently) {
    return {
      draft: {
        leadId: lead.id,
        leadName: lead.name,
        decision: "wait",
        channel: "none",
        body: "",
        reason: "Posledný kontakt bol nedávno — počkaj pred ďalším follow-upom.",
      },
      prediction: null,
    };
  }

  if (!hasChannel(lead, "email") && !hasChannel(lead, "sms")) {
    return {
      draft: {
        leadId: lead.id,
        leadName: lead.name,
        decision: "broker_review",
        channel: "none",
        body: "",
        reason: "Chýba e-mail aj telefón — maklér musí doplniť kontakt.",
      },
      prediction: null,
    };
  }

  const staleEnough = daysIdle == null || daysIdle >= STALE_CONTACT_DAYS;
  if (!staleEnough) {
    return {
      draft: {
        leadId: lead.id,
        leadName: lead.name,
        decision: "wait",
        channel: "none",
        body: "",
        reason: `Lead ešte nie je stagnujúci (prah ${STALE_CONTACT_DAYS} dní).`,
      },
      prediction: null,
    };
  }

  const preferSms =
    hasChannel(lead, "sms") &&
    (!hasChannel(lead, "email") || String(lead.source ?? "").toLowerCase().includes("sms"));
  const decision: FollowupDecision = preferSms ? "follow_up_sms" : "follow_up_email";
  const channel = preferSms ? "sms" : "email";
  const body = buildDraftBody(lead, channel);
  const subject = channel === "email" ? "Váš dopyt — Reality Smolko" : undefined;

  return {
    draft: {
      leadId: lead.id,
      leadName: lead.name,
      decision,
      channel,
      subject,
      body,
      reason:
        channel === "sms"
          ? "Stagnujúci lead s telefónom — navrhujeme krátky SMS follow-up (draft)."
          : "Stagnujúci lead s e-mailom — navrhujeme e-mail follow-up (draft).",
    },
    prediction: estimatePrediction(decision, agencyId, lead.id),
  };
}

export function evaluateFollowupBatch(
  leads: FollowupLeadInput[],
  options: FollowupEngineOptions = {},
): FollowupEngineResult[] {
  return leads.map((lead) => evaluateFollowupLead(lead, options));
}
