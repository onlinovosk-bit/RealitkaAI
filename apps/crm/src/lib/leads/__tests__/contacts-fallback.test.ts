import { describe, expect, it } from "vitest";
import { buildFallbackContactsFromProperties } from "@/lib/leads/contacts-fallback";

describe("buildFallbackContactsFromProperties", () => {
  it("builds fallback contacts from broker/owner rows", () => {
    const leads = buildFallbackContactsFromProperties([
      {
        id: "prop-1",
        title: "3i Poprad",
        location: "Poprad",
        type: "Byt",
        rooms: "3 izby",
        broker_name: "Marek Makler",
        broker_email: "marek@example.com",
        broker_phone: "+421900111222",
        created_at: "2026-05-28T10:00:00.000Z",
      },
    ]);

    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      name: "Marek Makler",
      email: "marek@example.com",
      phone: "+421900111222",
      location: "Poprad",
      source: "Realvia nehnuteľnosti",
      status: "Nový",
    });
  });

  it("deduplicates contacts and keeps newest row", () => {
    const leads = buildFallbackContactsFromProperties([
      {
        id: "old",
        title: "Stary inzerat",
        broker_name: "Marek Makler",
        broker_email: "marek@example.com",
        broker_phone: "+421900111222",
        created_at: "2026-05-28T08:00:00.000Z",
      },
      {
        id: "new",
        title: "Novy inzerat",
        broker_name: "Marek Makler",
        broker_email: "marek@example.com",
        broker_phone: "+421900111222",
        created_at: "2026-05-28T12:00:00.000Z",
      },
    ]);

    expect(leads).toHaveLength(1);
    expect(leads[0].id).toContain("new");
    expect(leads[0].note).toContain("Novy inzerat");
  });

  it("skips rows without usable contact identity", () => {
    const leads = buildFallbackContactsFromProperties([
      {
        id: "invalid-1",
        title: "Bez mena",
        broker_email: "x@example.com",
      },
      {
        id: "invalid-2",
        title: "Bez kontaktu",
        broker_name: "Len Meno",
      },
    ]);

    expect(leads).toHaveLength(0);
  });
});
