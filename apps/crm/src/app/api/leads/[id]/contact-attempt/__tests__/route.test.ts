import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContactEventValidationError } from "@/lib/lead-contact-events/types";

const mockGetCurrentProfile = vi.fn();
const mockRecordContactAttempt = vi.fn();
const mockIncrementUsageMetric = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentProfile: () => mockGetCurrentProfile(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: () => ({}) }),
}));

vi.mock("@/lib/lead-contact-events/store", () => ({
  recordContactAttempt: (...args: unknown[]) => mockRecordContactAttempt(...args),
}));

vi.mock("@/lib/usage-metrics", () => ({
  incrementUsageMetric: (...args: unknown[]) => mockIncrementUsageMetric(...args),
}));

const { POST } = await import("../route");

const PROFILE = { id: "profile-1", agency_id: "agency-a" };

function post(body: unknown, leadId = "lead-1") {
  return POST(
    new Request("http://localhost/api/leads/lead-1/contact-attempt", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: leadId }) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentProfile.mockResolvedValue(PROFILE);
  mockRecordContactAttempt.mockResolvedValue({ id: "event-1" });
  mockIncrementUsageMetric.mockResolvedValue(undefined);
});

describe("POST /api/leads/[id]/contact-attempt — what it records", () => {
  it("records the attempt as manual, by the caller, with no outcome claimed", async () => {
    const before = Date.now();
    const res = await post({ channel: "call" });
    const after = Date.now();

    expect(res.status).toBe(200);
    expect(mockRecordContactAttempt).toHaveBeenCalledTimes(1);

    const input = mockRecordContactAttempt.mock.calls[0][1];
    expect(input).toMatchObject({
      agencyId: "agency-a",
      leadId: "lead-1",
      actorProfileId: "profile-1",
      channel: "call",
      source: "manual",
    });

    // Pressing "Call" proves an attempt, not a conversation. Leaving outcome
    // unset is what keeps the substrate's third state (unknown) meaningful —
    // sending "unanswered" here would be inventing a negative result.
    expect(input.outcome).toBeUndefined();

    // The time comes from the server clock, not the request: a client-supplied
    // timestamp would be a client-controlled funnel metric.
    expect(input.occurredAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(input.occurredAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("ignores a caller-supplied timestamp entirely", async () => {
    await post({ channel: "email", occurredAt: "2020-01-01T00:00:00.000Z" });
    const input = mockRecordContactAttempt.mock.calls[0][1];
    expect(input.occurredAt.getFullYear()).toBeGreaterThan(2020);
  });

  it("passes an explicit outcome through when one is genuinely known", async () => {
    await post({ channel: "call", outcome: "answered", note: "krátky hovor" });
    expect(mockRecordContactAttempt.mock.calls[0][1]).toMatchObject({
      outcome: "answered",
      note: "krátky hovor",
    });
  });
});

describe("POST /api/leads/[id]/contact-attempt — guards", () => {
  it("is not Enterprise-gated: a plain signed-in profile records an attempt", async () => {
    // The reason this route exists instead of /api/ai/lead-events, which is
    // behind isEnterpriseSalesIntelligenceEnabled(). C1 must not be a property
    // of the price list.
    const res = await post({ channel: "call" });
    expect(res.status).toBe(200);
    expect(mockRecordContactAttempt).toHaveBeenCalled();
  });

  it("401s without a session", async () => {
    mockGetCurrentProfile.mockResolvedValue(null);
    const res = await post({ channel: "call" });
    expect(res.status).toBe(401);
    expect(mockRecordContactAttempt).not.toHaveBeenCalled();
  });

  it("403s a profile with no agency rather than inventing a tenant", async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: "p", agency_id: null });
    const res = await post({ channel: "call" });
    expect(res.status).toBe(403);
    expect(mockRecordContactAttempt).not.toHaveBeenCalled();
  });

  it("rejects a channel outside the closed vocabulary", async () => {
    const res = await post({ channel: "pigeon" });
    expect(res.status).toBe(400);
    expect(mockRecordContactAttempt).not.toHaveBeenCalled();
  });

  it("rejects a missing channel", async () => {
    const res = await post({});
    expect(res.status).toBe(400);
  });

  it("rejects an outcome outside the closed vocabulary", async () => {
    const res = await post({ channel: "call", outcome: "maybe" });
    expect(res.status).toBe(400);
  });

  it("rejects a blank lead id", async () => {
    const res = await post({ channel: "call" }, "   ");
    expect(res.status).toBe(400);
    expect(mockRecordContactAttempt).not.toHaveBeenCalled();
  });

  it("turns a cross-tenant write into 400, not 500", async () => {
    mockRecordContactAttempt.mockRejectedValue(
      new ContactEventValidationError("lead belongs to another agency"),
    );
    const res = await post({ channel: "call" });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "lead belongs to another agency" });
  });

  it("does not swallow an unexpected failure", async () => {
    mockRecordContactAttempt.mockRejectedValue(new Error("db down"));
    const res = await post({ channel: "call" });
    expect(res.status).toBe(500);
  });
});

describe("POST /api/leads/[id]/contact-attempt — telemetry", () => {
  it("counts the attempt against the caller's agency", async () => {
    await post({ channel: "call" });
    expect(mockIncrementUsageMetric).toHaveBeenCalledWith({
      agencyId: "agency-a",
      metric: "lead_contact_attempt",
    });
  });

  it("never counts an attempt that was not recorded", async () => {
    // A counter that runs ahead of the write would report contact the CRM has
    // no event for — usage saying one thing and lead_events another.
    mockRecordContactAttempt.mockRejectedValue(new Error("db down"));
    await post({ channel: "call" });
    expect(mockIncrementUsageMetric).not.toHaveBeenCalled();
  });
});
