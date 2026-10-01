import { describe, expect, it } from "vitest";
import { errorResponse, okResponse } from "@/lib/api-response";

/**
 * Pripína tvar odpovede, na ktorý sa prepísali concierge routy
 * (RATCHET-TRANCHE-1). Tie routy konzumuje widget na cudzom webe, takže
 * zmena tvaru je zmena verejného kontraktu, nie refaktor.
 *
 * Každý prípad tu je doslovný tvar, ktorý routa vracala PRED prepisom
 * ručným `NextResponse.json(...)`. Ak niekto zmení `okResponse` alebo
 * `errorResponse`, zhasne to tu — nie až u zákazníka.
 */
async function body(res: Response): Promise<unknown> {
  return JSON.parse(await res.text());
}

describe("api-response drží tvar, ktorý concierge routy vracali predtým", () => {
  it("errorResponse = { ok:false, error } a nič navyše", async () => {
    const res = errorResponse("Too many requests.", 429);
    expect(res.status).toBe(429);
    expect(await body(res)).toEqual({ ok: false, error: "Too many requests." });
  });

  it("errorResponse drží status z volajúceho (validated.status)", async () => {
    const res = errorResponse("Consent required.", 422);
    expect(res.status).toBe(422);
    expect(await body(res)).toEqual({ ok: false, error: "Consent required." });
  });

  it("okResponse({}) = { ok:true } — honeypot vetva v /callback", async () => {
    const res = okResponse({});
    expect(res.status).toBe(200);
    expect(await body(res)).toEqual({ ok: true });
  });

  it("okResponse spreaduje polia, nevnára ich do data", async () => {
    const res = okResponse({ leadId: "abc", duplicate: true });
    expect(await body(res)).toEqual({ ok: true, leadId: "abc", duplicate: true });
  });

  it("okResponse drží poradie aj obsah pre /properties", async () => {
    const res = okResponse({ agencyId: "a1", count: 0, properties: [] });
    expect(await body(res)).toEqual({
      ok: true,
      agencyId: "a1",
      count: 0,
      properties: [],
    });
  });

  it("okResponse drží tvar pre /freebusy", async () => {
    const res = okResponse({ calendarId: "primary", busy: [] });
    expect(await body(res)).toEqual({ ok: true, calendarId: "primary", busy: [] });
  });

  it("errorResponse NEVIE vyrobiť tvar { ok:false, reason, detail } bez kľúča error — preto /freebusy tú jednu vetvu nechal na NextResponse.json", async () => {
    const res = errorResponse("oauth_missing", 503, { reason: "oauth_missing" });
    expect(await body(res)).toHaveProperty("error");
  });
});
