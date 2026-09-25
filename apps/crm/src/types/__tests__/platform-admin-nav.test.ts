import { describe, expect, it } from "vitest";
import { ALL_NAV_ITEMS, getNavItems, type MenuVariant } from "../navigation";

const VARIANTS: MenuVariant[] = ["agent_solo", "agent_team", "owner_vision", "owner_protocol"];
const INTERNAL_METRICS = "internal-metrics";

describe("platformAdminOnly položky v menu", () => {
  it("Metriky zakladateľa sú označené ako platformAdminOnly", () => {
    const item = ALL_NAV_ITEMS.find((i) => i.id === INTERNAL_METRICS);
    expect(item?.href).toBe("/internal/metrics");
    expect(item?.platformAdminOnly).toBe(true);
  });

  it("bez príznaku ich nevidí žiadny program — ani owner_protocol", () => {
    for (const variant of VARIANTS) {
      const ids = getNavItems(variant).map((i) => i.id);
      expect(ids).not.toContain(INTERNAL_METRICS);
    }
  });

  it("isPlatformAdmin: false nestačí", () => {
    const ids = getNavItems("owner_protocol", undefined, "protocol_authority", {
      isPlatformAdmin: false,
    }).map((i) => i.id);
    expect(ids).not.toContain(INTERNAL_METRICS);
  });

  it("platform admin ich vidí v každom programe", () => {
    for (const variant of VARIANTS) {
      const ids = getNavItems(variant, undefined, undefined, { isPlatformAdmin: true }).map(
        (i) => i.id,
      );
      expect(ids).toContain(INTERNAL_METRICS);
    }
  });

  it("príznak neodomyká nič iné — pribudne presne jedna položka", () => {
    const base = getNavItems("owner_protocol", undefined, "protocol_authority");
    const admin = getNavItems("owner_protocol", undefined, "protocol_authority", {
      isPlatformAdmin: true,
    });
    expect(admin.length).toBe(base.length + 1);
    const added = admin.filter((i) => !base.some((b) => b.id === i.id));
    expect(added.map((i) => i.id)).toEqual([INTERNAL_METRICS]);
  });
});
