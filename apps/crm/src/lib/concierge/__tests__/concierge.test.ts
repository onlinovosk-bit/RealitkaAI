import { describe, expect, it } from "vitest";
import { filterConciergeProperties } from "@/lib/concierge/search";
import {
  buildCallbackIdempotencyKey,
  validateConciergeCallback,
} from "@/lib/concierge/callback";
import { conciergeSecretOk, resolveConciergeAgencyId } from "@/lib/concierge/agency";
import {
  mergeBusyIntervals,
  validateFreeBusyWindow,
  fetchConciergeFreeBusy,
} from "@/lib/concierge/freebusy";
import { conciergeBookingIdempotencyKey } from "@/lib/concierge/booking";
import { SMOLKO_AGENCY_ID } from "@/lib/profiles/resolve-profile-for-auth";

const FRESH = new Date().toISOString();

describe("concierge search (N07)", () => {
  it("fail-closed: stale / inactive never returned", () => {
    const cards = filterConciergeProperties(
      [
        {
          id: "1",
          title: "Stale",
          location: "Bratislava",
          price: 1,
          type: "Byt",
          rooms: "2",
          status: "Aktívna",
          transaction_type: "Predaj",
          realvia_updated_at: "2020-01-01T00:00:00.000Z",
          broker_name: null,
          broker_email: null,
          broker_phone: null,
        },
        {
          id: "2",
          title: "Fresh",
          location: "Bratislava",
          price: 2,
          type: "Byt",
          rooms: "3",
          status: "Aktívna",
          transaction_type: "Predaj",
          realvia_updated_at: FRESH,
          broker_name: "Anna",
          broker_email: null,
          broker_phone: null,
        },
        {
          id: "3",
          title: "Sold",
          location: "Bratislava",
          price: 3,
          type: "Byt",
          rooms: "2",
          status: "Predaná",
          transaction_type: "Predaj",
          realvia_updated_at: FRESH,
          broker_name: null,
          broker_email: null,
          broker_phone: null,
        },
      ],
      { locality: "Bratislava" },
      new Date(),
      { PUBLIC_LISTING_MAX_AGE_DAYS: "7" } as NodeJS.ProcessEnv,
    );
    expect(cards.map((c) => c.id)).toEqual(["2"]);
    expect(cards[0].brokerName).toBe("Anna");
  });

  it("filters by locality", () => {
    const cards = filterConciergeProperties(
      [
        {
          id: "a",
          title: "BA",
          location: "Bratislava-Staré Mesto",
          price: 1,
          type: "Byt",
          rooms: "2",
          status: "Aktívna",
          transaction_type: "Predaj",
          realvia_updated_at: FRESH,
          broker_name: null,
          broker_email: null,
          broker_phone: null,
        },
        {
          id: "b",
          title: "KE",
          location: "Košice",
          price: 1,
          type: "Byt",
          rooms: "2",
          status: "Aktívna",
          transaction_type: "Predaj",
          realvia_updated_at: FRESH,
          broker_name: null,
          broker_email: null,
          broker_phone: null,
        },
      ],
      { locality: "košice" },
    );
    expect(cards.map((c) => c.id)).toEqual(["b"]);
  });
});

describe("concierge callback (N07)", () => {
  it("requires consent and contact", () => {
    expect(validateConciergeCallback({ phone: "+421" }).ok).toBe(false);
    expect(
      validateConciergeCallback({ phone: "+421", consentContact: true }).ok,
    ).toBe(true);
  });

  it("honeypot short-circuits as ok", () => {
    const v = validateConciergeCallback({ hp: "bot", consent: true });
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.input.honeypot).toBe("bot");
  });

  it("idempotency key stable for same contact+property", () => {
    const a = buildCallbackIdempotencyKey("ag", {
      consentContact: true,
      phone: "+4219",
      propertyId: "p1",
    });
    const b = buildCallbackIdempotencyKey("ag", {
      consentContact: true,
      phone: "+4219",
      propertyId: "p1",
    });
    expect(a).toBe(b);
  });
});

describe("concierge agency / secret", () => {
  it("defaults to Smolko agency", () => {
    expect(resolveConciergeAgencyId({})).toBe(SMOLKO_AGENCY_ID);
  });

  it("secret gate: empty env allows; set env requires match", () => {
    expect(conciergeSecretOk(null, {})).toBe(true);
    expect(
      conciergeSecretOk("x", { CONCIERGE_SHARED_SECRET: "x" } as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(
      conciergeSecretOk("y", { CONCIERGE_SHARED_SECRET: "x" } as NodeJS.ProcessEnv),
    ).toBe(false);
  });
});

describe("concierge freebusy (N09)", () => {
  it("rejects invalid window", () => {
    expect(validateFreeBusyWindow("bad", "also").ok).toBe(false);
  });

  it("merges overlapping busy", () => {
    expect(
      mergeBusyIntervals([
        { start: "2026-09-17T10:00:00Z", end: "2026-09-17T11:00:00Z" },
        { start: "2026-09-17T10:30:00Z", end: "2026-09-17T12:00:00Z" },
      ]),
    ).toEqual([
      { start: "2026-09-17T10:00:00Z", end: "2026-09-17T12:00:00Z" },
    ]);
  });

  it("oauth_missing without token", async () => {
    const r = await fetchConciergeFreeBusy({
      agencyId: SMOLKO_AGENCY_ID,
      calendarId: "primary",
      timeMin: "2026-09-17T08:00:00Z",
      timeMax: "2026-09-17T18:00:00Z",
      accessToken: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("oauth_missing");
  });
});

describe("concierge booking (N10)", () => {
  it("idempotency key includes agency+slot", () => {
    const key = conciergeBookingIdempotencyKey({
      agencyId: "ag-1",
      profileId: "p",
      leadId: "l1",
      propertyId: "prop",
      title: "Obhliadka",
      startsAt: "2026-09-20T10:00:00Z",
      endsAt: "2026-09-20T10:30:00Z",
    });
    expect(key).toContain("ag-1");
    expect(key).toContain("2026-09-20T10:00:00Z");
  });
});
