import { describe, expect, it } from "vitest";
import {
  computeSellerRescueRiskScore,
  daysWithoutContact,
  pickSellerRescueCandidates,
  type SellerRescueLeadInput,
} from "@/lib/routines/seller-rescue";

const NOW = Date.parse("2026-06-16T10:00:00.000Z");

function daysAgo(n: number) {
  return new Date(NOW - n * 86_400_000).toISOString();
}

describe("seller-rescue routine", () => {
  it("falls back to created_at when last_contact is missing", () => {
    const lead: SellerRescueLeadInput = {
      id: "lead-1",
      name: "Lead One",
      status: "Nový",
      last_contact: null,
      created_at: daysAgo(11),
      assigned_profile_id: null,
    };
    expect(daysWithoutContact(lead, NOW)).toBe(11);
  });

  it("computes risk only from available routine signals", () => {
    const high = computeSellerRescueRiskScore({
      daysWithoutContact: 14,
      status: "Nový",
      activityCount: 0,
    });
    const low = computeSellerRescueRiskScore({
      daysWithoutContact: 2,
      status: "Uzavretý",
      activityCount: 4,
    });
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(100);
  });

  it("returns honest empty output when no lead crosses day threshold", () => {
    const candidates = pickSellerRescueCandidates({
      leads: [
        {
          id: "lead-2",
          name: "Lead Two",
          status: "Nový",
          last_contact: daysAgo(2),
          created_at: daysAgo(12),
          assigned_profile_id: null,
        },
      ],
      activityCountByLeadId: {},
      minDaysWithoutContact: 7,
      nowMs: NOW,
    });
    expect(candidates).toHaveLength(0);
  });
});

