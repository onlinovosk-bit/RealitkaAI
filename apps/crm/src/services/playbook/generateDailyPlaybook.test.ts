import { describe, expect, it } from "vitest";
import { parseLeadLastContactIso } from "@/services/playbook/generateDailyPlaybook";

describe("parseLeadLastContactIso", () => {
  it("parses ISO timestamps", () => {
    const iso = "2026-06-19T10:00:00.000Z";
    expect(parseLeadLastContactIso(iso)).toBe(iso);
  });

  it("returns undefined for placeholder labels", () => {
    expect(parseLeadLastContactIso("Práve vytvorený")).toBeUndefined();
    expect(parseLeadLastContactIso("Bez kontaktu")).toBeUndefined();
    expect(parseLeadLastContactIso("")).toBeUndefined();
  });
});
