import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveMock = vi.fn();
vi.mock("@/lib/supabase/resolve-client", () => ({
  resolveTenantSupabase: (...a: unknown[]) => resolveMock(...a),
}));
vi.mock("@/lib/demo-mode-cookie", () => ({ readDemoModeFromCookie: async () => false }));

import { appendPipelineMove, getPipelineMovesByLeadId } from "../leads-store";

function client() {
  const insert = vi.fn(async () => ({ error: null }));
  const order = vi.fn(async () => ({ data: [], error: null }));
  return {
    insert,
    c: {
      from: () => ({ insert, select: () => ({ eq: () => ({ order }) }) }),
    },
  };
}

beforeEach(() => vi.clearAllMocks());

describe("pipeline_moves používa request-scoped klienta (nie browser singleton)", () => {
  it("getPipelineMovesByLeadId odovzdá scoped klienta do resolveTenantSupabase", async () => {
    const { c } = client();
    resolveMock.mockResolvedValue(c);
    await getPipelineMovesByLeadId("lead-1", c as never);
    expect(resolveMock).toHaveBeenCalledWith(c);
  });

  it("appendPipelineMove odovzdá scoped klienta a zapíše cez neho", async () => {
    const { c, insert } = client();
    resolveMock.mockResolvedValue(c);
    await appendPipelineMove("lead-1", "L", "a", "b", c as never);
    expect(resolveMock).toHaveBeenCalledWith(c);
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
