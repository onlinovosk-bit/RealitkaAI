/**
 * CHECKOUT-FAILCLOSED-01 — route, ktorá berie peniaze.
 *
 * Merané pred opravou: chýbajúca cockpit cena skončila ako **400** so správou
 * „Owner Cockpit Stripe price nie je nakonfigurovaný." v tele odpovede. Teda
 * stav tvrdil, že chybu urobil zákazník, a text mu ukázal našu internú
 * poznámku — v momente, keď chcel zaplatiť.
 *
 * Testy používajú SKUTOČNÝ `credits-billing` aj `program-tier-pricing`
 * (ceny sa nastavujú cez env, presne ako v PROD). Mockuje sa iba Stripe
 * a prihlásenie — inak by test overoval mock, nie bránu.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  getCurrentUser: vi.fn(),
  getCurrentProfile: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class {
    checkout = { sessions: { create: mocks.create } };
  },
}));
vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  getCurrentProfile: mocks.getCurrentProfile,
}));

import { POST } from "../route";

const AGENCY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const price = (n: number) => `price_fixture${String(n).padStart(8, "0")}`;

const SEAT_ENVS = {
  STRIPE_PRICE_SOLO_SEAT: price(1),
  STRIPE_PRICE_TEAM_SEAT: price(2),
  STRIPE_PRICE_OFFICE_SEAT: price(3),
};
const TOPUP_ENVS = {
  STRIPE_PRICE_CREDITS_START: price(4),
  STRIPE_PRICE_CREDITS_RAST: price(5),
  STRIPE_PRICE_CREDITS_PRO: price(6),
  STRIPE_PRICE_CREDITS_MEGA: price(7),
};
const ALL_PRICE_ENVS = [
  ...Object.keys(SEAT_ENVS),
  ...Object.keys(TOPUP_ENVS),
  "STRIPE_PRICE_OWNER_COCKPIT",
  "STRIPE_PRICE_OWNER_COCKPIT_FOUNDER",
];

let saved: Record<string, string | undefined> = {};

function post(body: unknown, raw = false) {
  return POST(
    new Request("http://localhost/api/billing/credits/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: raw ? (body as string) : JSON.stringify(body),
    }),
  );
}

const seatBody = (extra: Record<string, unknown> = {}) => ({
  checkoutType: "seat",
  seatTier: "team",
  quantity: 5,
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  saved = Object.fromEntries(
    [...ALL_PRICE_ENVS, "STRIPE_SECRET_KEY"].map((k) => [k, process.env[k]]),
  );
  for (const k of ALL_PRICE_ENVS) delete process.env[k];
  process.env.STRIPE_SECRET_KEY = "sk_test_fixture";
  Object.assign(process.env, SEAT_ENVS, TOPUP_ENVS);
  mocks.getCurrentUser.mockResolvedValue({ id: "u-1", email: "maklér@example.sk" });
  mocks.getCurrentProfile.mockResolvedValue({ id: "p-1", agency_id: AGENCY });
  mocks.create.mockResolvedValue({ id: "cs_1", url: "https://checkout.stripe.com/c/pay/cs_1" });
});

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

/** Žiadna odpoveď nesmie niesť našu internú hlášku. */
async function body(res: Response) {
  const json = (await res.json()) as { ok: boolean; error?: string; result?: unknown };
  const text = JSON.stringify(json);
  expect(text).not.toContain("Stripe price");
  expect(text).not.toContain("nakonfigurovan");
  expect(text).not.toContain("agency_id");
  return json;
}

describe("chýbajúca cena nie je chyba zákazníka", () => {
  it("vyžiadaný cockpit bez cockpit ceny → 503, nie 400", async () => {
    const res = await post(seatBody({ includeOwnerCockpit: true }));
    expect(res.status).toBe(503);
    await body(res);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("nastavená iba štandardná 349 € cena, kým platí founder 249 € → 503", async () => {
    // Dve ceny sú dva Stripe objekty bez fallbacku. Keby brána pozrela na tú
    // druhú, zákazník by zaplatil cenu, ktorú mu UI neukázalo.
    process.env.STRIPE_PRICE_OWNER_COCKPIT = price(8);
    const res = await post(seatBody({ includeOwnerCockpit: true }));
    expect(res.status).toBe(503);
    await body(res);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("chýbajúce seat ceny → 503", async () => {
    delete process.env.STRIPE_PRICE_TEAM_SEAT;
    const res = await post(seatBody());
    expect(res.status).toBe(503);
    await body(res);
  });

  it("chýbajúca top-up cena → 503", async () => {
    delete process.env.STRIPE_PRICE_CREDITS_MEGA;
    const res = await post({ checkoutType: "topup", topupPackage: "mega" });
    expect(res.status).toBe(503);
    await body(res);
  });

  it("profil bez agency_id → 503 a bez úniku, čo chýba", async () => {
    mocks.getCurrentProfile.mockResolvedValue({ id: "p-1", agency_id: null });
    const res = await post(seatBody());
    expect(res.status).toBe(503);
    await body(res);
  });
});

describe("400 patrí len tomu, čo pokazil volajúci", () => {
  it("nečitateľné telo → 400", async () => {
    const res = await post("{ toto nie je json", true);
    expect(res.status).toBe(400);
    await body(res);
  });

  it("neznámy typ checkoutu → 400", async () => {
    const res = await post({ checkoutType: "nieco-ine" });
    expect(res.status).toBe(400);
  });
});

describe("neočakávané zlyhanie nie je 400", () => {
  it("výpadok Stripe → 500 a jeho hláška zostáva v logu", async () => {
    mocks.create.mockRejectedValue(new Error("Stripe API: connection reset"));
    const res = await post(seatBody());
    expect(res.status).toBe(500);
    const json = await body(res);
    expect(JSON.stringify(json)).not.toContain("connection reset");
  });
});

describe("keď je všetko nastavené, predaj beží", () => {
  it("seat checkout bez cockpitu → jedna položka a URL", async () => {
    const res = await post(seatBody());
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; result: { url: string } };
    expect(json.ok).toBe(true);
    expect(json.result.url).toContain("checkout.stripe.com");
    expect(mocks.create.mock.calls[0][0].line_items).toHaveLength(1);
  });

  it("so založenou cockpit cenou idú do Stripe dve položky", async () => {
    process.env.STRIPE_PRICE_OWNER_COCKPIT_FOUNDER = price(9);
    const res = await post(seatBody({ includeOwnerCockpit: true }));
    expect(res.status).toBe(200);
    expect(mocks.create.mock.calls[0][0].line_items).toHaveLength(2);
  });
});
