import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();
const createServiceRoleClientMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => createServiceRoleClientMock(),
}));

describe("resolveAgencyIdFromRealsoftCredentials", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    createServiceRoleClientMock.mockReset();
  });

  it("returns agency id for valid user/pass hash verification", async () => {
    createServiceRoleClientMock.mockReturnValue({ rpc: rpcMock });
    rpcMock.mockResolvedValue({
      data: "11111111-1111-4111-8111-111111111111",
      error: null,
    });

    const { resolveAgencyIdFromRealsoftCredentials } = await import("@/lib/realsoft/auth");
    const result = await resolveAgencyIdFromRealsoftCredentials(" User@rk.sk ", " secret ");

    expect(result).toEqual({ ok: true, agencyId: "11111111-1111-4111-8111-111111111111" });
    expect(rpcMock).toHaveBeenCalledWith("resolve_agency_id_for_realsoft_credentials", {
      p_user: "user@rk.sk",
      p_pass: "secret",
    });
  });

  it("rejects invalid credentials when resolver has no match", async () => {
    createServiceRoleClientMock.mockReturnValue({ rpc: rpcMock });
    rpcMock.mockResolvedValue({ data: null, error: null });

    const { resolveAgencyIdFromRealsoftCredentials } = await import("@/lib/realsoft/auth");
    const result = await resolveAgencyIdFromRealsoftCredentials("user@rk.sk", "bad-pass");

    expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
  });

  it("returns db_unavailable when client is missing", async () => {
    createServiceRoleClientMock.mockReturnValue(null);

    const { resolveAgencyIdFromRealsoftCredentials } = await import("@/lib/realsoft/auth");
    const result = await resolveAgencyIdFromRealsoftCredentials("user@rk.sk", "pass");

    expect(result).toEqual({ ok: false, reason: "db_unavailable" });
  });
});

