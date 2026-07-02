import { describe, expect, it, vi, beforeEach } from "vitest";
import type { GatheredData } from "@/lib/morning-brief/gather";

const emailsSendMock = vi.fn().mockResolvedValue({ id: "email-1" });
const briefInsertPayloads: Record<string, unknown>[] = [];

vi.mock("resend", () => ({
  Resend: class MockResend {
    emails = { send: emailsSendMock };
  },
}));

vi.mock("@/lib/ai/claude", () => ({
  CLAUDE_HAIKU: "claude-haiku-test",
  callClaude: vi.fn(async (_params: unknown, tag?: string) => ({
    content: [
      {
        type: "text",
        text:
          tag === "brief-subject"
            ? "Elena Horizonová · BRI 91/100"
            : "DNEŠNÉ ČÍSLA: 7 leadov čaká na kontakt. TOP PRIORITA: Elena Horizonová (BRI 91). Pipeline agentúry 892 000 €. Zavolajte Elene pred 10:00.",
      },
    ],
    usage: { input_tokens: 10, output_tokens: 40 },
    stop_reason: "end_turn",
  })),
}));

function mockAdminSupabase() {
  return {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { role: "agent", ui_role: null, agency_id: null },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "morning_briefs") {
        return {
          insert: vi.fn((row: Record<string, unknown>) => {
            briefInsertPayloads.push(row);
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: row.id }, error: null }),
              }),
            };
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "morning_brief_settings") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }) };
    }),
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(() => mockAdminSupabase()),
}));

vi.mock("@/lib/morning-brief/gather", () => ({
  gatherBriefData: vi.fn(),
}));

import { buildDeliveryFallbackText, generateBriefText } from "@/lib/morning-brief/generators/ai-text";
import { generateAndDeliverBrief } from "@/lib/morning-brief/assemble";
import { renderBriefEmail } from "@/lib/morning-brief/generators/email-html";
import { gatherBriefData } from "@/lib/morning-brief/gather";

function seedGathered(): GatheredData {
  return {
    settings: {
      profile_id: "profile-smolko",
      channels: ["email"],
      a_b_variant: "A",
      lead_count: 5,
      enabled: true,
      delivery_hour_utc: 6,
      delivery_minute_utc: 0,
      language: "sk",
      include_lv_changes: true,
      include_arbitrage: false,
      include_price_drops: true,
      include_team_stats: false,
      push_subscription: null,
      updated_at: new Date().toISOString(),
    },
    ownerName: "Rastislav Smolko",
    ownerEmail: "rastislav.smolko@gmail.com",
    hotLeads: [
      {
        lead_id: "lead-elena",
        full_name: "Elena Horizonová",
        bri_score: 91,
        phone: "+421900111222",
        recency_score: 85,
        engagement_score: 78,
        source_score: 70,
        trajectory: "rising",
      } as GatheredData["hotLeads"][number],
    ],
    overnight: {
      newLeads: 2,
      lvChanges: [],
      arbitrage: [],
      priceDrops: [],
      replies: [],
    },
    stats: {
      hotLeads: 1,
      activeLeads: 7,
      newInquiries: 2,
      scoreIncreases: 0,
      weeklyRevForecast: null,
      pendingContact: 7,
      hotPending: 1,
      staleContacts48h: 2,
      pipelineValueEur: 892_000,
      priorityLeadNames: ["Elena Horizonová"],
      priceDropCount: 0,
    },
  };
}

function minimalGathered(overrides: Partial<GatheredData["stats"]> = {}): GatheredData {
  return {
    ...seedGathered(),
    stats: { ...seedGathered().stats, ...overrides },
  };
}

describe("[verification] Morning Brief backend", () => {
  beforeEach(() => {
    emailsSendMock.mockClear();
    briefInsertPayloads.length = 0;
    vi.mocked(gatherBriefData).mockResolvedValue(seedGathered());
    process.env.RESEND_API_KEY = "re_test_key";
  });

  it("builds deterministic delivery fallback when AI text is empty", () => {
    const text = buildDeliveryFallbackText(minimalGathered(), 2);
    expect(text).toContain("2 HOT leadov");
    expect(text).toContain("48h");
    expect(text).toContain("/leads");
  });

  it("includes stale contact count from gathered stats", () => {
    const text = buildDeliveryFallbackText(minimalGathered({ staleContacts48h: 5 }), 0);
    expect(text).toContain("5");
  });

  it("generateBriefText uses LLM branch when Claude responds", async () => {
    const result = await generateBriefText(seedGathered(), "A");
    expect(result.contentSource).toBe("llm");
    expect(result.fallbackReason).toBeNull();
    expect(result.aiText).toContain("Elena Horizonová");
    expect(result.aiText).toContain("892 000");
    expect(result.subjectLine).toContain("Elena Horizonová");
  });

  it("E2E gather→assemble→send uses LLM path and agency seed data in email", async () => {
    const result = await generateAndDeliverBrief("profile-smolko");

    expect(result?.delivered).toBe(true);
    expect(result?.channels).toContain("email");
    expect(emailsSendMock).toHaveBeenCalledOnce();

    const sent = emailsSendMock.mock.calls[0]?.[0] as { html: string; subject: string; to: string };
    expect(sent.to).toBe("rastislav.smolko@gmail.com");
    expect(sent.html).toContain("Elena Horizonová");
    expect(sent.html).toContain("892 000");
    expect(sent.html).not.toContain("Systém momentálne generuje");
    expect(sent.html).not.toContain("🌅 Dobré ráno!");

    const inserted = briefInsertPayloads[0];
    expect(inserted?.content_source).toBe("llm");
    expect(inserted?.content_source_reason).toBeNull();
    expect(inserted?.brief_text).toContain("Elena Horizonová");
  });

  it("renderBriefEmail embeds LLM aiText not template delivery fallback", () => {
    const gathered = seedGathered();
    const html = renderBriefEmail({
      briefId: "brief-1",
      profileId: "profile-smolko",
      generatedAt: new Date().toISOString(),
      topLead: {
        id: "lead-elena",
        name: "Elena Horizonová",
        score: 91,
        trajectory: "rising",
        reason: "BRI na historickom maxime",
        lastAction: "Aktívny v pipeline",
        phone: "+421900111222",
        email: null,
        property: null,
      },
      overnight: {
        totalChanges: 2,
        newLeads: 2,
        lvChanges: [],
        arbitrage: [],
        priceDrops: [],
        replies: [],
      },
      action: {
        verb: "Zavolajte",
        target: "Elena Horizonová",
        context: "Zavolajte Elene pred 10:00.",
        deepLink: "https://app.revolis.ai/leads/lead-elena",
        urgency: "high",
      },
      stats: gathered.stats,
      aiText:
        "DNEŠNÉ ČÍSLA: 7 leadov čaká na kontakt. TOP PRIORITA: Elena Horizonová (BRI 91). Pipeline agentúry 892 000 €.",
      subjectLine: "Elena Horizonová · BRI 91/100",
      variant: "A",
    });

    expect(html).toContain("892 000");
    expect(html).not.toContain("personalizovaný brief");
  });
});
