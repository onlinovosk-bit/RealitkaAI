import { describe, it, expect } from "vitest";

/** Zrkadlí logiku v LeadsModule — filtre skryli všetkých načítaných klientov. */
function filtersHideAll(loaded: number, visible: number): boolean {
  return loaded > 0 && visible === 0;
}

describe("leads filter visibility", () => {
  it("detekuje skrytie všetkých klientov filtrami", () => {
    expect(filtersHideAll(451, 0)).toBe(true);
    expect(filtersHideAll(0, 0)).toBe(false);
    expect(filtersHideAll(12, 12)).toBe(false);
    expect(filtersHideAll(12, 3)).toBe(false);
  });
});
