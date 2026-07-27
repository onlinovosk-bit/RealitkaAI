import { GUARDIAN_THRESHOLDS } from "@/lib/guardian/config";
import {
  hasUsablePhone,
  isActiveLeadStatus,
  isContactRequiredStatus,
  isUnassignedOwner,
} from "@/lib/guardian/active-leads";
import type { GuardianLeadRow, GuardianRuleCode } from "@/lib/guardian/types";

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

export function lastActivityMs(
  lead: GuardianLeadRow,
  lastEventAt: string | null | undefined,
): number | null {
  const candidates: number[] = [];
  if (lastEventAt) {
    const t = Date.parse(lastEventAt);
    if (!Number.isNaN(t)) candidates.push(t);
  }
  if (lead.updated_at) {
    const t = Date.parse(lead.updated_at);
    if (!Number.isNaN(t)) candidates.push(t);
  }
  const created = Date.parse(lead.created_at);
  if (!Number.isNaN(created)) candidates.push(created);
  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

export function evaluateRuleForLead(
  rule: GuardianRuleCode,
  lead: GuardianLeadRow,
  lastEventAt: string | null | undefined,
  nowMs: number,
): boolean {
  if (!isActiveLeadStatus(lead.status)) return false;

  switch (rule) {
    case "STALE": {
      if (!lastEventAt) return false;
      const latest = Date.parse(lastEventAt);
      if (Number.isNaN(latest)) return false;
      const ageMs = nowMs - latest;
      const quietMs = GUARDIAN_THRESHOLDS.R1_STALE_QUIET_DAYS * MS_DAY;
      const windowMs = GUARDIAN_THRESHOLDS.R1_STALE_ACTIVITY_WINDOW_DAYS * MS_DAY;
      return ageMs > quietMs && ageMs <= windowMs;
    }
    case "NO_OWNER": {
      const created = Date.parse(lead.created_at);
      if (Number.isNaN(created)) return false;
      if (nowMs - created <= GUARDIAN_THRESHOLDS.R2_NO_OWNER_HOURS * MS_HOUR) return false;
      return isUnassignedOwner(lead);
    }
    case "NO_PHONE": {
      if (!isContactRequiredStatus(lead.status)) return false;
      return !hasUsablePhone(lead.phone);
    }
    case "HOT_IGNORED": {
      if ((lead.ai_priority ?? "").trim() !== "Vysoká") return false;
      const last = lastActivityMs(lead, lastEventAt);
      if (last === null) return false;
      return nowMs - last > GUARDIAN_THRESHOLDS.R4_HOT_IGNORED_HOURS * MS_HOUR;
    }
    default:
      return false;
  }
}

export const GUARDIAN_RULE_CODES: GuardianRuleCode[] = [
  "STALE",
  "NO_OWNER",
  "NO_PHONE",
  "HOT_IGNORED",
];
