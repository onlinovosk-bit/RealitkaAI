import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const AGENCY_ID = "11111111-1111-1111-1111-111111111111";
const TOKEN = "test-inbound-token-smolko";
const SLUG = "smolko";

const mockTriage = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockAutoResponse = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockFrom = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ allowed: true }),
);

let lastInsert: Record<string, unknown> | null = null;

vi.mock("@/lib/acquire/inbound-lead-triage", () => ({
  runInboundLeadTriageAndNotify: (...args: unknown[]) => mockTriage(...args),
}));

vi.mock("@/lib/acquire/inbound-lead-auto-response", () => ({
  runInboundLeadAutoResponse: (...args: unknown[]) => mockAutoResponse(...args),
}));

vi.mock("@/lib/acquire/send-inbound-auto-response", () => ({
  sendInboundAutoResponse: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}));

describe("inbound insert must not invent property_type / financing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastInsert = null;
    vi.stubEnv("LEAD_FORM_TOKEN_SMOLKO", TOKEN);
    vi.stubEnv("LEAD_FORM_SLUG_SMOLKO", SLUG);
    vi.stubEnv("LEAD_FORM_AGENCY_ID_SMOLKO", AGENCY_ID);
    mockFrom.mockImplementation((table: string) => {
      if (table === "leads") {
        return {
          insert: (row: Record<string, unknown>) => {
            lastInsert = row;
            return {
              select: () => ({
                single: async () => ({
                  data: { id: "lead-1", agency_id: AGENCY_ID, source: "web_form" },
                  error: null,
                }),
              }),
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("writes empty property_type and financing", async () => {
    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/leads/inbound", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-forwarded-for": "10.0.0.9",
        },
        body: JSON.stringify({
          slug: SLUG,
          token: TOKEN,
          name: "Predavajuci",
          email: "seller@example.com",
          consent: true,
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(lastInsert?.property_type).toBe("");
    expect(lastInsert?.financing).toBe("");
    expect(lastInsert?.property_type).not.toBe("Byt");
    expect(lastInsert?.financing).not.toBe("Hypotéka");
  });

  it("source guards against invented Byt/Hypotéka literals", () => {
    const src = readFileSync(
      join(process.cwd(), "src/app/api/leads/inbound/route.ts"),
      "utf8",
    );
    expect(src).not.toContain('property_type: "Byt"');
    expect(src).not.toContain('financing: "Hypotéka"');
  });
});
