// @vitest-environment node
/**
 * STARTER-PACK-GUARD — the /balik checkout must not send a malformed price ID
 * to Stripe.
 *
 * The route used `!STARTER_PACK_PRICE`, a truthiness check, on a module-level
 * const. A placeholder (`price_xxx`) or a value pasted with a trailing newline is
 * truthy, so it went straight to Stripe and the buyer met Stripe's error on the
 * pay button instead of an honest "not configured". The CRM guards every other
 * price with `isValidStripePriceId`; this route now uses the same predicate.
 *
 * Runs here because apps/marketing has no test runner; the route is imported by
 * relative path, the same way marketing/lib/pricing.ts imports the CRM.
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../../marketing/app/api/starter-pack/checkout/route";

const VALID = "price_1TKeYDGcD3230UbXESTERKUx";
const ENV_KEYS = ["STRIPE_SECRET_KEY", "STRIPE_PRICE_STARTER_PACK"] as const;

const saved: Record<string, string | undefined> = {};
let fetchMock: ReturnType<typeof vi.fn>;

function post(body: Record<string, unknown> = { email: "a@b.sk", marketingConsent: true }) {
  const req = new NextRequest("https://revolis.ai/api/starter-pack/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
  // apps/marketing resolves its own copy of `next`, so its NextRequest is a
  // different nominal type from the CRM's. Same runtime class shape.
  return POST(req as unknown as Parameters<typeof POST>[0]);
}

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  process.env.STRIPE_SECRET_KEY = "sk_test_fixture";
  process.env.STRIPE_PRICE_STARTER_PACK = VALID;
  fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ url: "https://checkout.stripe.com/c/pay/cs_test_1" }), {
      status: 200,
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
});

describe("STRIPE_PRICE_STARTER_PACK format guard", () => {
  it.each([
    ["empty", ""],
    ["placeholder price_xxx", "price_xxx"],
    ["placeholder with real-looking length", "price_xxxxxxxxxxxx"],
    ["a product id, not a price id", "prod_1TKeYDGcD3230UbX"],
    ["too short", "price_abc"],
    ["template text", "your_price_here"],
    ["space inside", "price_1TKeYDGc D3230UbX"],
    ["whitespace only", "   "],
  ])("%s → 503 checkout_not_configured and Stripe is never called", async (_label, value) => {
    process.env.STRIPE_PRICE_STARTER_PACK = value;
    const res = await post();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "checkout_not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("missing secret key → 503, Stripe is never called", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await post();
    expect(res.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a valid ID pasted with a trailing newline is sent trimmed", async () => {
    process.env.STRIPE_PRICE_STARTER_PACK = `${VALID}\n`;
    process.env.STRIPE_SECRET_KEY = "sk_test_fixture\n";
    const res = await post();
    expect(res.status).toBe(200);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.stripe.com/v1/checkout/sessions");
    const sent = new URLSearchParams(String(init.body));
    expect(sent.get("line_items[0][price]")).toBe(VALID);
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer sk_test_fixture",
    );
  });

  it("reads the env on every request, not once at import", async () => {
    process.env.STRIPE_PRICE_STARTER_PACK = "price_xxx";
    expect((await post()).status).toBe(503);
    process.env.STRIPE_PRICE_STARTER_PACK = VALID;
    expect((await post()).status).toBe(200);
  });
});

describe("unchanged behaviour", () => {
  it("email and consent are still checked before configuration", async () => {
    process.env.STRIPE_PRICE_STARTER_PACK = "price_xxx";
    expect((await post({ marketingConsent: true })).status).toBe(400);
    expect((await post({ email: "a@b.sk" })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the Stripe checkout URL on success", async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_test_1" });
  });

  it("a Stripe error becomes 502, not a crash", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "No such price" } }), { status: 400 }),
    );
    const res = await post();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "No such price" });
  });
});
