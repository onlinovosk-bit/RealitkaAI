import { describe, it, expect } from "vitest";
import {
  getLeadDisplayScore,
  isLeadBuyerReadyToday,
  isLeadHot,
  isSparseQualificationLead,
} from "@/lib/leads/lead-display-score";
import type { Lead } from "@/lib/mock-data";

function baseLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "1",
    name: "Test",
    email: "",
    phone: "",
    location: "",
    budget: "",
    propertyType: "",
    rooms: "",
    financing: "",
    timeline: "",
    source: "Import",
    status: "Nový",
    score: 0,
    assignedAgent: "",
    lastContact: "Bez kontaktu",
    note: "",
    ...overrides,
  };
}

describe("lead-display-score", () => {
  it("mapuje Nízka triáž na nízke BRI, nie 0", () => {
    const lead = baseLead({
      aiPriority: "Nízka",
      aiReason: "treba kvalifikovať",
      aiTriageAt: "2026-06-04T10:00:00Z",
    });
    expect(getLeadDisplayScore(lead)).toBe(22);
    expect(isSparseQualificationLead(lead)).toBe(true);
    expect(isLeadHot(lead)).toBe(false);
    expect(isLeadBuyerReadyToday(lead)).toBe(false);
  });

  it("horúci len pri Vysoká alebo status Horúci / score 85+", () => {
    expect(isLeadHot(baseLead({ aiPriority: "Vysoká", aiTriageAt: "x" }))).toBe(true);
    expect(isLeadHot(baseLead({ status: "Horúci", score: 80, lastContact: "2026-06-01" }))).toBe(true);
    expect(isLeadHot(baseLead({ score: 90, lastContact: "2026-06-01" }))).toBe(true);
  });

  it("Vysoká triáž je pripravený kúpiť dnes", () => {
    const lead = baseLead({
      aiPriority: "Vysoká",
      aiTriageAt: "2026-06-04T10:00:00Z",
      lastContact: "Bez kontaktu",
    });
    expect(isLeadBuyerReadyToday(lead)).toBe(true);
    expect(getLeadDisplayScore(lead)).toBe(85);
  });
});
