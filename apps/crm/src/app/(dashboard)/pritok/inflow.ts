import type { Lead } from "@/lib/leads-store";
import { countLeadsBySource } from "@/lib/modules/revenue-intelligence";

export const INFLOW_EMPTY_COPY = "Zatiaľ bez dát";
export const INFLOW_WINDOW_DAYS = 30;

export type InflowLeadRow = {
  source?: string | null;
  created_at?: string | null;
};

export function inflowCutoffIso(nowMs = Date.now(), days = INFLOW_WINDOW_DAYS): string {
  return new Date(nowMs - days * 24 * 60 * 60 * 1000).toISOString();
}

export function filterLeadsInWindow(
  rows: InflowLeadRow[],
  cutoffIso: string,
): InflowLeadRow[] {
  const cutoff = Date.parse(cutoffIso);
  if (Number.isNaN(cutoff)) return [];
  return rows.filter((row) => {
    const created = Date.parse(String(row.created_at ?? ""));
    if (Number.isNaN(created)) return false;
    return created >= cutoff;
  });
}

export function groupInflowBySource(rows: InflowLeadRow[]) {
  const leads = rows.map((row) => ({
    source: row.source?.trim() || "Neznámy zdroj",
  })) as Pick<Lead, "source">[] as Lead[];
  return countLeadsBySource(leads);
}
