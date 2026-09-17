import { beforeEach, describe, expect, it, vi } from "vitest";

const computeBRI = vi.fn();
const logEvent = vi.fn();
const generateAutoReply = vi.fn();

vi.mock("@/lib/bri/engine", () => ({
  computeBRI: (...args: unknown[]) => computeBRI(...args),
}));
vi.mock("@/lib/events/log-event", () => ({
  logEvent: (...args: unknown[]) => logEvent(...args),
}));
vi.mock("@/lib/inbound/auto-reply", () => ({
  generateAutoReply: (...args: unknown[]) => generateAutoReply(...args),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: vi.fn() };
  },
}));

function mockSupabase(opts: {
  profile?: { id: string; full_name: string | null; agency_id: string | null } | null;
  insertError?: { message: string } | null;
}) {
  const insert = vi.fn().mockResolvedValue({ error: opts.insertError ?? null });
  const maybeSingle = vi.fn().mockResolvedValue({
    data: opts.profile === undefined
      ? { id: "prof-1", full_name: "Agent", agency_id: "agency-1" }
      : opts.profile,
    error: null,
  });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn((table: string) => {
    if (table === "profiles") return { select };
    if (table === "leads") return { insert };
    throw new Error(`unexpected table ${table}`);
  });
  return { from, insert, select };
}

describe("processInboundLead", () => {
  beforeEach(() => {
    vi.resetModules();
    computeBRI.mockReset();
    logEvent.mockReset();
    generateAutoReply.mockReset();
  });

  it("throws when profile has no agency_id", async () => {
    const { processInboundLead } = await import("../process-lead");
    const supabase = mockSupabase({
      profile: { id: "prof-1", full_name: "A", agency_id: null },
    });
    await expect(
      processInboundLead({ name: "Lead", profileId: "prof-1" }, supabase as never),
    ).rejects.toThrow("profile_missing_agency");
    expect(supabase.insert).not.toHaveBeenCalled();
  });

  it("throws when lead insert fails (no silent ok)", async () => {
    const { processInboundLead } = await import("../process-lead");
    const supabase = mockSupabase({
      insertError: { message: "permission denied" },
    });
    await expect(
      processInboundLead({ name: "Lead", profileId: "prof-1" }, supabase as never),
    ).rejects.toThrow("permission denied");
  });

  it("stamps agency_id and skips auto-reply when BRI is null (no fake score)", async () => {
    const { processInboundLead } = await import("../process-lead");
    const supabase = mockSupabase({});
    computeBRI.mockResolvedValue(null);
    logEvent.mockResolvedValue(undefined);

    const result = await processInboundLead(
      {
        name: "Lead",
        profileId: "prof-1",
        email: "lead@example.com",
      },
      supabase as never,
    );

    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({ agency_id: "agency-1", name: "Lead" }),
    );
    expect(result.replySent).toBe(false);
    expect(result.briScore).toBe(0);
    expect(generateAutoReply).not.toHaveBeenCalled();
  });
});
