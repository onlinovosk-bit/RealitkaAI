import { beforeEach, describe, expect, it, vi } from "vitest";

import { CREDIT_ACTION_COSTS } from "@/lib/program-tier-pricing";

const mocks = vi.hoisted(() => ({
  spendCredits: vi.fn(),
  findGenerationByIdempotencyKey: vi.fn(),
  getAgencyCreditsBalance: vi.fn(),
  insertGeneration: vi.fn(),
  completeGeneration: vi.fn(),
  logAiAction: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/credits/spend-credits", () => ({
  spendCredits: mocks.spendCredits,
}));
vi.mock("@/lib/ai/workflow/ai-generations-store", () => ({
  findGenerationByIdempotencyKey: mocks.findGenerationByIdempotencyKey,
  getAgencyCreditsBalance: mocks.getAgencyCreditsBalance,
  insertGeneration: mocks.insertGeneration,
  completeGeneration: mocks.completeGeneration,
  listingCreditIdempotencyKey: (k: string) => `listing_gen:${k}`,
}));
vi.mock("@/lib/ai-action-audit", () => ({
  logAiAction: mocks.logAiAction,
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
}));

import {
  finalizeListingGeneration,
  prepareListingWorkflow,
  type ListingWorkflowContext,
} from "@/lib/ai/workflow/listing-workflow";

const actor = {
  userId: "user-1",
  agencyId: "agency-1",
  profileId: "profile-1",
};

const meta = {
  promptVersion: "listing_prompt_v2026_07",
  promptHash: "abc123",
  schemaVersion: "listing_output_v1",
};

const ctx: ListingWorkflowContext = {
  actor,
  idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
  existing: null,
  generationId: "gen-1",
  creditKey: "listing_gen:550e8400-e29b-41d4-a716-446655440000",
  cost: CREDIT_ACTION_COSTS.listingDescription,
};

describe("listing-workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimit.mockResolvedValue({ allowed: true, remaining: 9 });
    mocks.getAgencyCreditsBalance.mockResolvedValue(50);
    mocks.insertGeneration.mockResolvedValue({ id: "gen-1" });
  });

  it("prepareListingWorkflow returns cached row without credit check path for duplicate", async () => {
    const cached = {
      id: "gen-existing",
      model_output: { portal_description: "cached" },
      credits_spent: 2,
    };
    mocks.findGenerationByIdempotencyKey.mockResolvedValue(cached);

    const result = await prepareListingWorkflow(actor, ctx.idempotencyKey, {}, meta);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cached).toBe(cached);
      expect(mocks.getAgencyCreditsBalance).not.toHaveBeenCalled();
    }
  });

  it("finalizeListingGeneration spends credits on success", async () => {
    mocks.spendCredits.mockResolvedValue({ ok: true, spent: 2, skipped: false });
    mocks.completeGeneration.mockResolvedValue(undefined);
    mocks.logAiAction.mockResolvedValue(undefined);

    const result = await finalizeListingGeneration(ctx, { portal_description: "x" }, {
      model: "claude-sonnet",
      costEur: 0.01,
      latencyMs: 100,
    });

    expect(mocks.spendCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        agencyId: "agency-1",
        amount: 2,
        idempotencyKey: ctx.creditKey,
      }),
    );
    expect(result.spent).toBe(2);
    expect(result.skipped).toBe(false);
  });

  it("finalizeListingGeneration skips spend on duplicate credit key", async () => {
    mocks.spendCredits.mockResolvedValue({ ok: true, spent: 0, skipped: true });
    mocks.completeGeneration.mockResolvedValue(undefined);
    mocks.logAiAction.mockResolvedValue(undefined);

    const result = await finalizeListingGeneration(ctx, { portal_description: "x" }, {
      model: "claude-sonnet",
      costEur: 0.01,
      latencyMs: 50,
    });

    expect(result.spent).toBe(0);
    expect(result.skipped).toBe(true);
  });
});
