export type SellerRescueLeadInput = {
  id: string;
  name: string | null;
  status: string | null;
  last_contact: string | null;
  created_at: string;
  assigned_profile_id: string | null;
};

export type SellerRescueCandidate = {
  leadId: string;
  leadName: string;
  assignedProfileId: string | null;
  daysWithoutContact: number;
  activityCount: number;
  riskScore: number;
  riskReason: string;
};

const CLOSED_STATUSES = new Set(["Uzavretý", "Archivovaný", "Stratený", "closed", "lost"]);
const STALE_STATUS_BONUS: Record<string, number> = {
  "Nový": 22,
  "Kontaktovaný": 18,
  "Záujem": 14,
  "Teplý": 10,
  "Horúci": 8,
};

function parseDate(raw: string | null | undefined): number | null {
  const value = String(raw ?? "").trim();
  if (!value || value === "Bez kontaktu" || value === "Práve vytvorený" || value === "Práve importovaný") {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function daysWithoutContact(lead: SellerRescueLeadInput, nowMs = Date.now()): number {
  const lastContact = parseDate(lead.last_contact);
  const createdAt = parseDate(lead.created_at) ?? nowMs;
  const source = lastContact ?? createdAt;
  return Math.max(0, Math.floor((nowMs - source) / 86_400_000));
}

export function computeSellerRescueRiskScore(input: {
  daysWithoutContact: number;
  status: string | null;
  activityCount: number;
}): number {
  const contactRisk = Math.min(65, input.daysWithoutContact * 4);
  const statusRisk = STALE_STATUS_BONUS[input.status ?? ""] ?? 6;
  const activityRisk = input.activityCount <= 0 ? 22 : input.activityCount === 1 ? 12 : 4;
  return Math.min(100, Math.round(contactRisk + statusRisk + activityRisk));
}

export function pickSellerRescueCandidates(params: {
  leads: SellerRescueLeadInput[];
  activityCountByLeadId: Record<string, number>;
  minDaysWithoutContact?: number;
  limit?: number;
  /** Test hook — production callers omit (uses Date.now()). */
  nowMs?: number;
}): SellerRescueCandidate[] {
  const minDays = params.minDaysWithoutContact ?? 7;
  const limit = params.limit ?? 10;
  const nowMs = params.nowMs ?? Date.now();

  return params.leads
    .filter((lead) => !CLOSED_STATUSES.has(String(lead.status ?? "")))
    .map((lead) => {
      const days = daysWithoutContact(lead, nowMs);
      const activityCount = params.activityCountByLeadId[lead.id] ?? 0;
      const riskScore = computeSellerRescueRiskScore({
        daysWithoutContact: days,
        status: lead.status,
        activityCount,
      });
      const riskReason = `${days} dní bez kontaktu, ${activityCount} aktivít`;
      return {
        leadId: lead.id,
        leadName: lead.name ?? "Neznámy lead",
        assignedProfileId: lead.assigned_profile_id,
        daysWithoutContact: days,
        activityCount,
        riskScore,
        riskReason,
      };
    })
    .filter((candidate) => candidate.daysWithoutContact >= minDays)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, limit);
}

/**
 * Dedupe: leady s už otvorenou Seller Rescue úlohou sa nesmú úlohovať znova
 * (bez tohto vznikala 1 duplicitná open úloha na lead denne).
 */
export function excludeLeadsWithOpenRescueTask<T extends { leadId: string }>(
  candidates: T[],
  openTaskLeadIds: Iterable<string>,
): T[] {
  const taken = new Set(openTaskLeadIds);
  return candidates.filter((candidate) => !taken.has(candidate.leadId));
}

