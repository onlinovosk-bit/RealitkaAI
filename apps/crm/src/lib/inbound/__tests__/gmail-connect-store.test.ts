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
const CT = "v1.iv.tag.ciphertext-blob";

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

describe("markPulled / markError — disconnect∩reconnect∩pull race", () => {
  it("markPulled aktualizuje len active riadok s neprázdnym ciphertextom z tohto behu", async () => {
    await markPulled(AGENCY, CT);
    expect(mocks.from).toHaveBeenCalledWith("agency_gmail_inbound_oauth");
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active", last_error: null }),
    );
    expect(mocks.eq).toHaveBeenCalledWith("agency_id", AGENCY);
    expect(mocks.eq).toHaveBeenCalledWith("status", "active");
    expect(mocks.neq).toHaveBeenCalledWith("refresh_token_ciphertext", "");
    expect(mocks.eq).toHaveBeenCalledWith("refresh_token_ciphertext", CT);
  });

  it("markError neprepisuje revoked a viaže disable na ciphertext behu (reconnect ostane active)", async () => {
    await markError(AGENCY, "oauth_refresh_failed:invalid_grant", true, CT);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        last_error: "oauth_refresh_failed:invalid_grant",
      }),
    );
    expect(mocks.eq).toHaveBeenCalledWith("agency_id", AGENCY);
    expect(mocks.neq).toHaveBeenCalledWith("status", "revoked");
    expect(mocks.eq).toHaveBeenCalledWith("refresh_token_ciphertext", CT);
  });
});
