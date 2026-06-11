import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateDirectorBrief } from "@/lib/morning-brief/director-brief";

function mockDirectorSupabase(opts: {
  newLeads?: number;
  pipeline?: { budget: string | number; status: string }[];
  criticalLead?: { leadName: string; riskReason: string };
}) {
  let leadsCall = 0;
  const chain = {
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: opts.criticalLead
        ? [{ title: "crit", data: { leads: [opts.criticalLead] } }]
        : [],
      error: null,
    }),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "leads") {
        leadsCall += 1;
        if (leadsCall === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({ count: opts.newLeads ?? 4, error: null }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: opts.pipeline ?? [
                { budget: "350000", status: "Horúci" },
                { budget: "1200000", status: "Uzavretý" },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === "routine_notifications") {
        return { select: vi.fn().mockReturnValue(chain) };
      }
      return { select: vi.fn().mockReturnValue(chain) };
    }),
  } as unknown as SupabaseClient;
}

describe("[verification] CEO Command director brief", () => {
  it("renders executive briefing with pipeline and new leads", async () => {
    const brief = await generateDirectorBrief("agency-1", mockDirectorSupabase({ newLeads: 6 }));
    expect(brief).toContain("RIADITEĽSKÝ BRÍFING");
    expect(brief).toContain("Pipeline:");
    expect(brief).toContain("Nové leady (24h): 6");
  });

  it("surfaces critical seller_rescue risk at top", async () => {
    const brief = await generateDirectorBrief(
      "agency-1",
      mockDirectorSupabase({
        criticalLead: { leadName: "Kováč", riskReason: "21 dní bez kontaktu" },
      }),
    );
    expect(brief).toContain("URGENT: Kováč");
    expect(brief).toContain("TOP AKCIA: Zavolaj Kováč dnes");
  });
});
