import { describe, expect, it, vi } from "vitest";
import {
  resolveConciergeAccessToken,
  type ConciergeTokenDeps,
} from "../calendar-auth";
import {
  fetchConciergeFreeBusy,
  mergeBusyIntervals,
  validateFreeBusyWindow,
} from "../freebusy";

const SECRET_TOKEN = "ya29.PRETEND-ACCESS-TOKEN";

function deps(over: Partial<ConciergeTokenDeps> = {}): ConciergeTokenDeps {
  return {
    profileId: "11111111-2222-4333-8444-555555555555",
    getAccessToken: async () => SECRET_TOKEN,
    ...over,
  };
}

describe("B08 — väzba Concierge na Google profil", () => {
  it("1. bez CONCIERGE_GOOGLE_PROFILE_ID zlyhá zatvorene", async () => {
    for (const missing of [undefined, null, "", "   "]) {
      const res = await resolveConciergeAccessToken(deps({ profileId: missing }));
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason).toBe("oauth_missing");
        expect(res.detail).toBe("concierge_profile_unbound");
      }
    }
  });

  it("2. profil bez OAuth tokenov → oauth_missing", async () => {
    const res = await resolveConciergeAccessToken(
      deps({ getAccessToken: async () => null }),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.detail).toBe("concierge_token_unavailable");
  });

  it("3. platný access token sa odovzdá ďalej", async () => {
    const getAccessToken = vi.fn(async () => SECRET_TOKEN);
    const res = await resolveConciergeAccessToken(deps({ getAccessToken }));
    expect(res).toEqual({ ok: true, accessToken: SECRET_TOKEN });
    // Token sa pýta pre naviazaný profil, nie pre nič iné.
    expect(getAccessToken).toHaveBeenCalledWith(deps().profileId);
  });

  it("4. expirovaný token + refresh → pokračuje sa s novým tokenom", async () => {
    // getGoogleCalendarAccessToken rieši refresh sama; tu overujeme, že jej
    // výsledok (nový token) je to, s čím sa ide na Google.
    const REFRESHED = "ya29.REFRESHED-TOKEN";
    const calls: string[] = [];
    const token = await resolveConciergeAccessToken(
      deps({
        getAccessToken: async (id) => {
          calls.push(id);
          return REFRESHED;
        },
      }),
    );
    expect(token.ok).toBe(true);
    if (!token.ok) return;
    expect(calls).toHaveLength(1);

    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ calendars: { primary: { busy: [] } } }), {
        status: 200,
      }),
    ) as unknown as typeof fetch;

    const res = await fetchConciergeFreeBusy(
      {
        agencyId: "a",
        calendarId: "primary",
        timeMin: "2026-09-24T08:00:00+02:00",
        timeMax: "2026-09-24T18:00:00+02:00",
        accessToken: token.accessToken,
      },
      fetchImpl,
    );
    expect(res.ok).toBe(true);
    const init = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(init.headers.Authorization).toBe(`Bearer ${REFRESHED}`);
  });

  it("5. zlyhanie refreshu nevymyslí dostupnosť", async () => {
    const res = await resolveConciergeAccessToken(
      deps({
        getAccessToken: async () => {
          throw new Error("invalid_grant: token has been expired or revoked");
        },
      }),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.detail).toBe("concierge_token_lookup_failed");
      // 10. Do odpovede sa nesmie dostať text z OAuth chyby.
      expect(JSON.stringify(res)).not.toMatch(/invalid_grant|revoked/);
    }
  });

  it("10. token sa neobjaví v zlyhanej odpovedi", async () => {
    const res = await resolveConciergeAccessToken(
      deps({ getAccessToken: async () => null }),
    );
    expect(JSON.stringify(res)).not.toContain(SECRET_TOKEN);
    expect(JSON.stringify(res)).not.toContain("ya29.");
  });
});

describe("B08 — okno, upstream a kolízie", () => {
  it("5. upstream zlyhanie Google nevráti žiadny voľný slot", async () => {
    const fetchImpl = (async () =>
      new Response("nope", { status: 500 })) as unknown as typeof fetch;
    const res = await fetchConciergeFreeBusy(
      {
        agencyId: "a",
        calendarId: "primary",
        timeMin: "2026-09-24T08:00:00+02:00",
        timeMax: "2026-09-24T18:00:00+02:00",
        accessToken: SECRET_TOKEN,
      },
      fetchImpl,
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("upstream_error");
      // Žiadne `busy: []`, ktoré by sa dalo čítať ako „celý deň voľný".
      expect(res).not.toHaveProperty("busy");
    }
  });

  it("6. neplatné okno", () => {
    expect(validateFreeBusyWindow("nonsense", "2026-09-24T10:00:00Z").ok).toBe(false);
    expect(
      validateFreeBusyWindow("2026-09-24T10:00:00Z", "2026-09-24T09:00:00Z").ok,
    ).toBe(false);
  });

  it("7. okno dlhšie než 14 dní sa odmietne", () => {
    expect(
      validateFreeBusyWindow("2026-09-01T00:00:00Z", "2026-09-15T00:00:01Z").ok,
    ).toBe(false);
    expect(
      validateFreeBusyWindow("2026-09-01T00:00:00Z", "2026-09-15T00:00:00Z").ok,
    ).toBe(true);
  });

  it("8. okno v Europe/Bratislava ide na Google presne tak, ako prišlo", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ calendars: { primary: { busy: [] } } }), {
        status: 200,
      }),
    ) as unknown as typeof fetch;
    // +02:00 je letný čas Bratislavy; posun sa nesmie cestou stratiť.
    const timeMin = "2026-09-24T09:00:00+02:00";
    const timeMax = "2026-09-24T17:00:00+02:00";
    await fetchConciergeFreeBusy(
      { agencyId: "a", calendarId: "primary", timeMin, timeMax, accessToken: SECRET_TOKEN },
      fetchImpl,
    );
    const body = JSON.parse(
      (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    );
    expect(body.timeMin).toBe(timeMin);
    expect(body.timeMax).toBe(timeMax);
  });

  it("9. kolízia s busy intervalom sa nepovažuje za voľno", () => {
    const merged = mergeBusyIntervals([
      { start: "2026-09-24T09:00:00+02:00", end: "2026-09-24T10:30:00+02:00" },
      { start: "2026-09-24T10:00:00+02:00", end: "2026-09-24T11:00:00+02:00" },
    ]);
    expect(merged).toHaveLength(1);
    // Navrhovaný slot 10:15–10:45 padne dovnútra zlúčeného bloku.
    const slotStart = Date.parse("2026-09-24T10:15:00+02:00");
    const slotEnd = Date.parse("2026-09-24T10:45:00+02:00");
    const collides = merged.some(
      (b) => Date.parse(b.start) < slotEnd && Date.parse(b.end) > slotStart,
    );
    expect(collides).toBe(true);
  });
});
