import { describe, expect, it } from "vitest";

import { parseAiPriorityTriagePayload } from "@/ai/jobs/ai-priority-triage";
import { AI_JOB_TYPES } from "@/queue/types";
import { getQueueHandlers } from "@/queue/handlers";

describe("ai_priority_triage payload", () => {
  it("parses non-empty string lead_ids", () => {
    expect(parseAiPriorityTriagePayload({ lead_ids: ["a", "b"] })).toEqual(["a", "b"]);
  });

  it("rejects non-array", () => {
    expect(() => parseAiPriorityTriagePayload({ lead_ids: "x" })).toThrow(
      /must be an array/,
    );
  });

  it("rejects empty list", () => {
    expect(() => parseAiPriorityTriagePayload({ lead_ids: [] })).toThrow(
      /at least one id/,
    );
  });
});

describe("handler registry", () => {
  it("registers ai_priority_triage", () => {
    const handlers = getQueueHandlers();
    expect(typeof handlers[AI_JOB_TYPES.AI_PRIORITY_TRIAGE]).toBe("function");
  });
});
