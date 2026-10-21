/**
 * CHECKOUT-ENV-01 — Stripe VERIFY must check exactly what the code sells.
 *
 * `scripts/ops/stripe-verify-prices.sh` is what the founder runs against live
 * Stripe (step A) and re-runs after creating prices by hand (step C). Its
 * expectations live in `scripts/ops/stripe-expected-prices.json`. If that file
 * drifts from `program-tier-pricing.ts`, VERIFY reports OK for a price the
 * checkout will charge at a different amount — or never checks a surface that
 * is live (the 47 € starter pack was missing from the original 9).
 *
 * Part 1 derives the list from the code and compares. Part 2 runs the script
 * offline (`--fixture`) against Stripe-shaped data, including the real
 * 2026-09-22 live snapshot (docs/reports/2026-09-22-stripe-verify-prices.md).
 *
 * Cenník v3 (GO 2026-10-19): licencia = 2 tiered (graduated) ceny, akcia 9/12 = kupón,
 * balíky 50–300 a kredit 0,75 €. Tiers sa porovnávajú s PRICING_V3_SEAT_TIERS a simulácia
 * graduated výpočtu z JSON sa porovnáva s licenseNetCents (pricing-v2.ts).
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COCKPIT_PRODUCTS,
  SEAT_TIERS,
  SEAT_TIER_CONFIG,
  SEAT_TIER_STRIPE_ENV,
  STARTER_PACK,
  TOPUP_PACKAGES,
} from "@/lib/program-tier-pricing";
import {
  PRICING_V2_CREDIT_NET_CENTS,
  PRICING_V2_MONTHLY_PACKS,
  PRICING_V3_PROMO_UNTIL,
  PRICING_V3_SEAT_TIERS,
  graduatedTierNetCents,
  licenseNetCents,
  type PricingV3Tier,
} from "@/lib/pricing-v2";
import {
  PRICING_V2_CREDIT_PRICE_ENV,
  PRICING_V2_PACK_PRICE_ENV,
  PRICING_V3_ANNUAL_PROMO_COUPON_ENV,
  PRICING_V3_SEAT_MONTHLY_PRICE_ENV,
  PRICING_V3_SEAT_YEARLY_PRICE_ENV,
} from "@/lib/pricing-v2-contract";

const OPS = resolve(__dirname, "../../../../scripts/ops");
const MANIFEST = join(OPS, "stripe-expected-prices.json");
const SCRIPT = join(OPS, "stripe_verify_prices.py");
const WRAPPER = join(OPS, "stripe-verify-prices.sh");

/** Tier v manifeste: `up_to` "inf" = bez hornej hranice (Stripe: null). */
type ManifestTier = { up_to: number | "inf"; flat_amount: number; unit_amount: number };
type Row = {
  env: string;
  amount?: number;
  type: "recurring" | "one_time";
  gate: string;
  interval?: "year";
  billing_scheme?: "tiered";
  tiers_mode?: "graduated";
  tiers?: ManifestTier[];
};
type ManifestFile = {
  prices: Array<Row & { product: string }>;
  coupons: Array<{
    env: string;
    name: string;
    percent_off: number;
    duration: string;
    redeem_by: number;
    redeem_by_iso: string;
    applies_to_product: string;
    gate: string;
  }>;
};

const LICENCE_PRODUCT = "Revolis licencia";
const PACK_PRODUCT = "Revolis balíky kreditov";

const tiersForManifest = (tiers: readonly PricingV3Tier[]): ManifestTier[] =>
  tiers.map((t) => ({ up_to: t.up_to === null ? "inf" : t.up_to, flat_amount: t.flat_amount, unit_amount: t.unit_amount }));

function rowsFromCode(): Row[] {
  const rows: Row[] = [];
  for (const tier of SEAT_TIERS) {
    rows.push({
      env: SEAT_TIER_STRIPE_ENV[tier],
      amount: SEAT_TIER_CONFIG[tier].priceEur * 100,
      type: "recurring",
      gate: "seat",
    });
  }
  for (const c of Object.values(COCKPIT_PRODUCTS)) {
    if (!c.enabled) continue;
    if (c.stripeEnvKey) {
      rows.push({ env: c.stripeEnvKey, amount: c.priceEur * 100, type: "recurring", gate: "cockpit" });
    }
    if (c.founderStripeEnvKey && c.founderPriceEur != null) {
      rows.push({
        env: c.founderStripeEnvKey,
        amount: c.founderPriceEur * 100,
        type: "recurring",
        gate: "cockpit",
      });
    }
  }
  for (const p of Object.values(TOPUP_PACKAGES)) {
    rows.push({ env: p.stripeEnvKey, amount: p.priceEur * 100, type: "one_time", gate: "topup" });
  }
  rows.push({
    env: STARTER_PACK.stripeEnvKey,
    amount: STARTER_PACK.priceEur * 100,
    type: "one_time",
    gate: "starter_pack",
  });
  // Cennik v3: sumy BEZ DPH v centoch. Licencia = 2 tiered graduated ceny (quantity = pocet maklerov),
  // baliky mesacne, kredit jednorazovo (qty = pocet kreditov).
  rows.push({
    env: PRICING_V3_SEAT_YEARLY_PRICE_ENV,
    type: "recurring",
    interval: "year",
    gate: "pricing_v2",
    billing_scheme: "tiered",
    tiers_mode: "graduated",
    tiers: tiersForManifest(PRICING_V3_SEAT_TIERS.year),
  });
  rows.push({
    env: PRICING_V3_SEAT_MONTHLY_PRICE_ENV,
    type: "recurring",
    gate: "pricing_v2",
    billing_scheme: "tiered",
    tiers_mode: "graduated",
    tiers: tiersForManifest(PRICING_V3_SEAT_TIERS.month),
  });
  for (const p of PRICING_V2_MONTHLY_PACKS) {
    rows.push({ env: PRICING_V2_PACK_PRICE_ENV[p.credits], amount: p.netCents, type: "recurring", gate: "pricing_v2" });
  }
  rows.push({
    env: PRICING_V2_CREDIT_PRICE_ENV,
    amount: PRICING_V2_CREDIT_NET_CENTS,
    type: "one_time",
    gate: "pricing_v2",
  });
  return rows;
}

function manifestFile(): ManifestFile {
  return JSON.parse(readFileSync(MANIFEST, "utf8")) as ManifestFile;
}

function rowsFromManifest(): Row[] {
  return manifestFile().prices.map(({ env, amount, type, gate, interval, billing_scheme, tiers_mode, tiers }) => ({
    env,
    ...(amount !== undefined ? { amount } : {}),
    type,
    gate,
    ...(interval ? { interval } : {}),
    ...(billing_scheme ? { billing_scheme, tiers_mode, tiers } : {}),
  }));
}

const byEnv = (a: Row, b: Row) => a.env.localeCompare(b.env);

describe("stripe-expected-prices.json ↔ program-tier-pricing.ts", () => {
  it("lists exactly the sellable prices, at the amounts, tiers and billing types the code charges", () => {
    expect(rowsFromManifest().sort(byEnv)).toEqual(rowsFromCode().sort(byEnv));
  });

  it("pricing v3 rows: 2 tiered licence prices + 6 packs + 1 credit, env NAMES from the frozen contract, no v2 leftovers", () => {
    const v3 = rowsFromManifest().filter((r) => r.gate === "pricing_v2");
    expect(v3).toHaveLength(2 + PRICING_V2_MONTHLY_PACKS.length + 1);
    expect(v3.sort(byEnv)).toEqual(rowsFromCode().filter((r) => r.gate === "pricing_v2").sort(byEnv));
    // Manifest nesmie niest hodnoty tajomstiev: len NAZVY env a nazvy produktov.
    for (const r of v3) expect(r.env).toMatch(/^STRIPE_PRICE_V3_[A-Z0-9_]+$/);
    expect(JSON.stringify(manifestFile())).not.toMatch(/STRIPE_PRICE_V2_|price_[A-Za-z0-9]{6,}|sk_live_|rk_live_|whsec_/);
  });

  it("does not ask for the disabled Owner Cockpit Pro", () => {
    const envs = rowsFromManifest().map((r) => r.env);
    expect(COCKPIT_PRODUCTS.ownerPro.enabled).toBe(false);
    expect(envs).not.toContain(COCKPIT_PRODUCTS.ownerPro.stripeEnvKey);
  });
});

describe("cenník v3: tiers, kupón, balíky, kredit v manifeste", () => {
  const licence = (interval: "year" | "month") =>
    manifestFile().prices.find((r) => r.env === (interval === "year" ? PRICING_V3_SEAT_YEARLY_PRICE_ENV : PRICING_V3_SEAT_MONTHLY_PRICE_ENV))!;

  it("licencia: jeden produkt, tiered graduated, recurring year/month, tiers presne podľa špecifikácie", () => {
    const year = licence("year");
    const month = licence("month");
    for (const r of [year, month]) {
      expect(r.product).toBe(LICENCE_PRODUCT);
      expect(r.billing_scheme).toBe("tiered");
      expect(r.tiers_mode).toBe("graduated");
      expect(r.type).toBe("recurring");
      expect(r.amount).toBeUndefined();
    }
    expect(year.interval).toBe("year");
    expect(month.interval).toBeUndefined(); // predvolené = month
    // Spec §2 doslova (nie z kódu): flat_amount sa pripočíta raz, keď množstvo zasiahne tier.
    expect(year.tiers).toEqual([
      { up_to: 1, flat_amount: 30000, unit_amount: 0 },
      { up_to: 2, flat_amount: 30000, unit_amount: 0 },
      { up_to: 5, flat_amount: 18000, unit_amount: 0 },
      { up_to: 10, flat_amount: 0, unit_amount: 10800 },
      { up_to: 20, flat_amount: 0, unit_amount: 7200 },
      { up_to: "inf", flat_amount: 0, unit_amount: 6000 },
    ]);
    expect(month.tiers).toEqual([
      { up_to: 1, flat_amount: 3000, unit_amount: 0 },
      { up_to: 2, flat_amount: 3000, unit_amount: 0 },
      { up_to: 5, flat_amount: 1800, unit_amount: 0 },
      { up_to: 10, flat_amount: 0, unit_amount: 1080 },
      { up_to: 20, flat_amount: 0, unit_amount: 720 },
      { up_to: "inf", flat_amount: 0, unit_amount: 600 },
    ]);
  });

  /** Nezávislá simulácia Stripe graduated pricing priamo z JSON tiers (up_to "inf"). */
  function simulateGraduated(tiers: ManifestTier[], quantity: number): number {
    let total = 0;
    let prev = 0;
    for (const t of tiers) {
      const top = t.up_to === "inf" ? Infinity : t.up_to;
      const inTier = Math.min(quantity, top) - prev;
      if (inTier > 0) total += t.flat_amount + t.unit_amount * inTier;
      if (quantity <= top) break;
      prev = top;
    }
    return total;
  }

  it("graduated výpočet z tiers v JSON = licenseNetCents(n, interval) pre n = 1…60, ročne aj mesačne", () => {
    const tiers = { year: licence("year").tiers!, month: licence("month").tiers! };
    for (const interval of ["year", "month"] as const) {
      for (let n = 1; n <= 60; n++) {
        expect(simulateGraduated(tiers[interval], n), `${interval} n=${n}`).toBe(licenseNetCents(n, interval));
        // nadácia (graduatedTierNetCents nad PRICING_V3_SEAT_TIERS) sa nesmie rozísť s JSON
        expect(graduatedTierNetCents(PRICING_V3_SEAT_TIERS[interval], n), `${interval} n=${n} (kód)`).toBe(licenseNetCents(n, interval));
      }
    }
  });

  it("kontrolné body zo špecifikácie (základ × 12 ročne, × 1,2 mesačne)", () => {
    const base: Record<number, number> = { 1: 2500, 2: 5000, 3: 6500, 5: 6500, 6: 7400, 7: 8300, 10: 11000, 11: 11600, 20: 17000, 21: 17500, 30: 22000 };
    for (const [n, b] of Object.entries(base)) {
      expect(simulateGraduated(licence("year").tiers!, Number(n)), `year n=${n}`).toBe(b * 12);
      expect(simulateGraduated(licence("month").tiers!, Number(n)), `month n=${n}`).toBe((b * 12) / 10);
    }
  });

  it("kupón akcie 9/12: 25 %, jedenkrát, do 31. 12. 2026 22:59:59Z, len na produkt licencie, env názov z kontraktu", () => {
    const { coupons } = manifestFile();
    expect(coupons).toHaveLength(1);
    const c = coupons[0];
    expect(c.env).toBe(PRICING_V3_ANNUAL_PROMO_COUPON_ENV);
    expect(c.percent_off).toBe(25);
    expect(c.duration).toBe("once");
    expect(c.redeem_by_iso).toBe(PRICING_V3_PROMO_UNTIL);
    expect(c.redeem_by).toBe(1798757999);
    expect(c.redeem_by).toBe(Date.parse(PRICING_V3_PROMO_UNTIL) / 1000);
    expect(c.applies_to_product).toBe(LICENCE_PRODUCT);
    expect(c.applies_to_product).not.toBe(PACK_PRODUCT);
    expect(c.name).not.toMatch(/pilot/i);
  });

  it("balíky 50–300 mesačne na samostatnom produkte a kredit 0,75 € jednorazovo; staré 60/120/180/240 a 0,70 € nikde", () => {
    const rows = manifestFile().prices.filter((r) => r.gate === "pricing_v2");
    const amounts = { 50: 2600, 100: 5100, 150: 7400, 200: 9400, 250: 11400, 300: 13100 } as const;
    for (const [credits, amount] of Object.entries(amounts)) {
      const r = rows.find((x) => x.env === `STRIPE_PRICE_V3_PACK_${credits}`)!;
      expect(r, credits).toBeDefined();
      expect(r.amount).toBe(amount);
      expect(r.type).toBe("recurring");
      expect(r.interval).toBeUndefined();
      expect(r.product).toBe(PACK_PRODUCT);
    }
    const credit = rows.find((x) => x.env === PRICING_V2_CREDIT_PRICE_ENV)!;
    expect(credit.amount).toBe(75);
    expect(credit.type).toBe("one_time");
    for (const old of [60, 120, 180, 240]) expect(rows.find((x) => x.env.endsWith(`_PACK_${old}`))).toBeUndefined();
    expect(rows.find((x) => x.amount === 70)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------

/**
 * ENV-SCHEMA-CHECKOUT — the env schema must name every price the code reads.
 *
 * `src/config/env.ts` declared the legacy plan prices and none of the ten the
 * pricing stack actually reads, so the schema described a product that no
 * longer exists. Measured 2026-09-30: zero of the ten were set in Vercel
 * production either (docs/ops/2026-09-21-stripe-verify-kit.md §6b).
 *
 * Scope, stated plainly: this locks code against the schema. It cannot see
 * production — no CI check can — so a green run here does NOT mean checkout
 * works. What it prevents is a new sellable price landing in the code while
 * the schema stays silent about it.
 *
 * The schema is read as text on purpose: it keeps this check independent of
 * the runtime environment.
 */
const ENV_SCHEMA = resolve(__dirname, "../../src/config/env.ts");

function priceKeysDeclaredInSchema(): string[] {
  return [...readFileSync(ENV_SCHEMA, "utf8").matchAll(/^\s*(STRIPE_PRICE_\w+)\s*:/gm)].map(
    (m) => m[1],
  );
}

describe("src/config/env.ts ↔ program-tier-pricing.ts", () => {
  it("declares every price env key the code sells", () => {
    const declared = new Set(priceKeysDeclaredInSchema());
    // Zahŕňa aj v3 kľúče (gate pricing_v2): schéma ich deklaruje od PR1 „Cenník v3“.
    const missing = rowsFromCode()
      .map((r) => r.env)
      .filter((env) => !declared.has(env))
      .sort();
    expect(missing).toEqual([]);
  });

  it("does not declare the disabled Owner Cockpit Pro", () => {
    // ownerPro is not sellable (enabled: false), so nothing reads its key and
    // the manifest omits it. The schema must omit it too — a declared key for
    // a product that cannot be bought reads as "provision this" to whoever
    // fills Vercel next. Enabling ownerPro should fail here and be a
    // deliberate edit, not a silent inheritance.
    const declared = priceKeysDeclaredInSchema();
    const key = COCKPIT_PRODUCTS.ownerPro.stripeEnvKey;
    expect(COCKPIT_PRODUCTS.ownerPro.enabled).toBe(false);
    expect(declared.includes(key!)).toBe(false);
  });

  it("names no price key twice", () => {
    const declared = priceKeysDeclaredInSchema();
    expect(declared.length).toBe(new Set(declared).size);
  });
});

// ---------------------------------------------------------------------------

type StripeObj = Record<string, unknown>;
type StripePrice = StripeObj;
let seq = 0;

const productId = (name: string) => `prod_${name.replace(/[^A-Za-z0-9]/g, "")}`;

/** Tier tak, ako ho vracia Stripe: chýbajúce sumy sú null, `inf` je up_to null. */
const stripeTiers = (tiers: ManifestTier[]) =>
  tiers.map((t) => ({
    up_to: t.up_to === "inf" ? null : t.up_to,
    flat_amount: t.flat_amount === 0 ? null : t.flat_amount,
    unit_amount: t.unit_amount === 0 ? null : t.unit_amount,
  }));

function price(amount: number | null, opts: Partial<{
  type: "recurring" | "one_time";
  interval: string;
  intervalCount: number;
  currency: string;
  livemode: boolean;
  product: string;
  taxBehavior: string;
  taxCode: string | null;
  tiers: ManifestTier[];
  tiersMode: string;
  omitTiers: boolean;
}> = {}): StripePrice {
  const type = opts.type ?? "recurring";
  const name = opts.product ?? `product ${amount}`;
  seq += 1;
  return {
    id: `price_fixture${String(seq).padStart(6, "0")}`,
    unit_amount: opts.tiers ? null : amount,
    currency: opts.currency ?? "eur",
    active: true,
    livemode: opts.livemode ?? true,
    type,
    billing_scheme: opts.tiers ? "tiered" : "per_unit",
    ...(opts.tiers && !opts.omitTiers ? { tiers_mode: opts.tiersMode ?? "graduated", tiers: stripeTiers(opts.tiers) } : {}),
    ...(opts.tiers && opts.omitTiers ? { tiers_mode: opts.tiersMode ?? "graduated" } : {}),
    tax_behavior: opts.taxBehavior ?? "exclusive",
    recurring:
      type === "recurring"
        ? { interval: opts.interval ?? "month", interval_count: opts.intervalCount ?? 1, usage_type: "licensed" }
        : null,
    product: {
      id: productId(name),
      name,
      active: true,
      tax_code: opts.taxCode === undefined ? "txcd_fixture0" : opts.taxCode,
    },
  };
}

function allExpected(): StripePrice[] {
  // Nazov produktu = nazov z manifestu: rozlisuje rovnake sumy (napr. Owner Cockpit 349 EUR).
  const productByEnv = new Map(manifestFile().prices.map((r) => [r.env, r.product]));
  return rowsFromManifest().map((r) =>
    price(r.amount ?? null, {
      type: r.type,
      product: productByEnv.get(r.env),
      interval: r.interval ?? "month",
      tiers: r.tiers,
    }),
  );
}

/** Kupón presne podľa manifestu; `over` prepíše jedno pole. */
function coupon(over: StripeObj = {}): StripeObj {
  const c = manifestFile().coupons[0];
  return {
    id: "Fixture25Promo",
    object: "coupon",
    name: c.name,
    percent_off: c.percent_off,
    amount_off: null,
    duration: c.duration,
    redeem_by: c.redeem_by,
    applies_to: { products: [productId(c.applies_to_product)] },
    livemode: true,
    valid: true,
    ...over,
  };
}

/** Parent env minus any real Stripe key, so a test run can never reach live. */
function scriptEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, ...extra };
  if (!("STRIPE_SECRET_KEY" in extra)) delete env.STRIPE_SECRET_KEY;
  return env;
}

function run(prices: StripePrice[], coupons: StripeObj[] = [coupon()]) {
  const dir = mkdtempSync(join(tmpdir(), "stripe-verify-"));
  const file = join(dir, "prices.json");
  // Two pages, so the fixture shape matches a paginated live list.
  const half = Math.ceil(prices.length / 2);
  writeFileSync(
    file,
    JSON.stringify({
      pages: [
        { data: prices.slice(0, half), has_more: true },
        { data: prices.slice(half), has_more: false },
      ],
      coupons,
    }),
  );
  const res = spawnSync("python3", [SCRIPT, "--fixture", file], {
    encoding: "utf8",
    env: scriptEnv(),
  });
  return { code: res.status, out: `${res.stdout}${res.stderr}` };
}

const TOTAL = () => rowsFromManifest().length + manifestFile().coupons.length;
/** Názvy produktov cenníka v3 podľa manifestu (gate pricing_v2), nie podľa predpony v názve. */
const V3_PRODUCT_NAMES = new Set(manifestFile().prices.filter((r) => r.gate === "pricing_v2").map((r) => r.product));
const isLicence = (p: StripePrice, interval: string) =>
  p.billing_scheme === "tiered" && (p.recurring as { interval: string }).interval === interval;
/** Všetko okrem jednej licenčnej ceny (interval), aby sa dala nahradiť pokazenou. */
const without = (prices: StripePrice[], pred: (p: StripePrice) => boolean) => prices.filter((p) => !pred(p));
const licenceTiers = (interval: "year" | "month") =>
  manifestFile().prices.find((r) => r.env === (interval === "year" ? PRICING_V3_SEAT_YEARLY_PRICE_ENV : PRICING_V3_SEAT_MONTHLY_PRICE_ENV))!.tiers!;

describe("stripe_verify_prices.py (offline, --fixture)", () => {
  it("resolves every price and the coupon and prints a complete env patch", () => {
    const { code, out } = run(allExpected());
    expect(out).toContain(`${TOTAL()}/${TOTAL()} resolved`);
    for (const r of rowsFromManifest()) expect(out).toMatch(new RegExp(`^${r.env}=price_`, "m"));
    expect(out).toMatch(new RegExp(`^${PRICING_V3_ANNUAL_PROMO_COUPON_ENV}=Fixture25Promo$`, "m"));
    expect(code).toBe(0);
  });

  it("2026-09-22 live snapshot: nothing matches, step C, legacy 49 € monthly is not a 49 € top-up", () => {
    const live = [
      price(4900, { product: "Revolis.AI Pro" }),
      price(4900, { product: "Revolis.AI Starter" }),
      price(4950, { type: "one_time", product: "Onboarding Revolis.AI" }),
      price(9900, { type: "one_time", product: "Onboarding Revolis.AI" }),
      price(9900, { product: "Active Force" }),
      price(9900, { product: "Revolis.AI Pro" }),
      price(19900, { product: "Market Vision" }),
      price(29900, { product: "Revolis.AI Enterprise" }),
      price(44900, { product: "Protocol Authority" }),
    ];
    const { code, out } = run(live, []);
    expect(out).toContain(`0/${TOTAL()} resolved`);
    expect(out).toMatch(/MISSING {2}STRIPE_PRICE_CREDITS_START[\s\S]*blizko: .*Revolis\.AI Starter.*type=recurring/);
    expect(out).toContain("Seat brana NEUPLNA -> krok C");
    expect(out).not.toMatch(/^STRIPE_PRICE_\w+=price_/m);
    expect(code).toBe(1);
  });

  it("a 79 € price billed yearly is not the Solo seat", () => {
    const prices = allExpected().filter((p) => p.unit_amount !== 7900);
    prices.push(price(7900, { interval: "year", product: "Solo Seat" }));
    const { code, out } = run(prices);
    expect(out).toMatch(/MISSING {2}STRIPE_PRICE_SOLO_SEAT[\s\S]*blizko: .*interval=1xyear/);
    expect(out).not.toMatch(/^STRIPE_PRICE_SOLO_SEAT=/m);
    expect(code).toBe(1);
  });

  it("two matching candidates are AMBIG and never reach the env patch", () => {
    const prices = [...allExpected(), price(7100, { product: "Team Seat (duplicate)" })];
    const { code, out } = run(prices);
    expect(out).toMatch(/AMBIG {4}STRIPE_PRICE_TEAM_SEAT {3}-- 2 kandidati/);
    expect(out).not.toMatch(/^STRIPE_PRICE_TEAM_SEAT=/m);
    expect(code).toBe(1);
  });

  it("test-mode and non-EUR prices do not count", () => {
    const prices = allExpected().filter((p) => ![6300, 4700].includes(p.unit_amount as number));
    prices.push(price(6300, { livemode: false }), price(4700, { type: "one_time", currency: "czk" }));
    const { out } = run(prices);
    expect(out).toMatch(/MISSING {2}STRIPE_PRICE_OFFICE_SEAT[\s\S]*livemode=false/);
    expect(out).toMatch(/MISSING {2}STRIPE_PRICE_STARTER_PACK[\s\S]*currency=czk/);
  });

  it("v3 price with tax_behavior other than exclusive is MISSING and never reaches the env patch", () => {
    const prices = allExpected().filter((p) => p.unit_amount !== 2600);
    prices.push(price(2600, { product: PACK_PRODUCT, taxBehavior: "inclusive" }));
    const { code, out } = run(prices);
    expect(out).toMatch(/MISSING {2}STRIPE_PRICE_V3_PACK_50[\s\S]*tax_behavior=inclusive, treba exclusive/);
    expect(out).not.toMatch(/^STRIPE_PRICE_V3_PACK_50=/m);
    expect(code).toBe(1);
  });

  it("v3 price with unspecified tax_behavior is MISSING", () => {
    const prices = allExpected().filter((p) => p.unit_amount !== 5100);
    prices.push(price(5100, { product: PACK_PRODUCT, taxBehavior: "unspecified" }));
    const { out } = run(prices);
    expect(out).toMatch(/MISSING {2}STRIPE_PRICE_V3_PACK_100[\s\S]*tax_behavior=unspecified/);
  });

  it("v3 price whose product has no tax_code is MISSING; legacy prices do not need one", () => {
    const prices = allExpected().filter((p) => p.unit_amount !== 7400);
    prices.push(price(7400, { product: PACK_PRODUCT, taxCode: null }));
    const { code, out } = run(prices);
    expect(out).toMatch(/MISSING {2}STRIPE_PRICE_V3_PACK_150[\s\S]*product\.tax_code chyba/);
    expect(code).toBe(1);
    const legacy = run(
      allExpected().map((p) =>
        typeof p.product === "object" && !V3_PRODUCT_NAMES.has(String((p.product as { name: string }).name))
          ? { ...p, tax_behavior: "unspecified", product: { ...(p.product as object), tax_code: null } }
          : p,
      ),
    );
    expect(legacy.code).toBe(0);
  });

  it("licence tiered prices: yearly and monthly resolve to two distinct prices of one product", () => {
    const { code, out } = run(allExpected());
    expect(code).toBe(0);
    const yearly = out.match(new RegExp(`^${PRICING_V3_SEAT_YEARLY_PRICE_ENV}=(price_\\w+)$`, "m"))?.[1];
    const monthly = out.match(new RegExp(`^${PRICING_V3_SEAT_MONTHLY_PRICE_ENV}=(price_\\w+)$`, "m"))?.[1];
    expect(yearly).toBeTruthy();
    expect(monthly).toBeTruthy();
    expect(yearly).not.toBe(monthly);
    expect(out).toContain("rocne (recurring year)");
    expect(out).toContain("tiered graduated");
  });

  it("a yearly-tiered licence billed monthly is MISSING for the yearly env and never reaches the env patch", () => {
    const prices = without(allExpected(), (p) => isLicence(p, "year"));
    prices.push(price(null, { product: LICENCE_PRODUCT, interval: "month", tiers: licenceTiers("year") }));
    const { code, out } = run(prices);
    expect(out).toMatch(/MISSING {2}STRIPE_PRICE_V3_SEAT_YEARLY[\s\S]*interval=1xmonth, treba 1x year/);
    expect(out).not.toMatch(/^STRIPE_PRICE_V3_SEAT_YEARLY=/m);
    expect(code).toBe(1);
  });

  it("a yearly pack price at the monthly amount does not satisfy the monthly pack env", () => {
    const prices = allExpected().filter((p) => p.unit_amount !== 2600);
    prices.push(price(2600, { product: PACK_PRODUCT, interval: "year" }));
    const { out } = run(prices);
    expect(out).toMatch(/MISSING {2}STRIPE_PRICE_V3_PACK_50 {3}[\s\S]*interval=1xyear, treba 1x month/);
    expect(out).not.toMatch(/^STRIPE_PRICE_V3_PACK_50=/m);
  });

  it("Owner Cockpit 349 EUR still resolves by product name next to the tiered licence", () => {
    const ok = run(allExpected());
    expect(ok.out).toMatch(/^STRIPE_PRICE_OWNER_COCKPIT=price_/m);
    const renamed = allExpected().map((p) =>
      (p.product as { name: string }).name === LICENCE_PRODUCT ? { ...p, product: { id: "prod_x", name: "Iny produkt", active: true } } : p,
    );
    const { code, out } = run(renamed);
    expect(out).toMatch(/MISSING {2}STRIPE_PRICE_V3_SEAT_(YEARLY|MONTHLY)/);
    expect(code).toBe(1);
  });

  it("duplicate licence price (same tiers) is AMBIG", () => {
    const prices = [...allExpected(), price(null, { product: LICENCE_PRODUCT, interval: "year", tiers: licenceTiers("year") })];
    const { code, out } = run(prices);
    expect(out).toMatch(/AMBIG {4}STRIPE_PRICE_V3_SEAT_YEARLY/);
    expect(out).not.toMatch(/^STRIPE_PRICE_V3_SEAT_YEARLY=/m);
    expect(code).toBe(1);
  });

  it("every tier is verified: a drifted flat_amount / unit_amount / up_to is MISSING and names the tier", () => {
    const base = licenceTiers("year");
    const drifts: Array<[string, ManifestTier[], RegExp]> = [
      ["flat_amount tier 2", base.map((t, i) => (i === 1 ? { ...t, flat_amount: 47000 } : t)), /tier 2:/],
      ["unit_amount tier 3", base.map((t, i) => (i === 2 ? { ...t, unit_amount: 10000 } : t)), /tier 3:/],
      ["up_to tier 4", base.map((t, i) => (i === 3 ? { ...t, up_to: 25 } : t)), /tier 4:/],
      ["unit_amount last tier", base.map((t, i) => (i === 4 ? { ...t, unit_amount: 5000 } : t)), /tier 5:/],
      ["missing last tier", base.slice(0, 4), /pocet tiers=4|tier 4:/],
    ];
    for (const [label, tiers, reason] of drifts) {
      const prices = without(allExpected(), (p) => isLicence(p, "year"));
      prices.push(price(null, { product: LICENCE_PRODUCT, interval: "year", tiers }));
      const { code, out } = run(prices);
      expect(out, label).toMatch(/MISSING {2}STRIPE_PRICE_V3_SEAT_YEARLY/);
      expect(out, label).toMatch(reason);
      expect(out, label).not.toMatch(/^STRIPE_PRICE_V3_SEAT_YEARLY=/m);
      expect(code, label).toBe(1);
    }
  });

  it("tiers_mode volume, missing expanded tiers, wrong currency or test mode on the licence are MISSING", () => {
    const monthly = licenceTiers("month");
    const variants: Array<[string, StripePrice, RegExp]> = [
      ["volume", price(null, { product: LICENCE_PRODUCT, tiers: monthly, tiersMode: "volume" }), /tiers_mode=volume, treba graduated/],
      ["no expand", price(null, { product: LICENCE_PRODUCT, tiers: monthly, omitTiers: true }), /tiers chyba v odpovedi/],
      ["czk", price(null, { product: LICENCE_PRODUCT, tiers: monthly, currency: "czk" }), /currency=czk/],
      ["test mode", price(null, { product: LICENCE_PRODUCT, tiers: monthly, livemode: false }), /livemode=false/],
      ["inclusive", price(null, { product: LICENCE_PRODUCT, tiers: monthly, taxBehavior: "inclusive" }), /tax_behavior=inclusive/],
    ];
    for (const [label, bad, reason] of variants) {
      const prices = without(allExpected(), (p) => isLicence(p, "month"));
      prices.push(bad);
      const { code, out } = run(prices);
      expect(out, label).toMatch(/MISSING {2}STRIPE_PRICE_V3_SEAT_MONTHLY/);
      expect(out, label).toMatch(reason);
      expect(code, label).toBe(1);
    }
  });

  it("a per-unit licence price (no tiers) never satisfies the tiered licence", () => {
    const prices = without(allExpected(), (p) => isLicence(p, "year"));
    prices.push(price(30000, { product: LICENCE_PRODUCT, interval: "year" }));
    const { code, out } = run(prices);
    expect(out).toMatch(/MISSING {2}STRIPE_PRICE_V3_SEAT_YEARLY/);
    expect(out).not.toMatch(/^STRIPE_PRICE_V3_SEAT_YEARLY=/m);
    expect(code).toBe(1);
  });

  it("coupon: missing, wrong percent_off, duration, redeem_by, applies_to or test mode is MISSING and never reaches the env patch", () => {
    const missing = run(allExpected(), []);
    expect(missing.out).toMatch(/MISSING {2}STRIPE_COUPON_V3_ANNUAL_PROMO/);
    expect(missing.code).toBe(1);
    const variants: Array<[string, StripeObj, RegExp]> = [
      ["percent_off", { percent_off: 20 }, /percent_off=20/],
      ["amount_off", { percent_off: null, amount_off: 1000 }, /amount_off=1000/],
      ["duration forever", { duration: "forever" }, /duration=forever, treba once/],
      ["duration repeating", { duration: "repeating" }, /duration=repeating/],
      ["redeem_by", { redeem_by: 1798761599 }, /redeem_by=1798761599, treba 1798757999/],
      ["no redeem_by", { redeem_by: null }, /redeem_by=None|redeem_by=null/],
      ["applies_to other product", { applies_to: { products: ["prod_other"] } }, /applies_to\.products=/],
      ["applies_to missing", { applies_to: null }, /applies_to\.products=\[\]/],
      ["test mode", { livemode: false }, /livemode=false/],
    ];
    for (const [label, over, reason] of variants) {
      const { code, out } = run(allExpected(), [coupon(over)]);
      expect(out, label).toMatch(/MISSING {2}STRIPE_COUPON_V3_ANNUAL_PROMO/);
      expect(out, label).toMatch(reason);
      expect(out, label).not.toMatch(/^STRIPE_COUPON_V3_ANNUAL_PROMO=/m);
      expect(code, label).toBe(1);
    }
  });

  it("coupon applies_to must be the licence product, not the credit-pack product", () => {
    const { out, code } = run(allExpected(), [coupon({ applies_to: { products: [productId(PACK_PRODUCT)] } })]);
    expect(out).toMatch(/MISSING {2}STRIPE_COUPON_V3_ANNUAL_PROMO/);
    expect(code).toBe(1);
  });

  it("two identical coupons are AMBIG", () => {
    const { out, code } = run(allExpected(), [coupon(), coupon({ id: "Fixture25PromoDup" })]);
    expect(out).toMatch(/AMBIG {4}STRIPE_COUPON_V3_ANNUAL_PROMO/);
    expect(code).toBe(1);
  });

  it("v3 gate is reported separately and never blocks the seat gate", () => {
    const prices = allExpected().filter((p) => p.unit_amount !== 75);
    const { code, out } = run(prices);
    expect(out).toMatch(/NIE {2}pricing_v2/);
    expect(out).toContain("Seat brana kompletna -> krok B");
    expect(code).toBe(1);
  });

  it("seat gate complete with top-up missing: step B may proceed for what resolved", () => {
    const prices = allExpected().filter((p) => p.unit_amount !== 99900);
    const { code, out } = run(prices);
    expect(out).toContain("Seat brana kompletna -> krok B");
    expect(out).toMatch(/^STRIPE_PRICE_SOLO_SEAT=price_/m);
    expect(code).toBe(1);
  });

  it("--spec is offline, lists tiers and the coupon, and needs no key", () => {
    const res = spawnSync("python3", [SCRIPT, "--spec"], { encoding: "utf8", env: scriptEnv() });
    expect(res.status, res.stderr).toBe(0);
    expect(res.stdout).toContain("tier up_to=inf  flat_amount=     0  unit_amount=  6000");
    expect(res.stdout).toContain("tier up_to=  1  flat_amount=  3000  unit_amount=     0");
    expect(res.stdout).toContain("kupon -25 % duration=once redeem_by=2026-12-31T22:59:59Z (1798757999)");
  });
});

describe("secret hygiene", () => {
  it("the key reaches Stripe only as an HTTP header, never through argv", () => {
    // Code lines only: the comments may explain why curl is not used.
    const code = (path: string) =>
      readFileSync(path, "utf8")
        .split("\n")
        .filter((l) => !/^\s*#/.test(l))
        .join("\n");
    const src = code(SCRIPT);
    const wrapper = code(WRAPPER);
    expect(src).toContain('headers={"Authorization": f"Bearer {key}"}');
    expect(src).not.toMatch(/subprocess|os\.system|Popen|\bcurl\b/);
    // The key is never printed.
    expect(src).not.toMatch(/print\([^\n]*\bkey\b/);
    // The wrapper must not touch the key at all — the original passed it to
    // `curl -u` on a continuation line, visible in `ps` for the whole request.
    expect(wrapper).not.toMatch(/\bcurl\b|STRIPE_SECRET_KEY/);
    expect(wrapper).toMatch(/exec python3 .*stripe_verify_prices\.py/);
  });

  it("verify is read-only: only GET requests, no POST/DELETE", () => {
    const src = readFileSync(SCRIPT, "utf8");
    expect(src).not.toMatch(/method\s*=\s*"(POST|DELETE|PUT)"/);
    expect(src).not.toMatch(/data\s*=/);
  });

  it("refuses a test-mode key instead of reporting 0/N", () => {
    const res = spawnSync("python3", [SCRIPT], {
      encoding: "utf8",
      env: scriptEnv({ STRIPE_SECRET_KEY: "sk_test_fixture" }),
    });
    expect(res.stderr).toContain("TEST kluc");
    expect(res.status).toBe(2);
  });
});
