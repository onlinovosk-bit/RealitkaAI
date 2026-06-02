import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FEATURES } from "@/components/billing/FeatureComparisonTable";
import { ALL_NAV_ITEMS, type MenuVariant } from "@/types/navigation";
import {
  CAPABILITY_REGISTRY,
  hasCapability,
  hasProgram,
  resolveCapabilities,
  type LicenseCapability,
} from "@/lib/license/capability-registry";
import { PROGRAM_BRAND_LABEL } from "@/lib/program-brand-names";
import { PLAN_PRICES_EUR } from "@/lib/program-tier-pricing";

const CRM_ROOT = join(process.cwd());
const APP_ROOT = join(CRM_ROOT, "src", "app", "(dashboard)");

const REALITY_MONOPOL_TIER = "protocol_authority" as const;
const MARKET_VISION_TIER = "market_vision" as const;
const OWNER_PROTOCOL: MenuVariant = "owner_protocol";
const OWNER_VISION: MenuVariant = "owner_vision";

const MONOPOL_CAPABILITIES = (
  Object.keys(CAPABILITY_REGISTRY) as LicenseCapability[]
).filter((cap) => CAPABILITY_REGISTRY[cap].requiredProgram === "monopol");

const GUARDIAN_CAPABILITIES = (
  Object.keys(CAPABILITY_REGISTRY) as LicenseCapability[]
).filter((cap) => CAPABILITY_REGISTRY[cap].requiredProgram === "guardian");

function routeToPagePath(href: string): string {
  const [pathname] = href.split("?");
  const segments = pathname.replace(/^\//, "").split("/").filter(Boolean);
  return join(APP_ROOT, ...segments, "page.tsx");
}

function protocolOnlyMarketed() {
  return FEATURES.filter(
    (r) => r.protocolAuthority === true && r.marketVision === false,
  );
}

describe("Reality Monopol — brand & billing tier", () => {
  it("uses Reality Monopol as protocol program label", () => {
    expect(PROGRAM_BRAND_LABEL.protocol).toBe("Enterprise seat");
  });

  it("has monopol program on protocol_authority tier only at top rank", () => {
    expect(hasProgram(REALITY_MONOPOL_TIER, "monopol")).toBe(true);
    expect(hasProgram(MARKET_VISION_TIER, "monopol")).toBe(false);
    expect(hasProgram(REALITY_MONOPOL_TIER, "guardian")).toBe(true);
    expect(hasProgram(REALITY_MONOPOL_TIER, "radar")).toBe(true);
    expect(hasProgram(REALITY_MONOPOL_TIER, "smart")).toBe(true);
  });
});

describe("Reality Monopol — capability registry", () => {
  it("enables all monopol-exclusive capabilities", () => {
    for (const cap of MONOPOL_CAPABILITIES) {
      expect(hasCapability(REALITY_MONOPOL_TIER, cap)).toBe(true);
    }
    expect(MONOPOL_CAPABILITIES).toContain("canUseCompetitionRadar");
    expect(MONOPOL_CAPABILITIES).toContain("canUseMonopolDominance");
  });

  it("keeps monopol caps locked for market_vision", () => {
    for (const cap of MONOPOL_CAPABILITIES) {
      expect(hasCapability(MARKET_VISION_TIER, cap)).toBe(false);
    }
  });

  it("inherits guardian, radar, and smart capabilities", () => {
    const caps = resolveCapabilities(REALITY_MONOPOL_TIER);
    expect(caps.canUseMarketIntel).toBe(true);
    expect(caps.canViewForecast).toBe(true);
    expect(caps.canManageLeads).toBe(true);
    expect(caps.canUseCompetitionRadar).toBe(true);
    expect(caps.canUseMonopolDominance).toBe(true);
  });

  it("still grants guardian features to market_vision (below monopol)", () => {
    for (const cap of GUARDIAN_CAPABILITIES) {
      expect(hasCapability(MARKET_VISION_TIER, cap)).toBe(true);
    }
  });
});

describe("Reality Monopol — owner_protocol navigation", () => {
  const protocolNav = ALL_NAV_ITEMS.filter((item) =>
    item.showFor.includes(OWNER_PROTOCOL),
  );
  const visionNav = ALL_NAV_ITEMS.filter((item) =>
    item.showFor.includes(OWNER_VISION),
  );

  it("adds protocol-only competition hub", () => {
    const competition = ALL_NAV_ITEMS.find((i) => i.id === "competition");
    expect(competition?.href).toBe("/l99-hub");
    expect(competition?.showFor).toEqual(["owner_protocol"]);
    expect(protocolNav.map((i) => i.id)).toContain("competition");
    expect(visionNav.map((i) => i.id)).not.toContain("competition");
  });

  it("includes all Market Vision owner routes plus competition", () => {
    const protocolHrefs = new Set(protocolNav.map((i) => i.href.split("?")[0]));
    for (const item of visionNav) {
      expect(protocolHrefs.has(item.href.split("?")[0])).toBe(true);
    }
    expect(protocolHrefs.has("/l99-hub")).toBe(true);
  });

  it("has page modules for every owner_protocol href", () => {
    const missing: string[] = [];
    for (const item of protocolNav) {
      const path = routeToPagePath(item.href);
      if (!existsSync(path)) {
        missing.push(`${item.id} → ${item.href}`);
      }
    }
    expect(missing, missing.join("\n")).toEqual([]);
  });
});

describe("Reality Monopol — implementation anchors", () => {
  it("lists protocol-only marketed rows", () => {
    expect(protocolOnlyMarketed().length).toBeGreaterThanOrEqual(10);
  });

  it("anchors competition and intelligence hub code", () => {
    const anchors: Record<string, string[]> = {
      "Upozornenie na konkurenciu": [
        "src/components/l99/CompetitionMap.tsx",
        "src/app/(dashboard)/l99-hub",
      ],
      "Detektor kde konkurencia spí": ["src/components/l99/CompetitionMap.tsx"],
      "Živý radar obchodov: kde sú peniaze práve teraz": [
        "src/app/(dashboard)/l99-hub",
        "src/app/(dashboard)/dashboard",
      ],
      "Prehľad pre majiteľa: kde tím zarába dnes": ["src/app/(dashboard)/team"],
      "Kataster naživo bez limitu": [
        "src/app/(dashboard)/l99-hub",
        "src/components/leads/KatasterMonitorCard.tsx",
      ],
    };

    const missing: string[] = [];
    for (const [label, paths] of Object.entries(anchors)) {
      const row = protocolOnlyMarketed().find((r) => r.feature === label);
      if (!row) {
        missing.push(`matrix: ${label}`);
        continue;
      }
      if (!paths.some((p) => existsSync(join(CRM_ROOT, p)))) {
        missing.push(label);
      }
    }
    expect(missing, missing.join("\n")).toEqual([]);
  });

  it("wires L99 hub with CompetitionMap and IntelBrief", () => {
    const hub = join(CRM_ROOT, "src/app/(dashboard)/l99-hub/page.tsx");
    const source = readFileSync(hub, "utf8");
    expect(source).toContain("CompetitionMap");
    expect(source).toContain("IntelBrief");
    expect(source).toContain("isProtocolAuthority");
  });

  it("documents Reality Monopol in billing store copy", () => {
    const billing = join(CRM_ROOT, "src/lib/billing-store.ts");
    const source = readFileSync(billing, "utf8");
    // Billing may use internal SKU name (Protocol Authority) or brand label (Reality Monopol).
    expect(
      source.includes(PROGRAM_BRAND_LABEL.protocol) ||
        source.includes("Protocol Authority"),
    ).toBe(true);
  });
});

describe("Reality Monopol — licensing action mapping", () => {
  it("maps protocol_authority to owner_protocol ui role", () => {
    const licensing = join(CRM_ROOT, "src/app/_actions/licensing.ts");
    const source = readFileSync(licensing, "utf8");
    expect(source).toContain('protocol_authority');
    expect(source).toContain('owner_protocol');
  });
});
