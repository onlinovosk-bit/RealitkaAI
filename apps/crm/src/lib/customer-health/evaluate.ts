import { CUSTOMER_HEALTH_THRESHOLDS as T } from "@/lib/customer-health/thresholds";
import type {
  AgencyHealthInput,
  AgencyHealthResult,
  CustomerHealthSeverity,
  CustomerHealthSignal,
} from "@/lib/customer-health/types";

function bumpForPaying(
  severity: CustomerHealthSeverity,
  isPaying: boolean,
): CustomerHealthSeverity {
  if (!isPaying) return severity;
  // Paying silence is always one step higher; orange → red; red stays red.
  return "red";
}

function maxSeverity(
  a: CustomerHealthSeverity | null,
  b: CustomerHealthSeverity,
): CustomerHealthSeverity {
  if (a === "red" || b === "red") return "red";
  return "orange";
}

/** Pure evaluator — unit-tested. */
export function evaluateAgencyHealth(input: AgencyHealthInput): AgencyHealthResult {
  const signals: CustomerHealthSignal[] = [];

  const daysLead =
    input.daysSinceLastLead === null
      ? Number.POSITIVE_INFINITY
      : input.daysSinceLastLead;

  if (daysLead > T.DAYS_SINCE_LEAD_RED) {
    const base: CustomerHealthSeverity = "red";
    signals.push({
      code: "LEAD_SILENCE",
      severity: bumpForPaying(base, input.isPaying),
      detail: `Žiadny lead ${Number.isFinite(daysLead) ? `${Math.floor(daysLead)} dní` : "nikdy"}`,
      value: Number.isFinite(daysLead) ? daysLead : null,
    });
  } else if (daysLead > T.DAYS_SINCE_LEAD_ORANGE) {
    const base: CustomerHealthSeverity = "orange";
    signals.push({
      code: "LEAD_SILENCE",
      severity: bumpForPaying(base, input.isPaying),
      detail: `Žiadny lead ${Math.floor(daysLead)} dní`,
      value: daysLead,
    });
  }

  if (
    input.daysSinceOwnerLogin !== null &&
    input.daysSinceOwnerLogin > T.DAYS_SINCE_OWNER_LOGIN_ORANGE
  ) {
    const base: CustomerHealthSeverity = "orange";
    signals.push({
      code: "OWNER_LOGIN_STALE",
      severity: bumpForPaying(base, input.isPaying),
      detail: `Vlastník neprihlásený ${Math.floor(input.daysSinceOwnerLogin)} dní`,
      value: input.daysSinceOwnerLogin,
    });
  }

  if (
    input.profileCount > 0 &&
    input.neverLoggedInShare > T.NEVER_LOGGED_IN_SHARE_ORANGE
  ) {
    const base: CustomerHealthSeverity = "orange";
    const pct = Math.round(input.neverLoggedInShare * 100);
    signals.push({
      code: "NEVER_LOGGED_IN_SHARE",
      severity: bumpForPaying(base, input.isPaying),
      detail: `${pct} % účtov sa nikdy neprihlásilo`,
      value: input.neverLoggedInShare,
    });
  }

  if (input.profileCount > 0 && !input.anyTeamLoginWithin30d) {
    const base: CustomerHealthSeverity = "red";
    signals.push({
      code: "TEAM_LOGIN_SILENCE",
      severity: bumpForPaying(base, input.isPaying),
      detail: `Nikto z tímu sa neprihlásil ${T.DAYS_NO_TEAM_LOGIN_RED}+ dní`,
      value: T.DAYS_NO_TEAM_LOGIN_RED,
    });
  }

  let severity: CustomerHealthSeverity | null = null;
  for (const s of signals) {
    severity = maxSeverity(severity, s.severity);
  }

  return {
    agencyId: input.agencyId,
    agencyName: input.agencyName,
    isPaying: input.isPaying,
    severity,
    signals,
  };
}

/** Paying agencies first, then red before orange, then name. */
export function sortAgencyHealthResults(
  rows: AgencyHealthResult[],
): AgencyHealthResult[] {
  const rank = (r: AgencyHealthResult) => {
    const pay = r.isPaying ? 0 : 1;
    const sev = r.severity === "red" ? 0 : r.severity === "orange" ? 1 : 2;
    return pay * 10 + sev;
  };
  return [...rows].sort((a, b) => {
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return a.agencyName.localeCompare(b.agencyName, "sk");
  });
}
