/**
 * Cenník v2 — OFFLINE integračný tok (W3-QA, nezávislé).
 *
 * Reálne moduly: parser požiadavky, builder Checkout params, trasa checkout, trasa webhook,
 * handlePricingCheckoutWebhook, handleStripeWebhookEvent, grant-engine, monthly-cycle, mutate-credits,
 * klientský parser vetvy B (submitPricingV2Checkout). Falošné: Stripe SDK (zachytáva params),
 * auth, Supabase klient (in-memory agencies/profiles/credit_ledger + RPC s atómovým ledgerom).
 * Žiadna sieť, žiadna DB, žiadne tajomstvá.
 *
 * Spustenie: vitest.config.ts tento priečinok nezahŕňa do `include`; spusti s konfiguráciou,
 * ktorá má include: ["tests/integration/**\/*.test.ts"].
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown> & { id: string };

const h = vi.hoisted(() => ({
  /** Skutočný stav predplatného zo Stripe pri plnení checkoutu (predvolene živé). */
  subStatus: "active",
  created: [] as Array<Record<string, any>>,
  getCurrentUser: vi.fn(),
  getCurrentProfile: vi.fn(),
  syncTierSpy: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: vi.fn(function StripePlaceholder(this: Record<string, unknown>) {
    this.checkout = {
      sessions: {
        create: async (params: Record<string, any>) => {
          h.created.push(params);
          return { id: `cs_test_${h.created.length}`, url: `https://checkout.example/cs_${h.created.length}` };
        },
      },
    };
    this.subscriptions = {
      retrieve: async (id: string) => ({ id, status: h.subStatus, customer: "cus_test" }),
    };
    // legacy syncAccountTier (neznáme price ID) by sa dostal sem cez customers.retrieve
    this.customers = {
      retrieve: async (id: string) => {
        h.syncTierSpy(id);
        return { id, deleted: false, email: "x@example.com" };
      },
    };
    return undefined;
  }),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: (...a: unknown[]) => h.getCurrentUser(...a),
  getCurrentProfile: (...a: unknown[]) => h.getCurrentProfile(...a),
}));

vi.mock("@/lib/auto-error-capture", () => ({
  autoErrorCapture: (error: unknown) => ({ error: error instanceof Error ? error.message : "error" }),
}));

// ---------------------------------------------------------------------------
// In-memory Supabase (agencies, profiles, credit_ledger) + RPC s atómovým ledgerom
// ---------------------------------------------------------------------------
const db = {
  agencies: [] as Row[],
  profiles: [] as Row[],
  ledger: [] as Array<{ key: string; agencyId: string; kind: string; amount: number }>,
  profileUpdates: [] as Array<{ payload: Record<string, unknown>; col: string; val: unknown }>,
  agencyUpdates: [] as Array<{ payload: Record<string, unknown>; col: string; val: unknown }>,
  /** Simuluje DB bez v2 stĺpcov (migrácia nebola aplikovaná). */
  missingV2Columns: false,
};
const V2_COLS = ["pricing_model", "pricing_band", "pack_credits", "subscription_status", "licensed_users"];
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

function project(row: Row, cols: string): Record<string, unknown> {
  if (cols.trim() === "*") return { ...row };
  const out: Record<string, unknown> = {};
  for (const c of cols.split(",").map((s) => s.trim())) out[c] = row[c] ?? null;
  return out;
}

function makeClient() {
  return {
    from: (table: string) => {
      const rows = (): Row[] => (table === "agencies" ? db.agencies : table === "profiles" ? db.profiles : []);
      return {
        select: (cols: string) => {
          const filters: Array<(r: Row) => boolean> = [];
          let ledgerKey: string | null = null;
          const run = async () => {
            await tick(); // vynúti prekladanie súbežných volaní
            if (db.missingV2Columns && V2_COLS.some((c) => cols.includes(c))) {
              return { data: null, error: { code: "42703", message: "column does not exist" } };
            }
            if (table === "credit_ledger") {
              const f = db.ledger
                .map((l) => ({ id: l.key, idempotency_key: l.key }))
                .filter((r) => ledgerKey === null || r.idempotency_key === ledgerKey);
              return { data: f, error: null };
            }
            return { data: rows().filter((r) => filters.every((f) => f(r))).map((r) => project(r, cols)), error: null };
          };
          const q: any = {
            eq: (col: string, val: unknown) => {
              if (table === "credit_ledger" && col === "idempotency_key") ledgerKey = String(val);
              filters.push((r) => r[col] === val);
              return q;
            },
            gt: (col: string, n: number) => {
              filters.push((r) => Number(r[col] ?? 0) > n);
              return q;
            },
            maybeSingle: async () => {
              const res = await run();
              return { data: (res.data as any[] | null)?.[0] ?? null, error: res.error };
            },
            then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => run().then(resolve, reject),
          };
          return q;
        },
        update: (payload: Record<string, unknown>) => ({
          eq: (col: string, val: unknown) => {
            const log = table === "agencies" ? db.agencyUpdates : db.profileUpdates;
            log.push({ payload, col, val });
            const matched = rows().filter((r) => r[col] === val);
            matched.forEach((r) => Object.assign(r, payload));
            const res = { data: matched.map((r) => ({ id: r.id })), error: null };
            return Object.assign(Promise.resolve(res), { select: () => Promise.resolve(res) });
          },
        }),
        insert: async () => ({ error: null }),
      };
    },
    rpc: async (name: string, a: Record<string, any>) => {
      await tick();
      const ag = db.agencies.find((r) => r.id === a.p_agency_id);
      if (!ag) return { data: { ok: false, error: "agency_not_found" }, error: null };
      const key = a.p_idempotency_key as string;
      if (name === "apply_monthly_grant_credits") {
        if (db.ledger.some((l) => l.key === key)) return { data: { ok: true, skipped: true }, error: null };
        db.ledger.push({ key, agencyId: ag.id, kind: "grant", amount: a.p_amount });
        ag.grant_credits_balance = Number(ag.grant_credits_balance ?? 0) + a.p_amount;
        ag.credits_balance = Number(ag.grant_credits_balance) + Number(ag.purchased_credits_balance ?? 0);
        return { data: { ok: true, granted: a.p_amount }, error: null };
      }
      if (name === "apply_credit_purchase") {
        if (db.ledger.some((l) => l.key === key)) return { data: { ok: true, skipped: true, credited: 0 }, error: null };
        db.ledger.push({ key, agencyId: ag.id, kind: "purchase", amount: a.p_amount });
        ag.purchased_credits_balance = Number(ag.purchased_credits_balance ?? 0) + a.p_amount;
        ag.credits_balance = Number(ag.grant_credits_balance ?? 0) + Number(ag.purchased_credits_balance);
        return { data: { ok: true, credited: a.p_amount }, error: null };
      }
      if (name === "expire_grant_credits") {
        if (db.ledger.some((l) => l.key === key)) return { data: { ok: true, skipped: true }, error: null };
        const expired = Number(ag.grant_credits_balance ?? 0);
        db.ledger.push({ key, agencyId: ag.id, kind: "expiry", amount: expired });
        ag.grant_credits_balance = 0;
        ag.credits_balance = Number(ag.purchased_credits_balance ?? 0);
        return { data: { ok: true, expired }, error: null };
      }
      return { data: null, error: { message: `unknown rpc ${name}` } };
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({ createServiceRoleClient: () => makeClient() }));
// billing-store: reálny, len verifikáciu podpisu nahradíme parsovaním JSON (žiadny Stripe secret).
vi.mock("@/lib/billing-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/billing-store")>();
  return { ...actual, verifyStripeWebhook: (payload: string) => JSON.parse(payload) };
});

import { POST as checkoutPOST } from "@/app/api/billing/credits/checkout/route";
import { GET as configGET } from "@/app/api/billing/checkout-config/route";
import { POST as webhookPOST } from "@/app/api/billing/webhook/route";
import { handlePricingCheckoutWebhook } from "@/lib/credits-billing-webhook";
import { handleStripeWebhookEvent } from "@/lib/billing-store";
import { runMonthlyCreditCycle } from "@/lib/credits/monthly-cycle";
import { buildPricingV2Catalog, PRICING_V2_BANDS, PRICING_V2_MONTHLY_PACKS, grossCentsFromNet } from "@/lib/pricing-v2";
import { parsePricingV2CheckoutRequest, PRICING_V2_BAND_ACCOUNT_TIER } from "@/lib/pricing-v2-contract";
import { submitPricingV2Checkout } from "@/components/billing/v2/checkout";
import { readPricingV2Config } from "@/components/billing/v2/usePricingV2Config";

const PRICE = {
  STRIPE_PRICE_V2_START: "price_v2StartAAAA",
  STRIPE_PRICE_V2_TEAM: "price_v2TeamBBBB",
  STRIPE_PRICE_V2_OFFICE: "price_v2OfficeCCCC",
  STRIPE_PRICE_V2_NETWORK: "price_v2NetworkDDDD",
  STRIPE_PRICE_V2_PACK_60: "price_v2Pack60AAA",
  STRIPE_PRICE_V2_PACK_120: "price_v2Pack120AA",
  STRIPE_PRICE_V2_PACK_180: "price_v2Pack180AA",
  STRIPE_PRICE_V2_PACK_240: "price_v2Pack240AA",
  STRIPE_PRICE_V2_PACK_300: "price_v2Pack300AA",
  STRIPE_PRICE_V2_CREDIT: "price_v2CreditEEEE",
};

const AG = "ag-1";
let evtSeq = 0;

function freshAgency(over: Partial<Row> = {}): Row {
  return {
    id: AG,
    seats: 0,
    account_tier: "free",
    grant_credits_balance: 0,
    purchased_credits_balance: 0,
    owner_cockpit_active: false,
    credits_balance: 0,
    pricing_model: null,
    pricing_band: null,
    pack_credits: 0,
    licensed_users: null,
    subscription_status: null,
    stripe_subscription_id: null,
    manual_plan: null,
    ...over,
  };
}

function req(body: unknown) {
  return new Request("http://localhost/api/billing/credits/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function sessionEvent(metadata: Record<string, string>, over: Record<string, unknown> = {}, id?: string) {
  return {
    id: id ?? `evt_${++evtSeq}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_paid_1",
        object: "checkout.session",
        mode: "subscription",
        payment_status: "paid",
        customer: "cus_1",
        subscription: "sub_1",
        metadata,
        ...over,
      },
    },
  } as any;
}

function subEvent(type: string, over: Record<string, unknown> = {}, priceIds: string[] = [PRICE.STRIPE_PRICE_V2_TEAM]) {
  return {
    id: `evt_${++evtSeq}`,
    type,
    data: {
      object: {
        id: "sub_1",
        customer: "cus_1",
        status: "active",
        items: { data: priceIds.map((p) => ({ price: { id: p } })) },
        ...over,
      },
    },
  } as any;
}

function webhookReq(event: unknown) {
  return new Request("http://localhost/api/billing/webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig_x" },
    body: JSON.stringify(event),
  });
}

/** Požiadavka -> reálna trasa checkout -> zachytené Stripe params (metadáta pre webhook). */
async function doCheckout(body: Record<string, unknown>) {
  const res = await checkoutPOST(req(body));
  const json = await res.json();
  return { res, json, params: h.created[h.created.length - 1] };
}

const agency = () => db.agencies.find((a) => a.id === AG)!;
const grants = () => db.ledger.filter((l) => l.kind === "grant");

beforeEach(() => {
  evtSeq = 0;
  h.subStatus = "active";
  h.created.length = 0;
  h.syncTierSpy.mockClear();
  db.agencies = [freshAgency()];
  db.profiles = [{ id: "prof-1", auth_user_id: "auth-1", agency_id: AG }];
  db.ledger = [];
  db.profileUpdates = [];
  db.agencyUpdates = [];
  db.missingV2Columns = false;
  h.getCurrentUser.mockResolvedValue({ id: "auth-1", email: "owner@example.com" });
  h.getCurrentProfile.mockResolvedValue({ id: "prof-1", agency_id: AG });
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
  vi.stubEnv("PRICING_V2_ENABLED", "true");
  // Režim „celý cenník“ (balíky + kredit sa predávajú); režim „len plány“ je v plans-only testoch.
  vi.stubEnv("PRICING_V2_PLANS_ONLY", "false");
  for (const [k, v] of Object.entries(PRICE)) vi.stubEnv(k, v);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("(a) požiadavka -> checkout -> webhook -> entitlements -> prvý grant", () => {
  it("Team 3 používatelia + balík 120: pásmo, seats, tier, grant 60+120 práve raz; sumy sedia s katalógom", async () => {
    const parsed = parsePricingV2CheckoutRequest({ checkoutType: "pricing_v2", users: 3, packCredits: 120 });
    expect(parsed.ok).toBe(true);
    const { res, json, params } = await doCheckout({ checkoutType: "pricing_v2", users: 3, packCredits: 120 });
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(params.mode).toBe("subscription");
    expect(params.line_items).toEqual([
      { price: PRICE.STRIPE_PRICE_V2_TEAM, quantity: 1 },
      { price: PRICE.STRIPE_PRICE_V2_PACK_120, quantity: 1 },
    ]);
    expect(params.metadata.agencyId).toBe(AG);

    const ev = sessionEvent(params.metadata);
    expect(await handlePricingCheckoutWebhook(ev)).toBe(true);
    const a = agency();
    expect(a).toMatchObject({
      pricing_model: "v2",
      pricing_band: "team",
      licensed_users: 3,
      seats: 3,
      account_tier: PRICING_V2_BAND_ACCOUNT_TIER.team,
      pack_credits: 120,
      subscription_status: "active",
      stripe_subscription_id: "sub_1",
    });
    expect(grants()).toHaveLength(1);
    expect(grants()[0].amount).toBe(60 + 120);
    expect(a.grant_credits_balance).toBe(180);

    const cat = buildPricingV2Catalog();
    const team = cat.bands.find((b) => b.id === "team")!;
    const pack = cat.packs.find((p) => p.credits === 120)!;
    expect([team.netCents, team.grossCents, pack.netCents, pack.grossCents]).toEqual([6000, 7380, 6200, 7626]);
  });

  it("jednorazové kredity: množstvo = počet, purchased pool, žiadny mesačný grant", async () => {
    const { params } = await doCheckout({ checkoutType: "pricing_v2_credits", credits: 40 });
    expect(params.mode).toBe("payment");
    expect(params.line_items).toEqual([{ price: PRICE.STRIPE_PRICE_V2_CREDIT, quantity: 40 }]);
    const ev = sessionEvent(params.metadata, { mode: "payment", subscription: null });
    expect(await handlePricingCheckoutWebhook(ev)).toBe(true);
    expect(agency().purchased_credits_balance).toBe(40);
    expect(grants()).toHaveLength(0);
  });
});

describe("(b) duplicitný a súbežný event", () => {
  it("rovnaký event 2x a Promise.all -> jeden grant", async () => {
    const { params } = await doCheckout({ checkoutType: "pricing_v2", users: 1, packCredits: null });
    const ev = sessionEvent(params.metadata);
    expect(await handlePricingCheckoutWebhook(ev)).toBe(true);
    expect(await handlePricingCheckoutWebhook(ev)).toBe(true);
    const rs = await Promise.all([1, 2, 3].map(() => handlePricingCheckoutWebhook(ev)));
    expect(rs).toEqual([true, true, true]);
    expect(grants()).toHaveLength(1);
    expect(agency().grant_credits_balance).toBe(25);
  });

  it("súbežne od nuly (Promise.all pred akýmkoľvek zápisom) -> jeden grant", async () => {
    const { params } = await doCheckout({ checkoutType: "pricing_v2", users: 7, packCredits: null });
    const ev = sessionEvent(params.metadata);
    await Promise.all([handlePricingCheckoutWebhook(ev), handlePricingCheckoutWebhook(ev)]);
    expect(grants()).toHaveLength(1);
    expect(agency().grant_credits_balance).toBe(120);
  });

  it("iné event.id, tá istá session -> žiadny druhý grant", async () => {
    const { params } = await doCheckout({ checkoutType: "pricing_v2", users: 2, packCredits: null });
    await handlePricingCheckoutWebhook(sessionEvent(params.metadata, {}, "evt_A"));
    await handlePricingCheckoutWebhook(sessionEvent(params.metadata, {}, "evt_B"));
    expect(grants()).toHaveLength(1);
  });

  it("async_payment_succeeded po completed(unpaid) plní práve raz", async () => {
    const { params } = await doCheckout({ checkoutType: "pricing_v2", users: 2, packCredits: null });
    const unpaid = sessionEvent(params.metadata, { payment_status: "unpaid" });
    expect(await handlePricingCheckoutWebhook(unpaid)).toBe(true);
    expect(grants()).toHaveLength(0);
    expect(agency().pricing_model).toBeNull();
    const paid = { ...sessionEvent(params.metadata), type: "checkout.session.async_payment_succeeded" };
    expect(await handlePricingCheckoutWebhook(paid)).toBe(true);
    expect(grants()).toHaveLength(1);
  });
});

describe("(c) obnova mesiaca (cron)", () => {
  it("nasledujúci mesiac: nový grant = kredity pásma + balík (nenarastá); ten istý mesiac 2x = 1 grant", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T10:00:00Z"));
    const { params } = await doCheckout({ checkoutType: "pricing_v2", users: 3, packCredits: 60 });
    await handlePricingCheckoutWebhook(sessionEvent(params.metadata));
    expect(agency().grant_credits_balance).toBe(120);

    const same = await runMonthlyCreditCycle();
    expect(same.ok).toBe(true);
    expect(grants()).toHaveLength(1);

    vi.setSystemTime(new Date("2026-11-01T05:00:00Z"));
    const r1 = await runMonthlyCreditCycle();
    expect(r1.ok).toBe(true);
    expect(grants()).toHaveLength(2);
    expect(agency().grant_credits_balance).toBe(120); // nie 240: starý grant exspiroval
    const r2 = await runMonthlyCreditCycle();
    expect(r2.ok).toBe(true);
    expect(grants()).toHaveLength(2);
  });

  it("cron bez v2 stĺpcov v DB: spadne na legacy stĺpce a legacy agentúra sa grantuje", async () => {
    db.missingV2Columns = true;
    db.agencies = [freshAgency({ seats: 3, account_tier: "pro" })];
    const r = await runMonthlyCreditCycle();
    expect(r.ok).toBe(true);
    expect(grants()).toHaveLength(1);
  });
});

describe("(d) zlyhaná platba / stav != active -> žiadny grant", () => {
  it("subscription.updated past_due/unpaid/canceled/... -> cron negrantuje; syncAccountTier sa nevolá", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T10:00:00Z"));
    const { params } = await doCheckout({ checkoutType: "pricing_v2", users: 3, packCredits: null });
    await handlePricingCheckoutWebhook(sessionEvent(params.metadata));
    for (const status of ["past_due", "unpaid", "canceled", "incomplete_expired", "paused"]) {
      await handleStripeWebhookEvent(subEvent("customer.subscription.updated", { status }));
      expect(agency().subscription_status).toBe(status);
    }
    vi.setSystemTime(new Date("2026-11-01T05:00:00Z"));
    await runMonthlyCreditCycle();
    expect(grants()).toHaveLength(1);
    expect(h.syncTierSpy).not.toHaveBeenCalled();
  });

  it("invoice.payment_failed samo o sebe NEMENÍ subscription_status (stav prichádza až so subscription.updated)", async () => {
    const { params } = await doCheckout({ checkoutType: "pricing_v2", users: 3, packCredits: null });
    await handlePricingCheckoutWebhook(sessionEvent(params.metadata));
    await handleStripeWebhookEvent({
      id: "evt_inv",
      type: "invoice.payment_failed",
      data: { object: { id: "in_1", customer: "cus_1", subscription: "sub_1" } },
    } as any);
    expect(agency().subscription_status).toBe("active");
  });
});

describe("(e) zmena pásma cez subscription.updated", () => {
  it("Team -> Office (+pack 180): pásmo, tier, pack, seats zovreté do pásma; syncAccountTier sa nevolá", async () => {
    const { params } = await doCheckout({ checkoutType: "pricing_v2", users: 3, packCredits: null });
    await handlePricingCheckoutWebhook(sessionEvent(params.metadata));
    await handleStripeWebhookEvent(
      subEvent("customer.subscription.updated", {}, [PRICE.STRIPE_PRICE_V2_OFFICE, PRICE.STRIPE_PRICE_V2_PACK_180]),
    );
    expect(agency()).toMatchObject({
      pricing_band: "office",
      account_tier: "enterprise",
      pack_credits: 180,
      licensed_users: 7,
      seats: 7,
    });
    expect(h.syncTierSpy).not.toHaveBeenCalled();
  });

  it("podvrhnuté neznáme price ID v subscription.updated pre v2 agentúru: nezmení pásmo ani tier", async () => {
    const { params } = await doCheckout({ checkoutType: "pricing_v2", users: 3, packCredits: null });
    await handlePricingCheckoutWebhook(sessionEvent(params.metadata));
    await handleStripeWebhookEvent(subEvent("customer.subscription.updated", {}, ["price_totallyUnknown1"]));
    expect(agency()).toMatchObject({ pricing_band: "team", account_tier: "pro" });
  });

  it("dve pásma naraz (nejednoznačné) -> pásmo sa nemení, stav áno", async () => {
    const { params } = await doCheckout({ checkoutType: "pricing_v2", users: 3, packCredits: null });
    await handlePricingCheckoutWebhook(sessionEvent(params.metadata));
    await handleStripeWebhookEvent(
      subEvent("customer.subscription.updated", { status: "past_due" }, [PRICE.STRIPE_PRICE_V2_START, PRICE.STRIPE_PRICE_V2_NETWORK]),
    );
    expect(agency()).toMatchObject({ pricing_band: "team", subscription_status: "past_due" });
  });
});

describe("(f) zrušenie", () => {
  it("subscription.deleted: canceled, tier free, pack 0; cron negrantuje; syncAccountTier sa nevolá", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T10:00:00Z"));
    const { params } = await doCheckout({ checkoutType: "pricing_v2", users: 3, packCredits: 60 });
    await handlePricingCheckoutWebhook(sessionEvent(params.metadata));
    await handleStripeWebhookEvent(
      subEvent("customer.subscription.deleted", { status: "canceled" }, [PRICE.STRIPE_PRICE_V2_TEAM, PRICE.STRIPE_PRICE_V2_PACK_60]),
    );
    expect(agency()).toMatchObject({ subscription_status: "canceled", account_tier: "free", pack_credits: 0 });
    vi.setSystemTime(new Date("2026-11-01T05:00:00Z"));
    await runMonthlyCreditCycle();
    expect(grants()).toHaveLength(1);
    expect(h.syncTierSpy).not.toHaveBeenCalled();
  });

  // W3-QA P1, opravené: stav predplatného sa pri plnení berie zo Stripe, nie z udalosti.
  it("oneskorený/zopakovaný checkout.session.completed PO zrušení nesmie reaktivovať predplatné", async () => {
    const { params } = await doCheckout({ checkoutType: "pricing_v2", users: 3, packCredits: null });
    await handlePricingCheckoutWebhook(sessionEvent(params.metadata));
    await handleStripeWebhookEvent(subEvent("customer.subscription.deleted", { status: "canceled" }));
    expect(agency().subscription_status).toBe("canceled");
    h.subStatus = "canceled"; // Stripe po zrušení hlási canceled
    const grantsBefore = db.ledger.length;
    await handlePricingCheckoutWebhook(sessionEvent(params.metadata, {}, "evt_replay"));
    expect(agency().subscription_status).toBe("canceled");
    expect(db.ledger.length).toBe(grantsBefore);
  });

  it("out-of-order: deleted pred completed -> opozdený completed predplatné neaktivuje a nepridelí grant", async () => {
    const { params } = await doCheckout({ checkoutType: "pricing_v2", users: 3, packCredits: null });
    h.subStatus = "canceled"; // predplatné bolo zrušené ešte pred doručením completed
    const ok = await handlePricingCheckoutWebhook(sessionEvent(params.metadata));
    expect(ok).toBe(true);
    expect(agency().subscription_status).not.toBe("active");
    expect(db.ledger.length).toBe(0);
  });
});

describe("(g) legacy agentúra (pricing_model NULL)", () => {
  it("rovnaký grant ako seat výpočet", async () => {
    db.agencies = [freshAgency({ seats: 4, account_tier: "pro", subscription_status: null })];
    const r = await runMonthlyCreditCycle();
    expect(r.ok).toBe(true);
    const { monthlyAgencyGrantCredits } = await import("@/lib/program-tier-pricing");
    expect(grants()[0].amount).toBe(monthlyAgencyGrantCredits({ seatTier: "team", seatCount: 4, ownerCockpitActive: false }));
  });

  it("legacy agentúra s živým predplatným: v2 checkout 409 legacy_subscription, žiadna Stripe session", async () => {
    db.agencies = [freshAgency({ seats: 4, account_tier: "pro", subscription_status: "active", stripe_subscription_id: "sub_old" })];
    const { res, json } = await doCheckout({ checkoutType: "pricing_v2", users: 3, packCredits: null });
    expect(res.status).toBe(409);
    expect(json.code).toBe("legacy_subscription");
    expect(h.created).toHaveLength(0);
  });

  it("legacy s ručným plánom (manual_plan) a bez Stripe id: 409", async () => {
    db.agencies = [freshAgency({ manual_plan: "reference" })];
    const { res } = await doCheckout({ checkoutType: "pricing_v2", users: 3, packCredits: null });
    expect(res.status).toBe(409);
  });

  it("webhook s PLATNÝMI v2 metadátami pre legacy agentúru: 500, nič sa nezmení", async () => {
    db.agencies = [freshAgency({ seats: 4, account_tier: "pro", subscription_status: "active", stripe_subscription_id: "sub_old" })];
    const meta = { checkoutType: "pricing_v2", agencyId: AG, authUserId: "auth-1", profileId: "p", bandId: "team", users: "3", packCredits: "0" };
    const res = await webhookPOST(webhookReq(sessionEvent(meta)));
    expect(res.status).toBe(500);
    expect(agency()).toMatchObject({ pricing_model: null, account_tier: "pro", seats: 4 });
    expect(grants()).toHaveLength(0);
  });

  it("subscription.deleted s legacy price ID pre legacy agentúru ide cez legacy vetvu (syncAccountTier), nie v2", async () => {
    db.agencies = [freshAgency({ seats: 4, account_tier: "pro", stripe_subscription_id: "sub_old", subscription_status: "active" })];
    await handleStripeWebhookEvent(subEvent("customer.subscription.deleted", { status: "canceled" }, ["price_legacyUnknown1"]));
    expect(agency()).toMatchObject({ pricing_model: null, account_tier: "pro", subscription_status: "active" });
    expect(h.syncTierSpy).toHaveBeenCalled();
  });
});

describe("(h) vypnutý prepínač = legacy", () => {
  beforeEach(() => {
    vi.stubEnv("PRICING_V2_ENABLED", "");
  });

  it("checkout v2 -> 404 pricing_v2_disabled, žiadna Stripe session; config bez katalógu", async () => {
    for (const body of [
      { checkoutType: "pricing_v2", users: 3 },
      { checkoutType: "pricing_v2_credits", credits: 10 },
      { checkoutType: "pricing_v2", users: 0 },
    ]) {
      const { res, json } = await doCheckout(body);
      expect(res.status).toBe(404);
      expect(json.code).toBe("pricing_v2_disabled");
    }
    expect(h.created).toHaveLength(0);
    const cfg = await (await configGET()).json();
    expect(cfg.pricingV2).toEqual({ enabled: false, checkoutAvailable: false, missingPriceEnvKeys: [], catalog: null });
    expect(readPricingV2Config(cfg)).toBeNull();
  });

  it("legacy agentúra sa pri vypnutom prepínači grantuje rovnako", async () => {
    db.agencies = [freshAgency({ seats: 2, account_tier: "starter" })];
    expect((await runMonthlyCreditCycle()).ok).toBe(true);
    expect(grants()).toHaveLength(1);
  });

  it("DOKUMENTOVANÉ: už zaplatená v2 session sa plní aj pri vypnutom prepínači (zámer kontraktu)", async () => {
    const meta = { checkoutType: "pricing_v2", agencyId: AG, authUserId: "", profileId: "", bandId: "start", users: "1", packCredits: "0" };
    expect(await handlePricingCheckoutWebhook(sessionEvent(meta))).toBe(true);
    expect(agency().pricing_model).toBe("v2");
  });
});

describe("(i) hraničné počty používateľov celým reťazcom", () => {
  const cases: Array<[number, string, number]> = [
    [1, "start", 25],
    [2, "team", 60],
    [6, "team", 60],
    [7, "office", 120],
    [25, "office", 120],
    [26, "network", 175],
  ];
  it.each(cases)("%i používateľov -> %s, grant %i, tier podľa mapovania", async (users, band, credits) => {
    const { res, params } = await doCheckout({ checkoutType: "pricing_v2", users, packCredits: null });
    expect(res.status).toBe(200);
    expect(params.metadata.bandId).toBe(band);
    expect(params.line_items).toHaveLength(1);
    await handlePricingCheckoutWebhook(sessionEvent(params.metadata));
    expect(agency()).toMatchObject({
      pricing_band: band,
      licensed_users: users,
      seats: users,
      account_tier: PRICING_V2_BAND_ACCOUNT_TIER[band as keyof typeof PRICING_V2_BAND_ACCOUNT_TIER],
    });
    expect(grants().map((g) => g.amount)).toEqual([credits]);
    const b = PRICING_V2_BANDS.find((x) => x.id === band)!;
    expect(grossCentsFromNet(b.netCents)).toBe(Math.round(b.netCents * 1.23));
  });

  it("neplatné počty -> 400 invalid_request, žiadna session", async () => {
    for (const users of [0, -1, 1.5, "3", null, 1e21]) {
      const { res, json } = await doCheckout({ checkoutType: "pricing_v2", users });
      expect(res.status).toBe(400);
      expect(json.code).toBe("invalid_request");
    }
    expect(h.created).toHaveLength(0);
  });

  it("balík mimo 60/120/180/240/300 -> 400; platné balíky prejdú", async () => {
    for (const p of [1, 59, 61, 301, "120", -60]) {
      const { res } = await doCheckout({ checkoutType: "pricing_v2", users: 3, packCredits: p });
      expect(res.status).toBe(400);
    }
    for (const p of PRICING_V2_MONTHLY_PACKS.map((x) => x.credits)) {
      const { res } = await doCheckout({ checkoutType: "pricing_v2", users: 3, packCredits: p });
      expect(res.status).toBe(200);
    }
  });
});

describe("(j) sfalšované / neplatné metadáta -> hlasné zlyhanie (500), nie tiché OK", () => {
  const good = { checkoutType: "pricing_v2", agencyId: AG, authUserId: "auth-1", profileId: "p", bandId: "team", users: "3", packCredits: "0" };
  const bad: Array<[string, Record<string, string>]> = [
    ["chýba agencyId", { ...good, agencyId: "" }],
    ["nesúladné pásmo/počet", { ...good, bandId: "office" }],
    ["users mimo pásma (0)", { ...good, users: "0" }],
    ["users desatinné", { ...good, users: "2.5" }],
    ["packCredits mimo balíkov (100)", { ...good, packCredits: "100" }],
    ["packCredits záporné", { ...good, packCredits: "-60" }],
    ["neznáma agentúra", { ...good, agencyId: "ag-neexistuje" }],
  ];
  it.each(bad)("plán: %s", async (_n, meta) => {
    const res = await webhookPOST(webhookReq(sessionEvent(meta)));
    expect(res.status).toBe(500);
    expect(grants()).toHaveLength(0);
    expect(agency().pricing_model).toBeNull();
  });

  it("kredity: neplatné credits / chýbajúca agencyId -> 500", async () => {
    for (const meta of [
      { checkoutType: "pricing_v2_credits", agencyId: AG, credits: "0" },
      { checkoutType: "pricing_v2_credits", agencyId: AG, credits: "1.5" },
      { checkoutType: "pricing_v2_credits", agencyId: "", credits: "10" },
    ]) {
      const res = await webhookPOST(webhookReq(sessionEvent(meta)));
      expect(res.status).toBe(500);
    }
    expect(agency().purchased_credits_balance).toBe(0);
  });

  it("platná session bez subscription id -> 500", async () => {
    const res = await webhookPOST(webhookReq(sessionEvent(good, { subscription: null })));
    expect(res.status).toBe(500);
  });

  it("platná session: trasa 200 a legacy syncAccountTier sa nevolá", async () => {
    const res = await webhookPOST(webhookReq(sessionEvent(good)));
    expect(res.status).toBe(200);
    expect(grants()).toHaveLength(1);
    expect(h.syncTierSpy).not.toHaveBeenCalled();
  });
});

describe("tenant izolácia a tajomstvá", () => {
  it("agencyId z profilu volajúceho; telo s cudzím agencyId sa ignoruje", async () => {
    db.agencies.push(freshAgency({ id: "ag-victim" }));
    const { params } = await doCheckout({
      checkoutType: "pricing_v2",
      users: 3,
      packCredits: null,
      agencyId: "ag-victim",
      metadata: { agencyId: "ag-victim" },
    });
    expect(params.metadata.agencyId).toBe(AG);
    expect(JSON.stringify(params)).not.toContain("ag-victim");
  });

  it("v2 agentúra s živým v2 predplatným: druhý plánový checkout -> 409 subscription_exists", async () => {
    const { params } = await doCheckout({ checkoutType: "pricing_v2", users: 3, packCredits: null });
    await handlePricingCheckoutWebhook(sessionEvent(params.metadata));
    const { res, json } = await doCheckout({ checkoutType: "pricing_v2", users: 3, packCredits: null });
    expect(res.status).toBe(409);
    expect(json.code).toBe("subscription_exists");
  });

  it("chýbajúce ceny -> 503 prices_not_configured, len NÁZVY env, nie hodnoty", async () => {
    vi.stubEnv("STRIPE_PRICE_V2_TEAM", "price_xxx");
    const { res, json } = await doCheckout({ checkoutType: "pricing_v2", users: 3, packCredits: null });
    expect(res.status).toBe(503);
    expect(json.code).toBe("prices_not_configured");
    expect(json.missingPriceEnvKeys).toEqual(["STRIPE_PRICE_V2_TEAM"]);
    const all = JSON.stringify(json) + JSON.stringify(await (await configGET()).json());
    for (const v of Object.values(PRICE)) expect(all).not.toContain(v);
    expect(all).not.toContain("sk_test_dummy");
  });

  it("logy webhooku pri chybe neobsahujú tajomstvá ani podpis", async () => {
    const warn = vi.mocked(console.warn);
    const err = vi.mocked(console.error);
    await webhookPOST(webhookReq(sessionEvent({ checkoutType: "pricing_v2", agencyId: "", bandId: "team", users: "3", packCredits: "0" })));
    const logged = JSON.stringify([...warn.mock.calls, ...err.mock.calls]);
    expect(logged).not.toContain("sk_test_dummy");
    expect(logged).not.toContain("sig_x");
    for (const v of Object.values(PRICE)) expect(logged).not.toContain(v);
  });
});

describe("ŠVY A -> B: reálne handlery trás A -> reálny klientský parser B", () => {
  function stubFetchToRoute() {
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) =>
      checkoutPOST(new Request("http://localhost/api/billing/credits/checkout", init)),
    );
  }

  it("200 -> redirect na url", async () => {
    stubFetchToRoute();
    const out = await submitPricingV2Checkout({ checkoutType: "pricing_v2", users: 3, packCredits: null });
    expect(out).toEqual({ kind: "redirect", url: "https://checkout.example/cs_1" });
  });

  it("404 vypnuté -> pricing_v2_disabled", async () => {
    vi.stubEnv("PRICING_V2_ENABLED", "");
    stubFetchToRoute();
    const out = await submitPricingV2Checkout({ checkoutType: "pricing_v2", users: 3, packCredits: null });
    expect(out).toMatchObject({ kind: "error", code: "pricing_v2_disabled" });
  });

  it("409 legacy -> legacy_subscription", async () => {
    db.agencies = [freshAgency({ subscription_status: "active", stripe_subscription_id: "sub_old" })];
    stubFetchToRoute();
    const out = await submitPricingV2Checkout({ checkoutType: "pricing_v2", users: 3, packCredits: null });
    expect(out).toMatchObject({ kind: "error", code: "legacy_subscription" });
  });

  it("[ŠEV] 409 subscription_exists: klient ho nezlúči s legacy_subscription (oprava W3-fix č. 3)", async () => {
    const { params } = await doCheckout({ checkoutType: "pricing_v2", users: 3, packCredits: null });
    await handlePricingCheckoutWebhook(sessionEvent(params.metadata));
    stubFetchToRoute();
    const out = await submitPricingV2Checkout({ checkoutType: "pricing_v2", users: 3, packCredits: null });
    expect(out).toMatchObject({ kind: "error", code: "subscription_exists" });
    expect((out as { message?: string }).message ?? "").not.toContain("Predplatné máte dohodnuté");
  });

  it("503 prices_not_configured -> 'nie je dostupné'", async () => {
    vi.stubEnv("STRIPE_PRICE_V2_TEAM", "");
    stubFetchToRoute();
    const out = await submitPricingV2Checkout({ checkoutType: "pricing_v2", users: 3, packCredits: null });
    expect(out).toMatchObject({ kind: "error", code: "prices_not_configured" });
  });

  it("400 invalid_request -> invalid_request", async () => {
    stubFetchToRoute();
    const out = await submitPricingV2Checkout({ checkoutType: "pricing_v2", users: 0, packCredits: null } as any);
    expect(out).toMatchObject({ kind: "error", code: "invalid_request" });
  });

  it("checkout-config -> readPricingV2Config: katalóg a checkoutAvailable sedia", async () => {
    const cfg = readPricingV2Config(await (await configGET()).json());
    expect(cfg?.enabled).toBe(true);
    expect(cfg?.checkoutAvailable).toBe(true);
    expect(cfg?.catalog?.bands.map((b) => b.grossCents)).toEqual([3075, 7380, 18327, 42927]);
  });

  it("[ŠEV] výnimka v checkout (profil bez agency_id) -> 503 checkout_failed: klient ukáže 'nedostupné', nie 'skontrolujte počet'", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    h.getCurrentProfile.mockResolvedValue({ id: "p", agency_id: "" });
    stubFetchToRoute();
    const out = await submitPricingV2Checkout({ checkoutType: "pricing_v2", users: 3, packCredits: null });
    expect(out).toMatchObject({ kind: "error" });
    expect((out as { code?: string }).code).not.toBe("invalid_request");
  });
});
