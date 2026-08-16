import { describe, expect, it } from "vitest";
import {
  LEADS_LIST_MAX,
  LEADS_PAGE_SIZE,
  resolveLeadListPage,
} from "@/lib/leads-store";
import {
  PROPERTIES_LIST_MAX,
  PROPERTIES_PAGE_SIZE,
  resolvePropertyListPage,
} from "@/lib/properties-store";

describe("list pagination helpers", () => {
  it("defaults omitted page to the legacy 500 cap", () => {
    expect(resolveLeadListPage()).toEqual({ limit: LEADS_LIST_MAX, offset: 0 });
    expect(resolvePropertyListPage()).toEqual({
      limit: PROPERTIES_LIST_MAX,
      offset: 0,
      columns: "full",
    });
  });

  it("clamps dashboard/leads page size to 50", () => {
    expect(LEADS_PAGE_SIZE).toBe(50);
    expect(PROPERTIES_PAGE_SIZE).toBe(50);
    expect(resolveLeadListPage({ limit: LEADS_PAGE_SIZE, offset: 50 })).toEqual({
      limit: 50,
      offset: 50,
    });
    expect(
      resolvePropertyListPage({ limit: 50, offset: 0, columns: "summary" }),
    ).toEqual({ limit: 50, offset: 0, columns: "summary" });
  });

  it("rejects non-positive and oversized pages", () => {
    expect(resolveLeadListPage({ limit: 0, offset: -4 })).toEqual({
      limit: 1,
      offset: 0,
    });
    expect(resolveLeadListPage({ limit: 9999 })).toEqual({
      limit: LEADS_LIST_MAX,
      offset: 0,
    });
  });
});
