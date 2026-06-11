import { describe, expect, it } from "vitest";
import { isCriticalFollowUp, scoreFollowUp } from "@/lib/cron/follow-up-scoring";

describe("[verification] Follow-up sweep scoring", () => {
  it("flags critical urgency after 14+ days without contact", () => {
    const past = new Date(Date.now() - 15 * 86_400_000).toISOString();
    const action = scoreFollowUp({
      id: "l-1",
      name: "Peter K.",
      last_contact: past,
      ai_priority: "Stredná",
    });
    expect(action.urgency).toBe("critical");
    expect(isCriticalFollowUp({ id: "l-1", last_contact: past })).toBe(true);
  });

  it("suggests HOT call for Vysoká priority", () => {
    const recent = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const action = scoreFollowUp({
      id: "l-2",
      name: "Anna M.",
      last_contact: recent,
      ai_priority: "Vysoká",
    });
    expect(action.suggestedAction).toContain("HOT");
    expect(action.urgency).toBe("normal");
  });

  it("treats never-contacted leads as max staleness", () => {
    const action = scoreFollowUp({
      id: "l-3",
      name: "Nový",
      last_contact: "Bez kontaktu",
      ai_priority: "Nízka",
    });
    expect(action.daysSinceContact).toBe(999);
    expect(action.reason).toContain("Nikdy");
  });
});
