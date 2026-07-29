import { SANDBOX_AGENCY_ID } from "@/lib/valuation/agency-config";

/** Default false — route returns 404 until founder enables after authz verification. */
export function isOperatorDashboardEnabled(): boolean {
  const raw = process.env.OPERATOR_DASHBOARD_ENABLED;
  if (raw === undefined || raw === "") return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "on";
}

/** Comma-separated agency UUIDs excluded from operator metrics (mirror Guardian CSV parsing). */
export function parseOperatorAgencyExcludeList(): string[] {
  const raw = process.env.OPERATOR_AGENCY_EXCLUDE_LIST;
  const fromEnv =
    raw === undefined
      ? []
      : raw
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
  const hardcoded = [SANDBOX_AGENCY_ID];
  return [...new Set([...hardcoded, ...fromEnv])];
}

export function isOperatorExcludedAgency(agencyId: string, extraExcluded?: string[]): boolean {
  const excluded = new Set([...parseOperatorAgencyExcludeList(), ...(extraExcluded ?? [])]);
  return excluded.has(agencyId);
}
