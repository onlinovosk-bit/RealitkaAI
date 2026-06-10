import { FRANCHISE_BRANDS } from "./config.ts";
import type { EnrichedRecord, FinStatRow, ScoredProspect } from "./types.ts";

const TARGET_KRAJE = new Set(["prešovský", "kosický", "presovsky", "kosicky"]);

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function isFranchiseBrand(nazov: string): boolean {
  const n = norm(nazov);
  return FRANCHISE_BRANDS.some((b) => n.includes(norm(b)));
}

export function scoreTeamSizeEstimate(size: number | null): number {
  if (size == null || size <= 0) return 0;
  if (size >= 3 && size <= 10) return 30;
  if (size >= 1 && size <= 2) return 10;
  if (size >= 11 && size <= 15) return 15;
  return 0;
}

export function scoreFinstatEmployees(n: number | null): number {
  if (n == null) return 0;
  if (n >= 3 && n <= 10) return 25;
  return 0;
}

export function scorePortals(portals: string[]): number {
  return portals.length >= 2 ? 15 : 0;
}

export function scoreNoCrm(signals: string[]): number {
  return signals.length === 0 ? 10 : 0;
}

export function scoreRegion(kraj: string): number {
  const k = norm(kraj);
  return TARGET_KRAJE.has(k) ? 10 : 0;
}

export function scoreKonatelBroker(onWeb: boolean): number {
  return onWeb ? 10 : 0;
}

export type DisqualifyResult = { disqualified: boolean; reason?: string };

export function checkDisqualified(row: FinStatRow, enriched: EnrichedRecord | null): DisqualifyResult {
  if (isFranchiseBrand(row.nazov)) {
    return { disqualified: true, reason: "franchise_brand" };
  }
  const emp = row.zamestnanci ?? 0;
  const noWeb = !row.web?.trim();
  if (emp <= 1 && noWeb) {
    return { disqualified: true, reason: "solo_no_web" };
  }
  return { disqualified: false };
}

export function computeIcpScore(
  row: FinStatRow,
  enriched: EnrichedRecord | null,
): Pick<ScoredProspect, "icp_score" | "disqualified" | "disqualify_reason" | "score_breakdown"> {
  const e = enriched;
  const teamEst = e?.team_size_estimate ?? null;
  const portals = e?.portals_detected ?? [];
  const crm = e?.crm_signals ?? [];
  const konBroker = e?.konatel_on_web_as_broker ?? false;

  const breakdown: Record<string, number> = {
    team_web: scoreTeamSizeEstimate(teamEst),
    portals: scorePortals(portals),
    no_crm: scoreNoCrm(crm),
    region: scoreRegion(row.kraj),
    konatel_broker: scoreKonatelBroker(konBroker),
    finstat_employees: scoreFinstatEmployees(row.zamestnanci),
  };

  const dq = checkDisqualified(row, enriched);
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return {
    icp_score: dq.disqualified ? 0 : Math.min(100, total),
    disqualified: dq.disqualified,
    disqualify_reason: dq.reason,
    score_breakdown: breakdown,
  };
}

export function buildScoredProspect(row: FinStatRow, enriched: EnrichedRecord | null): ScoredProspect {
  const scored = computeIcpScore(row, enriched);
  return {
    ...row,
    domain: enriched?.domain ?? (row.web ? tryHostname(row.web) : null),
    enrich_status: enriched?.status ?? "skipped",
    enrich_skip_reason: enriched?.skip_reason,
    team_size_estimate: enriched?.team_size_estimate ?? null,
    portals_detected: enriched?.portals_detected ?? [],
    crm_signals: enriched?.crm_signals ?? [],
    has_modern_web: enriched?.has_modern_web ?? false,
    konatel_on_web_as_broker: enriched?.konatel_on_web_as_broker ?? false,
    ...scored,
  };
}

function tryHostname(web: string): string | null {
  try {
    return new URL(web).hostname;
  } catch {
    return null;
  }
}
