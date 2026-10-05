import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPlanRequest, PRICING_V2_MESSAGES, submitPricingV2Checkout } from "../checkout";

function stubResponse(status: number, body: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response),
  );
}

afterEach(() => vi.unstubAllGlobals());

const REQ = buildPlanRequest(3, null);

describe("submitPricingV2Checkout: 409 rozlišuje legacy a existujúce v2 predplatné", () => {
  it("legacy_subscription -> pôvodný text (bajt po bajte)", async () => {
    stubResponse(409, { ok: false, error: "x", code: "legacy_subscription" });
    expect(await submitPricingV2Checkout(REQ)).toEqual({
      kind: "error",
      code: "legacy_subscription",
      message: "Predplatné máte dohodnuté. Pre zmenu nás prosím kontaktujte.",
    });
  });

  it("409 bez kódu ostáva legacy (správanie ako doteraz)", async () => {
    stubResponse(409, { ok: false, error: "x" });
    const out = await submitPricingV2Checkout(REQ);
    expect(out).toMatchObject({ kind: "error", code: "legacy_subscription", message: PRICING_V2_MESSAGES.legacySubscription });
  });

  it("subscription_exists -> iná hláška: kancelária už má predplatné, zmena pásma cez správu predplatného", async () => {
    stubResponse(409, { ok: false, error: "x", code: "subscription_exists" });
    const out = await submitPricingV2Checkout(REQ);
    expect(out).toEqual({
      kind: "error",
      code: "subscription_exists",
      message: "Vaša kancelária už má aktívne predplatné. Zmenu pásma urobíte v správe predplatného.",
    });
    if (out.kind !== "error") throw new Error("očakávaná chyba");
    expect(out.message).not.toMatch(/kontaktujte|dohodnuté/i);
    expect(out.message).not.toMatch(/https?:|href|\//); // žiadny odkaz, ktorý by neexistoval
  });

  it("ostatné kódy sa nezmenili (404 / 503 / 400 / neznámy)", async () => {
    stubResponse(404, { ok: false, code: "pricing_v2_disabled" });
    expect(await submitPricingV2Checkout(REQ)).toMatchObject({ code: "pricing_v2_disabled", message: PRICING_V2_MESSAGES.disabled });
    stubResponse(503, { ok: false, code: "prices_not_configured" });
    expect(await submitPricingV2Checkout(REQ)).toMatchObject({ code: "prices_not_configured", message: PRICING_V2_MESSAGES.unavailable });
    stubResponse(400, { ok: false, code: "invalid_request" });
    expect(await submitPricingV2Checkout(REQ)).toMatchObject({ code: "invalid_request", message: PRICING_V2_MESSAGES.invalid });
    stubResponse(500, { ok: false });
    expect(await submitPricingV2Checkout(REQ)).toMatchObject({ code: "unknown", message: PRICING_V2_MESSAGES.generic });
  });

  it("úspech vráti redirect", async () => {
    stubResponse(200, { ok: true, result: { url: "https://stripe.test/pay" } });
    expect(await submitPricingV2Checkout(REQ)).toEqual({ kind: "redirect", url: "https://stripe.test/pay" });
  });
});
