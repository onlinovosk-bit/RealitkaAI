import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildFirstAudit } from "@/lib/workdesk/first-audit";
import { OUTCOME } from "@/lib/copy/outcome-copy";
import { getNextSlug, SHORT_PATH_SLUGS } from "@/app/onboarding/config";
import type { Lead } from "@/lib/leads-store";

const CRM_ROOT = process.cwd();

function lead(partial: Partial<Lead> & Pick<Lead, "id" | "name">): Lead {
  return {
    id: partial.id,
    name: partial.name,
    email: partial.email ?? "",
    phone: partial.phone ?? "",
    location: partial.location ?? "",
    budget: partial.budget ?? "",
    propertyType: partial.propertyType ?? "Byt",
    rooms: partial.rooms ?? "2",
    financing: partial.financing ?? "Hypotéka",
    timeline: partial.timeline ?? "Ihneď",
    source: partial.source ?? "Web",
    status: partial.status ?? "Nový",
    score: partial.score ?? 50,
    assignedAgent: partial.assignedAgent ?? "",
    lastContact: partial.lastContact ?? "Bez kontaktu",
    note: partial.note ?? "",
    createdAt: partial.createdAt,
    aiPriority: partial.aiPriority ?? null,
    aiReason: partial.aiReason ?? null,
  };
}

describe("First audit / outcome workdesk", () => {
  it("returns empty quality and no fake commission for zero leads", () => {
    const audit = buildFirstAudit([]);
    expect(audit.dataQuality).toBe("empty");
    expect(audit.leadCount).toBe(0);
    expect(audit.commissionEstimateEur).toBeNull();
    expect(audit.atRiskCommissionEur).toBeNull();
    expect(audit.forgottenLeads).toBe(0);
  });

  it("counts stale leads and estimates commission only when budget exists", () => {
    const audit = buildFirstAudit(
      [
        lead({
          id: "1",
          name: "A",
          status: "Horúci",
          score: 90,
          budget: "200000",
          lastContact: "Bez kontaktu",
        }),
        lead({
          id: "2",
          name: "B",
          status: "Teplý",
          score: 40,
          budget: "",
          lastContact: "Bez kontaktu",
        }),
      ],
      { staleDays: 7 },
    );

    expect(audit.forgottenLeads).toBe(2);
    expect(audit.atRiskDeals).toBeGreaterThanOrEqual(1);
    expect(audit.commissionEstimateEur).toBe(6000); // 3% of 200000
    expect(audit.topCallTargets.length).toBeGreaterThan(0);
    expect(audit.dataQuality).not.toBe("empty");
  });

  it("short onboarding path is vitaj → import → audit → hotovo", () => {
    expect([...SHORT_PATH_SLUGS]).toEqual([
      "step-1-vitaj",
      "step-5-import",
      "step-audit",
      "step-9-hotovo",
    ]);
    expect(getNextSlug("step-1-vitaj", "short")).toBe("step-5-import");
    expect(getNextSlug("step-5-import", "short")).toBe("step-audit");
    expect(getNextSlug("step-audit", "short")).toBe("step-9-hotovo");
  });

  it("outcome copy kit avoids AI-feature lead language", () => {
    expect(OUTCOME.heroHeadline.toLowerCase()).not.toContain("ai crm");
    expect(OUTCOME.startTodayCta.length).toBeGreaterThan(0);
  });

  it("dashboard hero has no demo lead placeholders", () => {
    const source = readFileSync(
      join(CRM_ROOT, "src/components/dashboard/WorkdeskCommandHero.tsx"),
      "utf8",
    );
    expect(source).not.toContain("Lucia Šimko");
    expect(source).not.toContain("demo-1");
    expect(source).toContain("start-today-cta");
  });

  it("dashboard KPIs do not hardcode fake money fallbacks", () => {
    const source = readFileSync(
      join(CRM_ROOT, "src/app/(dashboard)/dashboard/DashboardPageClient.tsx"),
      "utf8",
    );
    expect(source).not.toContain("€18.4k");
    expect(source).not.toContain("€124k");
    expect(source).toContain("buildFirstAudit");
    expect(source).toContain("today-focus");
  });

  it("landing/marketing no longer claims unverified +34%", () => {
    const files = [
      "src/app/(marketing)/landing/sections/TickerBanner.tsx",
      "src/app/(marketing)/landing/sections/ProofNumbers.tsx",
      "src/app/(marketing)/landing/sections/Hero.tsx",
      "src/components/billing/RoiCalculator.tsx",
    ];
    for (const rel of files) {
      const source = readFileSync(join(CRM_ROOT, rel), "utf8");
      expect(source).not.toContain("+34%");
      expect(source).not.toContain("CONVERSION_BOOST");
    }
  });
});
