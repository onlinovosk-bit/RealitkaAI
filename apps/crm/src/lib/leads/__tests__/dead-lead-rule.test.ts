import { describe, expect, it } from "vitest";
import {
  DEAD_LEAD_CLOSURE_REASON,
  getDeadLeadClosureUpdate,
  isDeadLeadCandidate,
} from "@/lib/leads/dead-lead-rule";

const now = new Date("2026-09-08T00:00:00.000Z");
const eligibleLead = {
  createdAt: "2026-05-01T00:00:00.000Z",
  autoResponseSentAt: null,
  activityCount: 0,
  status: "Nový",
  source: "realvia_import_smolko",
};

describe("dead lead rule", () => {
  it("selects only old leads with no recorded contact", () => {
    expect(isDeadLeadCandidate(eligibleLead, now)).toBe(true);
  });

  it.each([
    ["recent", { createdAt: "2026-08-01T00:00:00.000Z" }],
    ["auto-response", { autoResponseSentAt: "2026-05-02T00:00:00.000Z" }],
    ["activity", { activityCount: 1 }],
    ["status", { status: "Kontaktovaný" }],
    ["source", { source: "manual" }],
  ])("rejects %s lead", (_label, change) => {
    expect(isDeadLeadCandidate({ ...eligibleLead, ...change }, now)).toBe(false);
  });

  it("uses the truthful closure reason and message", () => {
    expect(getDeadLeadClosureUpdate()).toEqual({
      closure_reason_code: DEAD_LEAD_CLOSURE_REASON,
      closure_note:
        "Za 90 dní žiadny zaznamenaný kontakt z našej strany. Nevieme, či má klient ešte záujem.",
    });
  });
});