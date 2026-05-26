import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { hasCapability } from "@/lib/license/capability-registry";

const CRM_ROOT = join(process.cwd());
const APP_ROOT = join(CRM_ROOT, "src", "app");
const DASHBOARD_ROOT = join(APP_ROOT, "(dashboard)");
const API_AI_ROOT = join(APP_ROOT, "api", "ai");

export type AiFeatureSpec = {
  id: string;
  label: string;
  category: string;
  paths: string[];
  uiRoute?: string;
  apiRoute?: string;
};

/** Kanonický inventár AI features Revolis CRM — rozšír pri novom module. */
export const REVOLIS_AI_FEATURE_REGISTRY: AiFeatureSpec[] = [
  // ── Core engine ──
  {
    id: "ai-engine",
    label: "AI decision engine",
    category: "core",
    paths: ["src/lib/ai/engine.ts", "src/lib/ai/fallback.ts", "src/lib/ai/multi-model.ts"],
  },
  {
    id: "ai-scoring-engine",
    label: "BRI / lead scoring engine",
    category: "scoring",
    paths: ["src/lib/ai/scoring-engine.ts", "src/lib/ai-scoring-store.ts", "src/lib/ai-scoring.ts"],
    uiRoute: "/scoring",
    apiRoute: "/api/scoring/recalculate",
  },
  {
    id: "sales-brain",
    label: "Sales Brain (lead detail)",
    category: "scoring",
    paths: ["src/lib/ai/sales-brain.ts", "src/components/leads/sales-brain-panel.tsx"],
    uiRoute: "/leads",
  },
  {
    id: "bri-stream",
    label: "BRI live stream",
    category: "scoring",
    paths: ["src/app/api/ai/bri-stream/route.ts", "src/components/revolis/BriLivePulse.tsx"],
    apiRoute: "/api/ai/bri-stream",
  },
  // ── Matching & recommendations ──
  {
    id: "matching-engine",
    label: "Lead ↔ property matching",
    category: "matching",
    paths: ["src/lib/ai/matching-engine.ts", "src/lib/matching-store.ts", "src/lib/matching.ts"],
    uiRoute: "/matching",
    apiRoute: "/api/matching/recalculate",
  },
  {
    id: "recommendations",
    label: "AI odporúčania (persistované)",
    category: "recommendations",
    paths: ["src/lib/recommendations-store.ts", "src/lib/recommendations-engine.ts"],
    uiRoute: "/recommendations",
    apiRoute: "/api/recommendations/recalculate",
  },
  // ── Call & voice AI ──
  {
    id: "call-analyzer",
    label: "Analýza hovorov (UI)",
    category: "calls",
    paths: ["src/app/(dashboard)/call-analyzer/page.tsx", "src/lib/ai/call-analysis.ts"],
    uiRoute: "/call-analyzer",
  },
  {
    id: "call-transcribe",
    label: "Call transcribe",
    category: "calls",
    paths: ["src/app/api/ai/call/transcribe/route.ts", "src/lib/ai/call-transcript.ts"],
    apiRoute: "/api/ai/call/transcribe",
  },
  {
    id: "call-analyze",
    label: "Call analyze",
    category: "calls",
    paths: ["src/app/api/ai/call/analyze/route.ts"],
    apiRoute: "/api/ai/call/analyze",
  },
  {
    id: "call-coach-stream",
    label: "Call coach stream",
    category: "calls",
    paths: ["src/app/api/ai/call-coach/stream/route.ts", "src/lib/ai/call-coach.ts"],
    apiRoute: "/api/ai/call-coach/stream",
  },
  // ── Revolis AI hub ──
  {
    id: "revolis-ai-page",
    label: "Revolis AI asistent",
    category: "hub",
    paths: [
      "src/app/(dashboard)/revolis-ai/page.tsx",
      "src/app/(dashboard)/revolis-ai/RevolisAIClient.tsx",
    ],
    uiRoute: "/revolis-ai",
  },
  {
    id: "ai-insights",
    label: "AI insights API",
    category: "hub",
    paths: ["src/app/api/ai/insights/route.ts"],
    apiRoute: "/api/ai/insights",
  },
  {
    id: "listing-content",
    label: "AI listing content",
    category: "content",
    paths: [
      "src/lib/ai/listing-content.ts",
      "src/app/api/ai/listing-content/route.ts",
    ],
    apiRoute: "/api/ai/listing-content",
  },
  {
    id: "listing-content-stream",
    label: "AI listing content (stream)",
    category: "content",
    paths: ["src/app/api/ai/listing-content/stream/route.ts"],
    apiRoute: "/api/ai/listing-content/stream",
  },
  {
    id: "micro-actions-schedule",
    label: "AI micro-actions schedule",
    category: "automation",
    paths: ["src/app/api/ai/micro-actions/schedule/route.ts"],
    apiRoute: "/api/ai/micro-actions/schedule",
  },
  // ── Forecast & decision ──
  {
    id: "monthly-forecast",
    label: "AI monthly forecast",
    category: "forecast",
    paths: ["src/app/api/ai/monthly-forecast/route.ts", "src/lib/ai/forecast-money.ts"],
    apiRoute: "/api/ai/monthly-forecast",
  },
  {
    id: "closing-window",
    label: "Closing window recompute",
    category: "forecast",
    paths: ["src/app/api/ai/closing-window/recompute/route.ts", "src/lib/ai/time-to-close.ts"],
    apiRoute: "/api/ai/closing-window/recompute",
  },
  {
    id: "score-lead",
    label: "Decision score lead",
    category: "decision",
    paths: ["src/app/api/ai/decision/score-lead/route.ts"],
    apiRoute: "/api/ai/decision/score-lead",
  },
  {
    id: "decision-recompute-queue",
    label: "Decision recompute queue",
    category: "decision",
    paths: ["src/app/api/ai/decision/recompute-queue/route.ts"],
    apiRoute: "/api/ai/decision/recompute-queue",
  },
  {
    id: "lead-events",
    label: "AI lead events stream",
    category: "decision",
    paths: ["src/app/api/ai/lead-events/route.ts"],
    apiRoute: "/api/ai/lead-events",
  },
  {
    id: "process-lead",
    label: "Process lead (AI triage)",
    category: "decision",
    paths: ["src/app/api/ai/process-lead/route.ts", "src/lib/ai/lead-triage-batch.ts"],
    apiRoute: "/api/ai/process-lead",
  },
  // ── Autopilot & automation ──
  {
    id: "autopilot",
    label: "AI autopilot run",
    category: "automation",
    paths: ["src/app/api/ai/autopilot/run/route.ts", "src/lib/ai/autopilot-runner.ts"],
    apiRoute: "/api/ai/autopilot/run",
  },
  {
    id: "rescue",
    label: "Rescue deal automation",
    category: "automation",
    paths: ["src/app/api/ai/rescue/trigger/route.ts", "src/lib/ai/rescue-message.ts"],
    apiRoute: "/api/ai/rescue/trigger",
  },
  {
    id: "dead-lead-campaign",
    label: "Dead lead campaign",
    category: "automation",
    paths: ["src/app/api/ai/dead-lead-campaign/route.ts", "src/lib/ai/dead-lead-campaign.ts"],
    apiRoute: "/api/ai/dead-lead-campaign",
  },
  // ── Search & embeddings ──
  {
    id: "semantic-search",
    label: "Semantic search",
    category: "search",
    paths: ["src/app/api/search/semantic/route.ts", "src/lib/embeddings.ts"],
    apiRoute: "/api/search/semantic",
  },
  {
    id: "embeddings-index",
    label: "Embeddings index / backfill",
    category: "search",
    paths: [
      "src/app/api/embeddings/index/route.ts",
      "src/app/api/embeddings/backfill/route.ts",
    ],
    apiRoute: "/api/embeddings/index",
  },
  // ── Dashboard & coaching ──
  {
    id: "dashboard-insights",
    label: "Dashboard AI insights",
    category: "dashboard",
    paths: [
      "src/app/api/dashboard/insights/route.ts",
      "src/components/dashboard/AiInsightsPanel.tsx",
      "src/components/dashboard/DailyActionPanel.tsx",
    ],
    apiRoute: "/api/dashboard/insights",
  },
  {
    id: "deal-strategy",
    label: "Deal strategy (lead)",
    category: "dashboard",
    paths: ["src/lib/ai/deal-strategy.ts", "src/components/leads/deal-strategy-card.tsx"],
    apiRoute: "/api/leads",
  },
  {
    id: "nexus-chat-settings",
    label: "Nexus AI chat settings",
    category: "settings",
    paths: [
      "src/app/(dashboard)/settings/nexus-ai-chat/page.tsx",
      "src/lib/nexus-chat-settings.ts",
    ],
    uiRoute: "/settings/nexus-ai-chat",
  },
  // ── Cron (background AI) ──
  {
    id: "cron-daily-match",
    label: "Cron daily match",
    category: "cron",
    paths: ["src/app/api/cron/daily-match/route.ts"],
    apiRoute: "/api/cron/daily-match",
  },
  {
    id: "cron-lead-triage",
    label: "Cron lead AI triage",
    category: "cron",
    paths: ["src/app/api/cron/lead-ai-triage/route.ts"],
    apiRoute: "/api/cron/lead-ai-triage",
  },
  {
    id: "cron-morning-brief",
    label: "Cron morning brief",
    category: "cron",
    paths: ["src/app/api/cron/morning-brief/route.ts", "src/lib/ai/playbook-brief.ts"],
    apiRoute: "/api/cron/morning-brief",
  },
];

function pathExists(rel: string): boolean {
  const full = join(CRM_ROOT, rel);
  return existsSync(full);
}

function routePageExists(uiRoute: string): boolean {
  const segments = uiRoute.replace(/^\//, "").split("/").filter(Boolean);
  return existsSync(join(DASHBOARD_ROOT, ...segments, "page.tsx"));
}

function collectApiAiRoutes(): string[] {
  if (!existsSync(API_AI_ROOT)) return [];
  const routes: string[] = [];
  function walk(dir: string, prefix: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const next = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(next, `${prefix}/${entry.name}`);
      } else if (entry.name === "route.ts") {
        routes.push(`/api/ai${prefix}`);
      }
    }
  }
  walk(API_AI_ROOT, "");
  return routes.sort();
}

describe("Revolis.AI — feature registry completeness", () => {
  it("defines at least 25 AI feature specs", () => {
    expect(REVOLIS_AI_FEATURE_REGISTRY.length).toBeGreaterThanOrEqual(25);
  });

  it("every registered feature has at least one existing path", () => {
    const missing: string[] = [];
    for (const feature of REVOLIS_AI_FEATURE_REGISTRY) {
      const ok = feature.paths.some((p) => pathExists(p));
      if (!ok) {
        missing.push(`${feature.id}: ${feature.paths.join(", ")}`);
      }
    }
    expect(missing, missing.join("\n")).toEqual([]);
  });

  it("UI routes resolve to dashboard pages when declared", () => {
    const missing: string[] = [];
    for (const feature of REVOLIS_AI_FEATURE_REGISTRY) {
      if (!feature.uiRoute) continue;
      if (!routePageExists(feature.uiRoute)) {
        missing.push(`${feature.id} → ${feature.uiRoute}`);
      }
    }
    expect(missing, missing.join("\n")).toEqual([]);
  });

  it("API routes under /api/ai are covered by registry or filesystem", () => {
    const discovered = collectApiAiRoutes();
    expect(discovered.length).toBeGreaterThanOrEqual(15);

    const registeredApis = new Set(
      REVOLIS_AI_FEATURE_REGISTRY.map((f) => f.apiRoute).filter(Boolean),
    );
    const uncovered = discovered.filter((r) => !registeredApis.has(r));
    expect(
      uncovered,
      `Add to REVOLIS_AI_FEATURE_REGISTRY: ${uncovered.join(", ")}`,
    ).toEqual([]);
  });

  it("each /api/ai route file exports an HTTP handler", () => {
    const broken: string[] = [];
    for (const route of collectApiAiRoutes()) {
      const rel = `src/app${route}/route.ts`;
      const full = join(CRM_ROOT, rel);
      if (!existsSync(full)) {
        broken.push(rel);
        continue;
      }
      const src = readFileSync(full, "utf8");
      if (!/export async function (GET|POST|PUT|PATCH|DELETE)/.test(src)) {
        broken.push(`${rel} (no handler export)`);
      }
    }
    expect(broken, broken.join("\n")).toEqual([]);
  });
});

describe("Revolis.AI — license gates for AI surfaces", () => {
  it("canUseAiTasks available from Smart Start (starter)", () => {
    expect(hasCapability("starter", "canUseAiTasks")).toBe(true);
    expect(hasCapability("free", "canUseAiTasks")).toBe(false);
  });

  it("forecast AI surfaces require Active Force (pro) or above", () => {
    expect(hasCapability("starter", "canViewForecast")).toBe(false);
    expect(hasCapability("pro", "canViewForecast")).toBe(true);
  });

  it("market intel AI requires Market Vision or Protocol", () => {
    expect(hasCapability("pro", "canUseMarketIntel")).toBe(false);
    expect(hasCapability("market_vision", "canUseMarketIntel")).toBe(true);
    expect(hasCapability("protocol_authority", "canUseMarketIntel")).toBe(true);
  });

  it("rescue automation requires guardian tier", () => {
    expect(hasCapability("pro", "canUseRescueAutomation")).toBe(false);
    expect(hasCapability("market_vision", "canUseRescueAutomation")).toBe(true);
  });
});

describe("Revolis.AI — smoke & QA hooks", () => {
  it("exposes system smoke tests for AI data loads", () => {
    const smoke = join(CRM_ROOT, "src/lib/smoke-tests.ts");
    const src = readFileSync(smoke, "utf8");
    expect(src).toContain("listPersistedMatches");
    expect(src).toContain("listRecommendations");
  });

  it("QA checklist documents matching and recommendations", () => {
    const qa = join(CRM_ROOT, "src/components/qa/qa-checklist.tsx");
    const src = readFileSync(qa, "utf8");
    expect(src).toContain("/matching");
    expect(src).toContain("/recommendations");
  });
});

describe("Revolis.AI — categories coverage", () => {
  const requiredCategories = [
    "core",
    "scoring",
    "matching",
    "recommendations",
    "calls",
    "hub",
    "forecast",
    "automation",
    "search",
    "dashboard",
    "cron",
  ];

  it("spans all major AI categories", () => {
    const present = new Set(REVOLIS_AI_FEATURE_REGISTRY.map((f) => f.category));
    for (const cat of requiredCategories) {
      expect(present.has(cat)).toBe(true);
    }
  });
});
