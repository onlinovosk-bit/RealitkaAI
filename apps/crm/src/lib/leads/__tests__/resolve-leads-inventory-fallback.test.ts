import { describe, expect, it, vi } from "vitest";
import { resolveLeadsWithServiceFallback } from "@/lib/leads/resolve-leads-inventory-fallback";
import type { Lead } from "@/lib/leads-store";

const rlsLead: Lead = {
  id: "lead-rls",
  name: "RLS Lead",
  email: "a@example.com",
  phone: "+421900000001",
  location: "BA",
  budget: "100k",
  propertyType: "Byt",
  rooms: "2",
  financing: "Hypotéka",
  timeline: "Ihneď",
  source: "Web",
  status: "Nový",
  score: 80,
  assignedAgent: "Agent",
  assignedProfileId: null,
  lastContact: "Bez kontaktu",
  note: "",
  client_segment: null,
  buyer_readiness_score: null,
  ai_insight: null,
  sofia_insight: null,
  ai_engine: null,
  aiPriority: null,
  aiReason: null,
  aiTriageAt: null,
  aiPriorityManualAt: null,
  lastAiFollowupAt: null,
  aiFollowupCount: 0,
};

describe("resolveLeadsWithServiceFallback", () => {
  it("returns RLS leads when non-empty", async () => {
    const result = await resolveLeadsWithServiceFallback({
      rlsLeads: [rlsLead],
      agencyId: "agency-1",
      isContactsView: true,
      fetchAgencyLeads: vi.fn(),
      fetchPropertyContacts: vi.fn(),
    });

    expect(result).toEqual([rlsLead]);
  });

  it("loads agency leads via service when RLS returns 0 (451-in-DB scenario)", async () => {
    const fetchAgencyLeads = vi.fn().mockResolvedValue([
      {
        id: "lead-db-1",
        name: "DB Lead",
        email: "db@example.com",
        phone: "+421900000002",
        location: "KE",
        budget: "200k",
        property_type: "Dom",
        rooms: "4",
        financing: "Hotovosť",
        timeline: "Do 1 mesiaca",
        source: "Realvia",
        status: "Nový",
        score: 70,
        assigned_agent: "Maklér",
        assigned_profile_id: null,
        last_contact: null,
        note: null,
      },
    ]);

    const result = await resolveLeadsWithServiceFallback({
      rlsLeads: [],
      agencyId: "agency-smolko",
      isContactsView: false,
      fetchAgencyLeads,
      fetchPropertyContacts: vi.fn(),
    });

    expect(fetchAgencyLeads).toHaveBeenCalledWith("agency-smolko");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("DB Lead");
  });

  it("falls back to property contacts only for contacts view", async () => {
    const fetchPropertyContacts = vi.fn().mockResolvedValue([
      {
        id: "prop-1",
        title: "Byt",
        broker_name: "Maklér",
        broker_email: "makler@smolko.sk",
        broker_phone: "+421900111222",
        location: "Poprad",
        type: "Byt",
        rooms: "3",
        created_at: "2026-05-28T10:00:00.000Z",
      },
    ]);

    const result = await resolveLeadsWithServiceFallback({
      rlsLeads: [],
      agencyId: "agency-smolko",
      isContactsView: true,
      fetchAgencyLeads: vi.fn().mockResolvedValue([]),
      fetchPropertyContacts,
    });

    expect(fetchPropertyContacts).toHaveBeenCalledWith("agency-smolko");
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("Realvia nehnuteľnosti");
  });

  it("skips service fallback when agency_id is missing", async () => {
    const fetchAgencyLeads = vi.fn();

    const result = await resolveLeadsWithServiceFallback({
      rlsLeads: [],
      agencyId: null,
      isContactsView: true,
      fetchAgencyLeads,
      fetchPropertyContacts: vi.fn(),
    });

    expect(fetchAgencyLeads).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
