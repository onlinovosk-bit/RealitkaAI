import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { FEATURES } from "@/components/billing/FeatureComparisonTable";
import {
  ALL_NAV_ITEMS,
  type MenuVariant,
} from "@/types/navigation";
import {
  CAPABILITY_REGISTRY,
  hasCapability,
  hasProgram,
  resolveCapabilities,
  type LicenseCapability,
} from "@/lib/license/capability-registry";
import type { LicenseProgramId } from "@/lib/license/types";

const CRM_ROOT = join(process.cwd());
const APP_ROOT = join(CRM_ROOT, "src", "app", "(dashboard)");

const MARKET_VISION_TIER = "market_vision" as const;
const OWNER_VARIANT: MenuVariant = "owner_vision";

/** Guardian program = Market Vision billing tier */
const GUARDIAN_CAPABILITIES = (
  Object.keys(CAPABILITY_REGISTRY) as LicenseCapability[]
).filter((cap) => CAPABILITY_REGISTRY[cap].requiredProgram === "guardian");

const PROTOCOL_ONLY_CAPABILITIES: LicenseCapability[] = [
  "canUseCompetitionRadar",
  "canUseMonopolDominance",
  "canUseStealthRecruiter",
];

function routeToPagePath(href: string): string {
  const [pathname, query] = href.split("?");
  const segments = pathname.replace(/^\//, "").split("/").filter(Boolean);
  const base = join(APP_ROOT, ...segments, "page.tsx");
  if (existsSync(base)) return base;
  if (query && existsSync(join(APP_ROOT, ...segments.slice(0, -1), "page.tsx"))) {
    return join(APP_ROOT, ...segments.slice(0, -1), "page.tsx");
  }
  return base;
}

describe("Market Vision — license & program gates", () => {
  it("has guardian program for market_vision tier", () => {
    expect(hasProgram(MARKET_VISION_TIER, "guardian")).toBe(true);
    expect(hasProgram(MARKET_VISION_TIER, "monopol")).toBe(false);
  });

  it("enables all guardian capabilities", () => {
    for (const cap of GUARDIAN_CAPABILITIES) {
      expect(hasCapability(MARKET_VISION_TIER, cap)).toBe(true);
    }
  });

  it("keeps protocol-only capabilities locked", () => {
    for (const cap of PROTOCOL_ONLY_CAPABILITIES) {
      expect(hasCapability(MARKET_VISION_TIER, cap)).toBe(false);
    }
  });

  it("inherits radar (forecast) and smart (leads) below guardian", () => {
    const caps = resolveCapabilities(MARKET_VISION_TIER);
    expect(caps.canViewForecast).toBe(true);
    expect(caps.canManageLeads).toBe(true);
    expect(caps.canUseMarketIntel).toBe(true);
  });
});

describe("Market Vision — owner navigation surfaces", () => {
  const ownerNav = ALL_NAV_ITEMS.filter((item) =>
    item.showFor.includes(OWNER_VARIANT),
  );

  it("defines owner_vision primary routes", () => {
    expect(ownerNav.length).toBeGreaterThanOrEqual(6);
    const hrefs = ownerNav.map((i) => i.href);
    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/forecast");
    expect(hrefs).toContain("/team");
    expect(hrefs).toContain("/billing");
  });

  it("does not expose protocol-only competition hub to owner_vision", () => {
    const competition = ALL_NAV_ITEMS.find((i) => i.id === "competition");
    expect(competition?.showFor).toEqual(["owner_protocol"]);
  });

  it("has a page module for each owner_vision href", () => {
    const missing: string[] = [];
    for (const item of ownerNav) {
      const path = routeToPagePath(item.href);
      if (!existsSync(path)) {
        missing.push(`${item.id} → ${item.href} (expected ${path})`);
      }
    }
    expect(missing, missing.join("\n")).toEqual([]);
  });
});

describe("Market Vision — marketing matrix vs implementation hooks", () => {
  const marketed = FEATURES.filter((row) => row.marketVision === true);

  /** Minimal code anchors — extend when new MV features ship */
  const IMPLEMENTATION_ANCHORS: Record<string, string[]> = {
    "AI pomocník počas dňa (rýchle odpovede klientom)": [
      "src/app/(dashboard)/dashboard",
      "src/app/(dashboard)/revolis-ai",
    ],
    "Predpoveď: ktorý obchod sa uzavrie": ["src/app/(dashboard)/forecast"],
    "AI analýza hovorov: čo povedať, aby klient kúpil": [
      "src/components/leads",
      "src/app/(dashboard)/revolis-ai",
    ],
    "Mapa horúcich ulíc (kde je najväčší dopyt)": [
      "src/components/revolis/MarketHeatmap.tsx",
      "src/components/analytics/DemandHeatmap.tsx",
    ],
    "Návrat starých klientov (Ghost 2.0)": ["src/app/(dashboard)/l99-hub"],
    "Kataster naživo (limit 100)": ["src/components/leads/KatasterMonitorCard.tsx"],
    "Auto import dát bez klikania": ["src/lib/realvia/processQueue.ts"],
    "Analytika výkonu: kde zarábaš a kde strácaš": ["src/app/(dashboard)/team"],
  };

  it("lists marketed Market Vision features", () => {
    expect(marketed.length).toBeGreaterThanOrEqual(20);
  });

  it("has filesystem anchors for critical MV differentiators", () => {
    const missing: string[] = [];
    for (const [label, anchors] of Object.entries(IMPLEMENTATION_ANCHORS)) {
      const row = marketed.find((r) => r.feature === label);
      if (!row) {
        missing.push(`matrix row missing: ${label}`);
        continue;
      }
      const anyExists = anchors.some((rel) =>
        existsSync(join(CRM_ROOT, rel)) ||
        existsSync(join(CRM_ROOT, rel.replace(/\/page\.tsx$/, ""))),
      );
      if (!anyExists) {
        missing.push(`${label} → ${anchors.join(", ")}`);
      }
    }
    expect(missing, missing.join("\n")).toEqual([]);
  });
});

describe("Market Vision — program id alignment", () => {
  it("maps guardian program to market_vision min tier", () => {
    const programs: LicenseProgramId[] = ["smart", "radar", "guardian", "monopol"];
    expect(programs.indexOf("guardian")).toBeLessThan(programs.indexOf("monopol"));
  });
});
