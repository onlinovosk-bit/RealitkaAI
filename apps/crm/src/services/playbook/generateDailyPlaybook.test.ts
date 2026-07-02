import { describe, expect, it } from "vitest";
import { buildPlaybook } from "@/domain/playbook/engine";
import type { LeadSnapshot } from "@/domain/playbook/types";
import { parseLeadLastContactIso } from "@/services/playbook/generateDailyPlaybook";

describe("parseLeadLastContactIso", () => {
  it("parses ISO timestamps", () => {
    const iso = "2026-06-19T10:00:00.000Z";
    expect(parseLeadLastContactIso(iso)).toBe(iso);
  });

  it("returns undefined for placeholder labels", () => {
    expect(parseLeadLastContactIso("Práve vytvorený")).toBeUndefined();
    expect(parseLeadLastContactIso("Bez kontaktu")).toBeUndefined();
    expect(parseLeadLastContactIso("Práve importovaný")).toBeUndefined();
    expect(parseLeadLastContactIso("Priradené agentovi práve teraz")).toBeUndefined();
    expect(parseLeadLastContactIso("")).toBeUndefined();
  });
});

describe("generateDailyPlaybook last_contact runtime smoke (#221)", () => {
  it("falls back to created_at for BRI when last_contact is import placeholder", () => {
    const createdAt = "2026-06-01T08:00:00.000Z";
    const lastContactAt = parseLeadLastContactIso("Práve importovaný") ?? createdAt;

    expect(lastContactAt).toBe(createdAt);

    const lead: LeadSnapshot = {
      id: "lead-smoke-1",
      name: "Smoke Lead",
      location: "Humenné",
      status: "Nový",
      score: 85,
      budget: "150000",
      propertyType: "Dom",
      rooms: "4",
      lastContactAt,
      createdAt,
    };

    const actions = buildPlaybook([lead], [], { threshold: 0 });
    expect(actions.length).toBe(1);
    expect(actions[0]?.leadId).toBe("lead-smoke-1");
  });
});
