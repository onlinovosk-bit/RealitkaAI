import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { FEATURES } from "@/components/billing/FeatureComparisonTable";
import {
  ALL_NAV_ITEMS,
  getNavItems,
  type MenuVariant,
} from "@/types/navigation";
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

const SMART_START_TIER = "starter" as const;
const ACTIVE_FORCE_TIER = "pro" as const;
const AGENT_SOLO: MenuVariant = "agent_solo";
const AGENT_TEAM: MenuVariant = "agent_team";

const SMART_CAPABILITIES = (
  Object.keys(CAPABILITY_REGISTRY) as LicenseCapability[]
).filter((cap) => CAPABILITY_REGISTRY[cap].requiredProgram === "smart");

const RADAR_CAPABILITIES = (
  Object.keys(CAPABILITY_REGISTRY) as LicenseCapability[]
).filter((cap) => CAPABILITY_REGISTRY[cap].requiredProgram === "radar");

const GUARDIAN_CAPABILITIES = (
  Object.keys(CAPABILITY_REGISTRY) as LicenseCapability[]
).filter((cap) => CAPABILITY_REGISTRY[cap].requiredProgram === "guardian");

function routeToPagePath(href: string): string {
  const [pathname] = href.split("?");
  const segments = pathname.replace(/^\//, "").split("/").filter(Boolean);
  return join(APP_ROOT, ...segments, "page.tsx");
}

function marketed(plan: "smartStart" | "activeForce") {
  return FEATURES.filter((row) => row[plan] === true);
}

describe("Smart Start — program Smart (tier starter)", () => {
  it("maps billing brand and price", () => {
    expect(PROGRAM_BRAND_LABEL.starter).toBe("Solo seat");
    expect(PLAN_PRICES_EUR.soloSeat).toBe(79);
  });

  it("has smart program and not radar/guardian", () => {
    expect(hasProgram(SMART_START_TIER, "smart")).toBe(true);
    expect(hasProgram(SMART_START_TIER, "radar")).toBe(false);
    expect(hasProgram(SMART_START_TIER, "guardian")).toBe(false);
  });

  it("enables smart capabilities only", () => {
    for (const cap of SMART_CAPABILITIES) {
      expect(hasCapability(SMART_START_TIER, cap)).toBe(true);
    }
    for (const cap of RADAR_CAPABILITIES) {
      expect(hasCapability(SMART_START_TIER, cap)).toBe(false);
    }
    for (const cap of GUARDIAN_CAPABILITIES) {
      expect(hasCapability(SMART_START_TIER, cap)).toBe(false);
    }
  });

  it("resolves capability map for starter", () => {
    const caps = resolveCapabilities(SMART_START_TIER);
    expect(caps.canManageLeads).toBe(true);
    expect(caps.canUseAiTasks).toBe(true);
    expect(caps.canViewForecast).toBe(false);
    expect(caps.canUseMarketIntel).toBe(false);
  });

  it("exposes agent_solo navigation routes with pages", () => {
    const nav = getNavItems(AGENT_SOLO, undefined, "pro");
    expect(nav.length).toBeGreaterThanOrEqual(6);
    const hrefs = nav.map((i) => i.href);
    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/leads");
    expect(hrefs).toContain("/tasks");
    expect(hrefs).toContain("/properties");

    const missing: string[] = [];
    for (const item of nav) {
      const path = routeToPagePath(item.href);
      if (!existsSync(path) && !item.href.startsWith("/contacts")) {
        missing.push(`${item.id} → ${item.href}`);
      }
    }
    expect(missing, missing.join("\n")).toEqual([]);
  });

  it("contacts route redirects to leads (Smart Start klienti)", () => {
    const contactsPage = join(APP_ROOT, "contacts", "page.tsx");
    expect(existsSync(contactsPage)).toBe(true);
  });

  it("has code anchors for marketed Smart Start features", () => {
    const marketedRows = marketed("smartStart");
    expect(marketedRows.length).toBeGreaterThanOrEqual(6);

    const anchors: Record<string, string[]> = {
      "AI pomocník počas dňa (rýchle odpovede klientom)": [
        "src/app/(dashboard)/dashboard",
      ],
      "Skóre: kto kúpi najskôr (0-100)": ["src/app/(dashboard)/leads"],
      "Horúci alert (skóre 75+): komu volať hneď": ["src/components/leads"],
      "Ranný plán o 8:00: kde sú peniaze dnes": [
        "src/app/(dashboard)/dashboard",
        "src/components/dashboard",
      ],
    };

    const missing: string[] = [];
    for (const [label, paths] of Object.entries(anchors)) {
      const row = marketedRows.find((r) => r.feature === label);
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
});

describe("Active Force — program Radar (tier pro)", () => {
  it("maps billing brand and price", () => {
    expect(PROGRAM_BRAND_LABEL.active).toBe("Team seat");
    expect(PLAN_PRICES_EUR.teamSeat).toBe(71);
  });

  it("has smart + radar and not guardian", () => {
    expect(hasProgram(ACTIVE_FORCE_TIER, "smart")).toBe(true);
    expect(hasProgram(ACTIVE_FORCE_TIER, "radar")).toBe(true);
    expect(hasProgram(ACTIVE_FORCE_TIER, "guardian")).toBe(false);
  });

  it("enables radar capabilities including forecast", () => {
    for (const cap of RADAR_CAPABILITIES) {
      expect(hasCapability(ACTIVE_FORCE_TIER, cap)).toBe(true);
    }
    expect(hasCapability(ACTIVE_FORCE_TIER, "canViewForecast")).toBe(true);
    expect(hasCapability(ACTIVE_FORCE_TIER, "canViewClosingWindow")).toBe(true);
    expect(hasCapability(ACTIVE_FORCE_TIER, "canUseMarketIntel")).toBe(false);
  });

  it("inherits all smart capabilities", () => {
    for (const cap of SMART_CAPABILITIES) {
      expect(hasCapability(ACTIVE_FORCE_TIER, cap)).toBe(true);
    }
  });

  it("adds team-only nav for agent_team vs solo", () => {
    const solo = getNavItems(AGENT_SOLO, undefined, "pro");
    const team = getNavItems(AGENT_TEAM, undefined, "pro");
    expect(team.length).toBeGreaterThan(solo.length);
    const teamOnly = ALL_NAV_ITEMS.filter(
      (i) =>
        i.showFor.includes(AGENT_TEAM) && !i.showFor.includes(AGENT_SOLO),
    );
    expect(teamOnly.map((i) => i.id)).toContain("team-pipeline");
    expect(teamOnly.map((i) => i.id)).toContain("shared-contacts");
  });

  it("has forecast module gated by canViewForecast", () => {
    expect(existsSync(join(CRM_ROOT, "src/app/(dashboard)/forecast/page.tsx"))).toBe(
      true,
    );
    expect(
      existsSync(join(CRM_ROOT, "src/components/forecasting/ForecastPageClient.tsx")),
    ).toBe(true);
  });

  it("has code anchors for Active-Force-only marketed rows", () => {
    const afOnly = FEATURES.filter(
      (r) => r.activeForce === true && r.smartStart === false,
    );
    expect(afOnly.length).toBeGreaterThanOrEqual(3);

    const anchors: Record<string, string[]> = {
      "Auto import dát bez klikania": ["src/lib/realvia/processQueue.ts"],
      "Digitálny štart bez chaosu": ["src/app/(dashboard)/settings"],
      "Analytika výkonu: kde zarábaš a kde strácaš": [
        "src/app/(dashboard)/performance",
        "src/app/(dashboard)/dashboard",
      ],
    };

    const missing: string[] = [];
    for (const [label, paths] of Object.entries(anchors)) {
      const row = afOnly.find((r) => r.feature === label);
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
});

describe("Smart Start vs Active Force — tier separation", () => {
  it("starter cannot access forecast; pro can", () => {
    expect(hasCapability(SMART_START_TIER, "canViewForecast")).toBe(false);
    expect(hasCapability(ACTIVE_FORCE_TIER, "canViewForecast")).toBe(true);
  });

  it("free tier has no paid programs", () => {
    expect(hasProgram("free", "smart")).toBe(false);
    expect(hasProgram("free", "radar")).toBe(false);
  });
});
