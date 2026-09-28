import { beforeEach, describe, expect, it, vi } from "vitest";

/** The automatic recalculation after a lead/property save uses the request's client. */

const forLead = vi.hoisted(() => vi.fn());
const forProperty = vi.hoisted(() => vi.fn());
const createActivityMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/matching-store", () => ({
  recalculateMatchesForLead: (...a: unknown[]) => forLead(...a),
  recalculateMatchesForProperty: (...a: unknown[]) => forProperty(...a),
  recalculateAllMatches: vi.fn(),
}));
vi.mock("@/lib/activities-store", () => ({ createActivity: (...a: unknown[]) => createActivityMock(...a) }));

import { autoRecalculateForLead, autoRecalculateForProperty } from "../matching-hooks";

const client = { tag: "request-scoped" } as never;

beforeEach(() => {
  vi.clearAllMocks();
  forLead.mockResolvedValue({ inserted: 3 });
  forProperty.mockResolvedValue({ inserted: 2 });
  createActivityMock.mockResolvedValue(undefined);
});

describe("matching hooks", () => {
  it("lead: passes the client to the recalculation and the activity", async () => {
    await autoRecalculateForLead("lead-1", client);
    expect(forLead).toHaveBeenCalledWith("lead-1", client);
    expect(createActivityMock.mock.calls[0][1]).toBe(client);
  });

  it("property: passes the client to the recalculation and the activity", async () => {
    await autoRecalculateForProperty("prop-1", client);
    expect(forProperty).toHaveBeenCalledWith("prop-1", client);
    expect(createActivityMock.mock.calls[0][1]).toBe(client);
  });
});
