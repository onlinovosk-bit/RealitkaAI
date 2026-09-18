import { describe, expect, it } from "vitest";
import {
  filterLeadsInWindow,
  groupInflowBySource,
  INFLOW_EMPTY_COPY,
  inflowCutoffIso,
} from "./inflow";

describe("pritok inflow grouping", () => {
  it("exposes empty copy without invented numbers", () => {
    expect(INFLOW_EMPTY_COPY).toBe("Zatiaľ bez dát");
  });

  it("drops rows older than the cutoff", () => {
    const cutoff = inflowCutoffIso(Date.parse("2026-08-26T00:00:00.000Z"), 30);
    const rows = [
      { source: "Google Ads", created_at: "2026-08-20T00:00:00.000Z" },
      { source: "Facebook Ads", created_at: "2026-07-01T00:00:00.000Z" },
    ];
    expect(filterLeadsInWindow(rows, cutoff)).toEqual([
      { source: "Google Ads", created_at: "2026-08-20T00:00:00.000Z" },
    ]);
  });

  it("groups by source from rows only", () => {
    const grouped = groupInflowBySource([
      { source: "Google Ads" },
      { source: "Google Ads" },
      { source: "Web formulár" },
    ]);
    expect(grouped).toEqual([
      { source: "Google Ads", count: 2 },
      { source: "Web formulár", count: 1 },
    ]);
  });
});
