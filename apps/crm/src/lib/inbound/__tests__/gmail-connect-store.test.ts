// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  eq: vi.fn(),
  neq: vi.fn(),
  update: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

import { markError, markPulled } from "../gmail-connect-store";

const AGENCY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";

function chain() {
  const api = {
    update: mocks.update,
    eq: mocks.eq,
    neq: mocks.neq,
  };
  mocks.update.mockReturnValue(api);
  mocks.eq.mockReturnValue(api);
  mocks.neq.mockReturnValue(api);
  mocks.from.mockReturnValue(api);
  mocks.createServiceRoleClient.mockReturnValue({ from: mocks.from });
  return api;
}

beforeEach(() => {
  vi.clearAllMocks();
  chain();
});

describe("markPulled / markError — disconnect∩pull race", () => {
  it("markPulled aktualizuje len stále active riadok s neprázdnym ciphertextom", async () => {
    await markPulled(AGENCY);
    expect(mocks.from).toHaveBeenCalledWith("agency_gmail_inbound_oauth");
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active", last_error: null }),
    );
    expect(mocks.eq).toHaveBeenCalledWith("agency_id", AGENCY);
    expect(mocks.eq).toHaveBeenCalledWith("status", "active");
    expect(mocks.neq).toHaveBeenCalledWith("refresh_token_ciphertext", "");
  });

  it("markError neprepisuje revoked (disconnect vyhráva nad chybou doťahujúceho pullu)", async () => {
    await markError(AGENCY, "oauth_refresh_failed:invalid_grant", true);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", last_error: "oauth_refresh_failed:invalid_grant" }),
    );
    expect(mocks.eq).toHaveBeenCalledWith("agency_id", AGENCY);
    expect(mocks.neq).toHaveBeenCalledWith("status", "revoked");
  });
});
