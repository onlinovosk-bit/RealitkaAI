import { beforeEach, describe, expect, it, vi } from "vitest";
import { UC_DOC_AGENT_SAMPLE, UC_DOC_LISTING_SAMPLE } from "@/lib/uc/fixtures";

const resolveAuthMock = vi.fn();
const persistAgentMock = vi.fn();
const persistListingMock = vi.fn();
const softDeleteAgentMock = vi.fn();
const softDeleteListingMock = vi.fn();
const storeLogMock = vi.fn();

vi.mock("@/lib/realsoft/auth", () => ({
  resolveAgencyIdFromRealsoftCredentials: (...args: unknown[]) => resolveAuthMock(...args),
}));

vi.mock("@/lib/uc/persist", () => ({
  persistUcAgent: (...args: unknown[]) => persistAgentMock(...args),
  persistUcListing: (...args: unknown[]) => persistListingMock(...args),
  softDeleteUcAgent: (...args: unknown[]) => softDeleteAgentMock(...args),
  softDeleteUcListing: (...args: unknown[]) => softDeleteListingMock(...args),
  storeUcImportLog: (...args: unknown[]) => storeLogMock(...args),
}));

function jsonRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/uc/import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("handleUcImportPost", () => {
  beforeEach(() => {
    resolveAuthMock.mockReset();
    persistAgentMock.mockReset();
    persistListingMock.mockReset();
    softDeleteAgentMock.mockReset();
    softDeleteListingMock.mockReset();
    storeLogMock.mockReset();
    storeLogMock.mockResolvedValue({ ok: true, id: "log-1" });
  });

  it("returns code 10 for invalid credentials", async () => {
    resolveAuthMock.mockResolvedValue({ ok: false, reason: "invalid_credentials" });

    const { handleUcImportPost } = await import("@/lib/uc/import-handler");
    const res = await handleUcImportPost(
      jsonRequest({
        user: "bad",
        pass: "bad",
        action: 1,
        data: UC_DOC_LISTING_SAMPLE,
      }) as never,
      "uc-import",
    );

    const body = await res.json();
    expect(body.code).toBe(10);
  });

  it("returns code 1 when agent is created", async () => {
    resolveAuthMock.mockResolvedValue({
      ok: true,
      agencyId: "a0000001-0001-4001-8001-000000000001",
    });
    persistAgentMock.mockResolvedValue({
      ok: true,
      created: true,
      entityId: "prof-1",
      resultCode: 1,
    });

    const { handleUcImportPost } = await import("@/lib/uc/import-handler");
    const res = await handleUcImportPost(
      jsonRequest({
        user: "rk",
        pass: "secret",
        action: 2,
        data: UC_DOC_AGENT_SAMPLE,
      }) as never,
      "uc-import",
    );

    const body = await res.json();
    expect(body.code).toBe(1);
    expect(body.message).toBe("Agent added");
  });

  it("returns code 3 when listing delete succeeds", async () => {
    resolveAuthMock.mockResolvedValue({
      ok: true,
      agencyId: "a0000001-0001-4001-8001-000000000001",
    });
    softDeleteListingMock.mockResolvedValue({
      ok: true,
      created: false,
      entityId: "uc:784691",
      resultCode: 3,
    });

    const { handleUcImportPost } = await import("@/lib/uc/import-handler");
    const res = await handleUcImportPost(
      jsonRequest({
        user: "rk",
        pass: "secret",
        action: 1,
        data: { ...UC_DOC_LISTING_SAMPLE, deleted: 1 },
      }) as never,
      "uc-import",
    );

    const body = await res.json();
    expect(body.code).toBe(3);
    expect(body.message).toBe("Object deleted");
  });

  it("returns code 12 for missing required payload fields", async () => {
    resolveAuthMock.mockResolvedValue({
      ok: true,
      agencyId: "a0000001-0001-4001-8001-000000000001",
    });

    const { handleUcImportPost } = await import("@/lib/uc/import-handler");
    const res = await handleUcImportPost(
      jsonRequest({ user: "rk", pass: "secret", action: 1, data: { deleted: 0 } }) as never,
      "uc-import",
    );

    const body = await res.json();
    expect(body.code).toBe(12);
    expect(body.message).toMatchObject({ object_id: expect.any(String) });
  });
});
