import { describe, expect, it } from "vitest";
import {
  ALL_NAV_ITEMS,
  applyImportNavBadges,
  getNavItems,
  IMPORT_CONTACTS_NAV_ID,
  type MenuVariant,
} from "@/types/navigation";

describe("import-contacts navigation", () => {
  const ownerVariants: MenuVariant[] = ["owner_vision", "owner_protocol"];

  for (const variant of ownerVariants) {
    it(`places import after forecast for ${variant}`, () => {
      const items = getNavItems(variant, undefined, variant === "owner_protocol" ? "protocol_authority" : "market_vision");
      const forecastIdx = items.findIndex((i) => i.id === "forecast");
      const importIdx = items.findIndex((i) => i.id === IMPORT_CONTACTS_NAV_ID);
      const teamIdx = items.findIndex((i) => i.id === "team");

      expect(importIdx).toBeGreaterThan(-1);
      expect(forecastIdx).toBeGreaterThan(-1);
      expect(teamIdx).toBeGreaterThan(-1);
      expect(importIdx).toBeGreaterThan(forecastIdx);
      expect(importIdx).toBeLessThan(teamIdx);
      expect(items[importIdx]?.href).toBe("/import/universal");
    });
  }

  it("places import after today for agent_solo", () => {
    const items = getNavItems("agent_solo", undefined, "pro");
    const todayIdx = items.findIndex((i) => i.id === "today");
    const importIdx = items.findIndex((i) => i.id === IMPORT_CONTACTS_NAV_ID);
    const pipelineIdx = items.findIndex((i) => i.id === "pipeline");

    expect(importIdx).toBeGreaterThan(todayIdx);
    expect(importIdx).toBeLessThan(pipelineIdx);
  });

  it('adds badge "Začni tu" when leadsCount is 0', () => {
    const base = getNavItems("owner_vision", undefined, "market_vision");
    const withBadge = applyImportNavBadges(base, 0);
    const importItem = withBadge.find((i) => i.id === IMPORT_CONTACTS_NAV_ID);
    expect(importItem?.badge?.label).toBe("Začni tu");
  });

  it("removes import badge when leads exist", () => {
    const base = getNavItems("owner_vision", undefined, "market_vision");
    const withBadge = applyImportNavBadges(base, 439);
    const importItem = withBadge.find((i) => i.id === IMPORT_CONTACTS_NAV_ID);
    expect(importItem?.badge).toBeUndefined();
  });

  it("defines upload icon on import item", () => {
    const def = ALL_NAV_ITEMS.find(
      (i) => i.id === IMPORT_CONTACTS_NAV_ID && i.showFor.includes("owner_vision"),
    );
    expect(def?.icon).toBe("upload");
  });
});
