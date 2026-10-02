import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadAgencyAutoResponseContext,
  runInboundLeadAutoResponse,
} from "@/lib/acquire/inbound-lead-auto-response";
import * as sendModule from "@/lib/acquire/send-inbound-auto-response";

vi.mock("@/lib/auto-error-capture", () => ({
  autoErrorCapture: vi.fn(),
}));

function agenciesMock(handlers: Record<string, unknown>) {
  return {
    from: (table: string) => {
      if (table !== "agencies") throw new Error(`unexpected table ${table}`);
      return {
        select: (cols: string) => ({
          eq: () => ({
            maybeSingle: async () => {
              const row = handlers[cols];
              if (typeof row === "function") return row(cols);
              return row ?? { data: null, error: { code: "42703", message: "column missing" } };
            },
          }),
        }),
      };
    },
  } as unknown as SupabaseClient;
}

describe("send-inbound-auto-response template", () => {
  it("builds Variant A SK plain-text without quoting inquiry", async () => {
    const { buildInboundAutoResponseText } = await import("@/lib/acquire/send-inbound-auto-response");
    const text = buildInboundAutoResponseText({
      to: "lead@example.com",
      leadName: "Ján",
      agencyName: "Reality Smolko",
      agencyPhone: "+421900000000",
      replyTo: "office@realitysmolko.sk",
      assignedAgent: "Demo Makler 1",
      aiPriority: "Vysoká",
      source: "portal:Nehnuteľnosti.sk",
    });

    expect(text).toContain("Dobrý deň, Ján");
    expect(text).toContain("váš dopyt z portálu Nehnuteľnosti.sk mi prišiel");
    expect(text).not.toContain("Viem, že hľadáte");
    expect(text).toContain("ozvem sa vám dnes");
    expect(text).toContain("Demo Makler 1");
    expect(text).not.toContain("ďakujeme za váš dopyt");
    expect(text).toContain("pokojne mi napíšte na office@realitysmolko.sk");
    expect(text).not.toContain("odpovedzte na tento e-mail");
  });

  it("formats From with agent display name and contact email", async () => {
    const { formatInboundFromAddress } = await import("@/lib/acquire/send-inbound-auto-response");
    expect(formatInboundFromAddress("AA Reality", "owner@revolis.ai")).toBe(
      "AA Reality <owner@revolis.ai>",
    );
  });

  it("uses agency reply-to as From on revolis.ai domain", async () => {
    const { resolveInboundFromEmail } = await import("@/lib/acquire/send-inbound-auto-response");
    expect(resolveInboundFromEmail("owner@revolis.ai")).toBe("owner@revolis.ai");
  });

  it("falls back to outreach sender for external reply-to", async () => {
    const prev = process.env.OUTREACH_FROM_EMAIL;
    process.env.OUTREACH_FROM_EMAIL = "Revolis <onboarding@mg.revolis.ai>";
    const { resolveInboundFromEmail } = await import("@/lib/acquire/send-inbound-auto-response");
    expect(resolveInboundFromEmail("makler@gmail.com")).toBe("onboarding@mg.revolis.ai");
    process.env.OUTREACH_FROM_EMAIL = prev;
  });
});

describe("loadAgencyAutoResponseContext", () => {
  it("defaults auto_response_enabled when column missing on prod", async () => {
    const supa = agenciesMock({
      name: { data: { name: "Reality Smolko" }, error: null },
      auto_response_enabled: { data: null, error: { code: "42703", message: "column missing" } },
      "email, phone": { data: null, error: { code: "42703", message: "column missing" } },
    });

    const ctx = await loadAgencyAutoResponseContext(supa, "agency-1");
    expect(ctx.agency?.name).toBe("Reality Smolko");
    expect(ctx.autoResponseEnabled).toBe(true);
  });
});

describe("runInboundLeadAutoResponse", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("skips when auto_response_enabled is false", async () => {
    const sendSpy = vi.spyOn(sendModule, "sendInboundAutoResponse");

    const supa = {
      from: (table: string) => {
        if (table === "leads") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    auto_response_sent_at: null,
                    name: "Lead",
                    assigned_agent: "Demo Makler 1",
                    ai_reason: "Byt v centre.",
                    ai_priority: "Vysoká",
                    source: "portal:Nehnuteľnosti.sk",
                  },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: () => ({
                is: async () => ({ error: null }),
              }),
            }),
          };
        }
        if (table === "agencies") {
          return {
            select: (cols: string) => ({
              eq: () => ({
                maybeSingle: async () => {
                  if (cols === "name") return { data: { name: "Smolko" }, error: null };
                  if (cols === "auto_response_enabled") {
                    return { data: { auto_response_enabled: false }, error: null };
                  }
                  return { data: { email: "office@test.sk", phone: null }, error: null };
                },
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    } as unknown as SupabaseClient;

    await runInboundLeadAutoResponse(
      supa,
      { id: "lead-1", agency_id: "agency-1" },
      { agencyId: "agency-1", name: "Lead", email: "lead@test.sk" },
    );

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("uses owner profile email fallback for Reply-To", async () => {
    const sendSpy = vi
      .spyOn(sendModule, "sendInboundAutoResponse")
      .mockResolvedValue({ ok: true });

    const supa = {
      from: (table: string) => {
        if (table === "leads") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    auto_response_sent_at: null,
                    name: "Lead",
                    assigned_agent: "Demo Makler 1",
                    ai_reason: "Byt v centre.",
                    ai_priority: "Vysoká",
                    source: "portal:Nehnuteľnosti.sk",
                  },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: () => ({
                is: async () => ({ error: null }),
              }),
            }),
          };
        }
        if (table === "agencies") {
          return {
            select: (cols: string) => ({
              eq: () => ({
                maybeSingle: async () => {
                  if (cols === "name") return { data: { name: "Smolko" }, error: null };
                  if (cols === "auto_response_enabled") {
                    return { data: { auto_response_enabled: true }, error: null };
                  }
                  return { data: null, error: { code: "42703", message: "column missing" } };
                },
              }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                or: () => ({
                  limit: async () => ({
                    data: [{ email: "owner@test.sk", phone: "+421911111111" }],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    } as unknown as SupabaseClient;

    await runInboundLeadAutoResponse(
      supa,
      { id: "lead-1", agency_id: "agency-1" },
      { agencyId: "agency-1", name: "Lead", email: "lead@test.sk" },
    );

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: "owner@test.sk",
        assignedAgent: "Demo Makler 1",
        aiPriority: "Vysoká",
        source: "portal:Nehnuteľnosti.sk",
      }),
    );
    // interné zdôvodnenie triedenia sa do e-mailu vôbec nepredáva
    expect(sendSpy.mock.calls[0][0]).not.toHaveProperty("aiReason");
  });

  it("stamps last_contact_at in the same update as auto_response_sent_at", async () => {
    // Ten surfaces read leads.last_contact_at and nothing wrote it: 0 of 520
    // production rows carried a value on 2026-10-02. The auto-response is one
    // of exactly two paths that demonstrably reach the lead, and it already
    // writes a dedup column after a confirmed send — so the contact stamp
    // rides that statement instead of a second round trip that could
    // half-succeed.
    vi.spyOn(sendModule, "sendInboundAutoResponse").mockResolvedValue({ ok: true });
    const updates: Record<string, unknown>[] = [];

    const supa = {
      from: (table: string) => {
        if (table === "leads") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    auto_response_sent_at: null,
                    name: "Lead",
                    assigned_agent: "Demo Makler 1",
                    ai_priority: "Vysoká",
                    source: "portal:Nehnuteľnosti.sk",
                  },
                  error: null,
                }),
              }),
            }),
            update: (row: Record<string, unknown>) => {
              updates.push(row);
              return { eq: () => ({ is: async () => ({ error: null }) }) };
            },
          };
        }
        if (table === "agencies") {
          return {
            select: (cols: string) => ({
              eq: () => ({
                maybeSingle: async () => {
                  if (cols === "name") return { data: { name: "Smolko" }, error: null };
                  if (cols === "auto_response_enabled") {
                    return { data: { auto_response_enabled: true }, error: null };
                  }
                  return { data: { email: "office@test.sk", phone: null }, error: null };
                },
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
              limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
            }),
          }),
        };
      },
    } as unknown as SupabaseClient;

    await runInboundLeadAutoResponse(
      supa,
      { id: "lead-1", agency_id: "agency-1" },
      { agencyId: "agency-1", name: "Lead", email: "lead@test.sk" },
    );

    expect(updates).toHaveLength(1);
    expect(updates[0]).toHaveProperty("last_contact_at");
    // One statement, one timestamp: both columns describe the same send.
    expect(updates[0].last_contact_at).toBe(updates[0].auto_response_sent_at);
  });
});
