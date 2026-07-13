import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runInboundLeadAutoResponse } from "@/lib/acquire/inbound-lead-auto-response";
import * as sendModule from "@/lib/acquire/send-inbound-auto-response";

vi.mock("@/lib/auto-error-capture", () => ({
  autoErrorCapture: vi.fn(),
}));

describe("send-inbound-auto-response template", () => {
  it("builds SK plain-text without quoting inquiry", async () => {
    const { buildInboundAutoResponseText } = await import("@/lib/acquire/send-inbound-auto-response");
    const text = buildInboundAutoResponseText({
      to: "lead@example.com",
      leadName: "Ján",
      agencyName: "Reality Smolko",
      agencyPhone: "+421900000000",
      replyTo: "office@realitysmolko.sk",
    });

    expect(text).toContain("Dobrý deň, Ján");
    expect(text).toContain("ďakujeme za váš dopyt");
    expect(text).not.toContain("citliv");
    expect(text).toContain("+421900000000");
  });

  it("formats From with agency display name", async () => {
    const { formatInboundFromAddress } = await import("@/lib/acquire/send-inbound-auto-response");
    expect(formatInboundFromAddress("AA Reality", "noreply@revolis.ai")).toBe(
      "AA Reality <noreply@revolis.ai>",
    );
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
                maybeSingle: async () => ({ data: { auto_response_sent_at: null }, error: null }),
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
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    name: "Smolko",
                    email: "office@test.sk",
                    phone: null,
                    auto_response_enabled: false,
                  },
                  error: null,
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
                maybeSingle: async () => ({ data: { auto_response_sent_at: null }, error: null }),
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
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    name: "Smolko",
                    email: "",
                    phone: "",
                    auto_response_enabled: true,
                  },
                  error: null,
                }),
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
      expect.objectContaining({ replyTo: "owner@test.sk" }),
    );
  });
});
