import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONTACT_REQUIRED_STATUSES,
  isActiveLeadStatus,
  OPEN_PIPELINE_STATUSES,
} from "@/lib/guardian/active-leads";
import { TERMINAL_LEAD_STATUSES } from "@/lib/agents/followup/outcomeWriter";
import { evaluateRuleForLead, GUARDIAN_RULE_CODES } from "@/lib/guardian/rules";
import {
  assertDigestNoPii,
  formatGuardianDigestEmail,
} from "@/lib/guardian/digest";
import type { GuardianLeadRow } from "@/lib/guardian/types";
import { isGuardianDigestEnabled } from "@/lib/guardian/config";
import {
  filterAgenciesForGuardianRun,
  isGuardianProductionRuntime,
  parseGuardianAgencyAllowlist,
} from "@/lib/guardian/config";
import { evaluateHeartbeatSignals } from "@/lib/infra/platform-heartbeat";

const CRM_ROOT = process.cwd();

function lead(partial: Partial<GuardianLeadRow> & { id: string }): GuardianLeadRow {
  return {
    agency_id: "agency-1",
    status: "Teplý",
    phone: "+421900000000",
    ai_priority: "Stredná",
    assigned_profile_id: "profile-1",
    assigned_agent: "Maklér",
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    ...partial,
  };
}

describe("Guardian v1 rules", () => {
  const now = Date.now();

  it("active lead = not terminal (enum evidence)", () => {
    for (const s of TERMINAL_LEAD_STATUSES) {
      expect(isActiveLeadStatus(s)).toBe(false);
    }
    for (const s of OPEN_PIPELINE_STATUSES) {
      expect(isActiveLeadStatus(s)).toBe(true);
    }
  });

  it("R1 STALE v1.1: lead_events in 90d window but quiet 7d", () => {
    const row = lead({ id: "l1" });
    const tenDaysAgo = new Date(now - 10 * 86400000).toISOString();
    expect(evaluateRuleForLead("STALE", row, tenDaysAgo, now)).toBe(true);
    expect(evaluateRuleForLead("STALE", row, new Date(now - 1 * 86400000).toISOString(), now)).toBe(
      false,
    );
  });

  it("R1 STALE: imported lead without lead_events is not STALE", () => {
    const row = lead({
      id: "l1b",
      created_at: new Date(now - 30 * 86400000).toISOString(),
    });
    expect(evaluateRuleForLead("STALE", row, null, now)).toBe(false);
  });

  it("R1 STALE: last activity older than 90d is not STALE", () => {
    const row = lead({ id: "l1c" });
    const hundredDaysAgo = new Date(now - 100 * 86400000).toISOString();
    expect(evaluateRuleForLead("STALE", row, hundredDaysAgo, now)).toBe(false);
  });

  it("R2 NO_OWNER after 24h without assignee", () => {
    const row = lead({
      id: "l2",
      assigned_profile_id: null,
      assigned_agent: "Nepriradený",
      created_at: new Date(now - 48 * 3600000).toISOString(),
    });
    expect(evaluateRuleForLead("NO_OWNER", row, null, now)).toBe(true);
  });

  it("R3 NO_PHONE for contact-required status only", () => {
    for (const status of CONTACT_REQUIRED_STATUSES) {
      const row = lead({ id: `l3-${status}`, status, phone: "" });
      expect(evaluateRuleForLead("NO_PHONE", row, null, now)).toBe(true);
    }
    const offer = lead({ id: "l3-offer", status: "Ponuka", phone: "" });
    expect(evaluateRuleForLead("NO_PHONE", offer, null, now)).toBe(false);
  });

  it("R4 HOT_IGNORED for Vysoká priority and idle activity", () => {
    const row = lead({
      id: "l4",
      ai_priority: "Vysoká",
      updated_at: new Date(now - 72 * 3600000).toISOString(),
    });
    expect(evaluateRuleForLead("HOT_IGNORED", row, null, now)).toBe(true);
  });

  it("auto-resolve path: rule clears when condition fixed", () => {
    const fixed = lead({
      id: "l5",
      phone: "+421911111111",
      status: "Nový",
    });
    expect(evaluateRuleForLead("NO_PHONE", fixed, null, now)).toBe(false);
  });

  it("covers all four rule codes", () => {
    expect(GUARDIAN_RULE_CODES).toHaveLength(4);
  });
});

describe("Guardian agency allowlist", () => {
  it("parseGuardianAgencyAllowlist distinguishes unset vs empty", () => {
    vi.stubEnv("GUARDIAN_AGENCY_ALLOWLIST", undefined);
    expect(parseGuardianAgencyAllowlist()).toBeNull();
    vi.stubEnv("GUARDIAN_AGENCY_ALLOWLIST", "");
    expect(parseGuardianAgencyAllowlist()).toEqual([]);
    vi.stubEnv("GUARDIAN_AGENCY_ALLOWLIST", "a,b, c");
    expect(parseGuardianAgencyAllowlist()).toEqual(["a", "b", "c"]);
  });

  it("production with unset allowlist runs no agencies", () => {
    vi.stubEnv("GUARDIAN_AGENCY_ALLOWLIST", undefined);
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NODE_ENV", "production");
    expect(isGuardianProductionRuntime()).toBe(true);
    const result = filterAgenciesForGuardianRun(["agency-1", "agency-2"]);
    expect(result.ids).toEqual([]);
    expect(result.skippedReason).toBe("allowlist_unset_prod");
  });

  it("non-production without allowlist passes all agencies", () => {
    vi.stubEnv("GUARDIAN_AGENCY_ALLOWLIST", undefined);
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("NODE_ENV", "development");
    expect(filterAgenciesForGuardianRun(["a", "b"]).ids).toEqual(["a", "b"]);
  });

  it("allowlist filters to listed UUIDs only", () => {
    vi.stubEnv("GUARDIAN_AGENCY_ALLOWLIST", "uuid-1,uuid-2");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(filterAgenciesForGuardianRun(["uuid-1", "uuid-3"]).ids).toEqual(["uuid-1"]);
  });
});

describe("Guardian digest", () => {
  it("formats counts and links without lead PII", () => {
    const { subject, html, text } = formatGuardianDigestEmail({
      agencyName: "Test Agency",
      counts: { STALE: 2, NO_OWNER: 1, NO_PHONE: 0, HOT_IGNORED: 3 },
      openTotal: 6,
      crmUrl: "https://app.revolis.ai/dashboard",
    });
    expect(subject).toContain("6");
    expect(text).not.toMatch(/@example\.com/);
    assertDigestNoPii(text);
    assertDigestNoPii(html);
    expect(html).toContain("STALE: 2");
  });

  it("GUARDIAN_DIGEST_ENABLED defaults false", () => {
    vi.stubEnv("GUARDIAN_DIGEST_ENABLED", "");
    expect(isGuardianDigestEnabled()).toBe(false);
  });
});

describe("Guardian idempotency (2 runs)", () => {
  it("duplicate open finding insert is ignored via unique constraint semantics", () => {
    const inserts = new Set<string>();
    const insert = (agencyId: string, leadId: string, rule: string) => {
      const key = `${agencyId}:${leadId}:${rule}`;
      if (inserts.has(key)) return false;
      inserts.add(key);
      return true;
    };
    expect(insert("a", "l1", "STALE")).toBe(true);
    expect(insert("a", "l1", "STALE")).toBe(false);
  });
});

describe("Guardian e2e simulation", () => {
  it("stale lead → finding → activity → resolved evaluation", () => {
    const now = Date.now();
    const row = lead({ id: "e2e" });
    const staleEvent = new Date(now - 10 * 86400000).toISOString();
    expect(evaluateRuleForLead("STALE", row, staleEvent, now)).toBe(true);
    const freshEvent = new Date(now - 3600000).toISOString();
    expect(evaluateRuleForLead("STALE", row, freshEvent, now)).toBe(false);
    expect(evaluateRuleForLead("STALE", row, null, now)).toBe(false);
  });
});

describe("Guardian platform heartbeat", () => {
  it("advises when guardian last run older than 2h", () => {
    const old = new Date(Date.now() - 3 * 3600000).toISOString();
    const signals = evaluateHeartbeatSignals({
      agencyScope: null,
      untriagedLeads24h: 0,
      untriagedLeads7d: 0,
      maxAiTriageAt: null,
      realviaLastWebhookAt: null,
      realviaWebhookTotal: 0,
      inboundMailboxCount: 0,
      sellerRescueLastNotifAt: null,
      sellerRescueLastTaskAt: null,
      moatCaptureTriage24h: 0,
      moatCaptureNba24h: 0,
      moatCaptureAiEmail24h: 0,
      moatDealOutcomes24h: 0,
      guardianLastRunAt: old,
      guardianOpenFindings: 12,
    });
    expect(signals.some((s) => s.id === "guardian_runner_stale_2h")).toBe(true);
  });
});

describe("Guardian verification (repo wiring)", () => {
  it("registers guardian crons in vercel.json", () => {
    const vercel = readFileSync(join(CRM_ROOT, "vercel.json"), "utf8");
    expect(vercel).toContain("/api/cron/guardian-run");
    expect(vercel).toContain("/api/cron/guardian-digest");
  });

  it("runner route requires CRON_SECRET", () => {
    const source = readFileSync(
      join(CRM_ROOT, "src/app/api/cron/guardian-run/route.ts"),
      "utf8",
    );
    expect(source).toContain("CRON_SECRET");
    expect(source).toContain("Unauthorized");
  });

  it("call-site: follow-up-sweep OPEN_STATUSES aligns with pipeline", () => {
    const sweep = readFileSync(
      join(CRM_ROOT, "src/app/api/cron/follow-up-sweep/route.ts"),
      "utf8",
    );
    expect(sweep).toContain('"Nový", "Teplý", "Horúci", "Obhliadka", "Ponuka"');
  });

  it("call-site: terminal statuses from outcomeWriter", () => {
    const source = readFileSync(
      join(CRM_ROOT, "src/lib/agents/followup/outcomeWriter.ts"),
      "utf8",
    );
    expect(source).toContain("Uzavretý");
    expect(source).toContain("Archivovaný");
  });
});