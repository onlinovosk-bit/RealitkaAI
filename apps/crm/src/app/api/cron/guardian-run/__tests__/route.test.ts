import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as guardianRunGet } from "@/app/api/cron/guardian-run/route";
import { GET as guardianDigestGet } from "@/app/api/cron/guardian-digest/route";

const mockListAgencies = vi.fn();
const mockRunAgency = vi.fn();
const mockRecordPlatform = vi.fn();
const mockDigest = vi.fn();
const mockCreateAdmin = vi.fn();

vi.mock("@/lib/ai/dashboard-insights-cron", () => ({
  listActiveAgencyIds: (...args: unknown[]) => mockListAgencies(...args),
}));

vi.mock("@/lib/guardian/runner", () => ({
  runGuardianForAgency: (...args: unknown[]) => mockRunAgency(...args),
  recordGuardianPlatformHeartbeat: (...args: unknown[]) => mockRecordPlatform(...args),
}));

vi.mock("@/lib/guardian/digest", () => ({
  runGuardianDigestForAgency: (...args: unknown[]) => mockDigest(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => mockCreateAdmin(),
}));

function req(path: string, secret: string | null) {
  const init: ConstructorParameters<typeof NextRequest>[1] = {};
  if (secret) init.headers = { authorization: `Bearer ${secret}` };
  return new NextRequest(`http://localhost${path}`, init);
}

describe("Guardian cron auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "guardian-cron-secret");
    mockCreateAdmin.mockReturnValue({});
    mockListAgencies.mockResolvedValue(["agency-1"]);
    mockRunAgency.mockResolvedValue({ inserted: 0, agencyId: "agency-1" });
    mockDigest.mockResolvedValue({ sent: false, reason: "digest_disabled" });
  });

  it("guardian-run returns 401 without Bearer CRON_SECRET", async () => {
    const res = await guardianRunGet(req("/api/cron/guardian-run", null));
    expect(res.status).toBe(401);
  });

  it("guardian-run returns 401 with wrong secret", async () => {
    const res = await guardianRunGet(req("/api/cron/guardian-run", "wrong"));
    expect(res.status).toBe(401);
  });

  it("guardian-run processes agencies when authorized", async () => {
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("GUARDIAN_AGENCY_ALLOWLIST", undefined);
    const res = await guardianRunGet(req("/api/cron/guardian-run", "guardian-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockRunAgency).toHaveBeenCalledOnce();
    expect(mockRecordPlatform).toHaveBeenCalledOnce();
  });

  it("guardian-run skips tenants on production when allowlist unset", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GUARDIAN_AGENCY_ALLOWLIST", undefined);
    mockListAgencies.mockResolvedValue(["agency-1", "agency-2"]);
    const res = await guardianRunGet(req("/api/cron/guardian-run", "guardian-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skippedReason).toBe("allowlist_unset_prod");
    expect(body.agencies).toBe(0);
    expect(mockRunAgency).not.toHaveBeenCalled();
  });

  it("guardian-digest returns 401 without auth", async () => {
    const res = await guardianDigestGet(req("/api/cron/guardian-digest", null));
    expect(res.status).toBe(401);
  });
});
