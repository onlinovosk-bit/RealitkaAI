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
import { PRICING_V2_BANDS, PRICING_V2_CREDIT_NET_CENTS, PRICING_V2_MONTHLY_PACKS } from "@/lib/pricing-v2";
import {
  PRICING_V2_BAND_PRICE_ENV,
  PRICING_V2_CREDIT_PRICE_ENV,
  PRICING_V2_PACK_PRICE_ENV,
} from "@/lib/pricing-v2-contract";

const OPS = resolve(__dirname, "../../../../scripts/ops");
const MANIFEST = join(OPS, "stripe-expected-prices.json");
const SCRIPT = join(OPS, "stripe_verify_prices.py");
const WRAPPER = join(OPS, "stripe-verify-prices.sh");

type Row = { env: string; amount: number; type: "recurring" | "one_time"; gate: string };

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
  // Cennik v2: sumy BEZ DPH v centoch, pasma a baliky mesacne, kredit jednorazovo (qty = pocet kreditov).
  for (const b of PRICING_V2_BANDS) {
    rows.push({ env: PRICING_V2_BAND_PRICE_ENV[b.id], amount: b.netCents, type: "recurring", gate: "pricing_v2" });
  }
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

function rowsFromManifest(): Row[] {
  const raw = JSON.parse(readFileSync(MANIFEST, "utf8")) as { prices: Row[] };
  return raw.prices.map(({ env, amount, type, gate }) => ({ env, amount, type, gate }));
}

const byEnv = (a: Row, b: Row) => a.env.localeCompare(b.env);

describe("stripe-expected-prices.json ↔ program-tier-pricing.ts", () => {
  it("lists exactly the sellable prices, at the amounts and billing types the code charges", () => {
    expect(rowsFromManifest().sort(byEnv)).toEqual(rowsFromCode().sort(byEnv));
  });

  it("pricing v2 rows: net amounts from pricing-v2.ts, env NAMES from the frozen contract, 4 bands + 5 packs + 1 credit", () => {
    const v2 = rowsFromManifest().filter((r) => r.gate === "pricing_v2");
    expect(v2).toHaveLength(PRICING_V2_BANDS.length + PRICING_V2_MONTHLY_PACKS.length + 1);
    expect(v2.sort(byEnv)).toEqual(rowsFromCode().filter((r) => r.gate === "pricing_v2").sort(byEnv));
    // Manifest nesmie niest hodnoty tajomstiev: len NAZVY env a nazvy produktov.
    for (const r of v2) expect(r.env).toMatch(/^STRIPE_PRICE_V2_[A-Z0-9_]+$/);
  });

  it("does not ask for the disabled Owner Cockpit Pro", () => {
    const envs = rowsFromManifest().map((r) => r.env);
    expect(COCKPIT_PRODUCTS.ownerPro.enabled).toBe(false);
    expect(envs).not.toContain(COCKPIT_PRODUCTS.ownerPro.stripeEnvKey);
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
    // Zahŕňa aj v2 kľúče (gate pricing_v2): schéma ich deklaruje od W3.
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

type StripePrice = Record<string, unknown>;
let seq = 0;

function price(amount: number, opts: Partial<{
  type: "recurring" | "one_time";
  interval: string;
  intervalCount: number;
  currency: string;
  livemode: boolean;
  product: string;
  taxBehavior: string;
  taxCode: string | null;
}> = {}): StripePrice {
  const type = opts.type ?? "recurring";
  seq += 1;
  return {
    id: `price_fixture${String(seq).padStart(6, "0")}`,
    unit_amount: amount,
    currency: opts.currency ?? "eur",
    active: true,
    livemode: opts.livemode ?? true,
    type,
    billing_scheme: "per_unit",
    tax_behavior: opts.taxBehavior ?? "exclusive",
    recurring:
      type === "recurring"
        ? { interval: opts.interval ?? "month", interval_count: opts.intervalCount ?? 1, usage_type: "licensed" }
        : null,
    product: {
      name: opts.product ?? `product ${amount}`,
      active: true,
      tax_code: opts.taxCode === undefined ? "txcd_fixture0" : opts.taxCode,
    },
  };
}

function allExpected(): StripePrice[] {
  // Nazov produktu = nazov z manifestu: rozlisuje rovnake sumy (v2 Siet 349 EUR vs Owner Cockpit 349 EUR).
  const productByEnv = new Map(
    (JSON.parse(readFileSync(MANIFEST, "utf8")) as { prices: Array<{ env: string; product: string }> }).prices.map(
      (r) => [r.env, r.product],
    ),
  );
  return rowsFromManifest().map((r) => price(r.amount, { type: r.type, product: productByEnv.get(r.env) }));
}

/** Parent env minus any real Stripe key, so a test run can never reach live. */
function scriptEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, ...extra };
  if (!("STRIPE_SECRET_KEY" in extra)) delete env.STRIPE_SECRET_KEY;
  return env;
}

function run(prices: StripePrice[]) {
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
    }),
  );
  const res = spawnSync("python3", [SCRIPT, "--fixture", file], {
    encoding: "utf8",
    env: scriptEnv(),
  });
  return { code: res.status, out: `${res.stdout}${res.stderr}` };
}

const TOTAL = () => rowsFromManifest().length;
/** Názvy produktov cenníka v2 podľa manifestu (gate pricing_v2), nie podľa predpony v názve. */
const V2_PRODUCT_NAMES = new Set(
  (JSON.parse(readFileSync(MANIFEST, "utf8")) as { prices: Array<{ product: string; gate: string }> }).prices
    .filter((r) => r.gate === "pricing_v2")
    .map((r) => r.product),
);

describe("stripe_verify_prices.py (offline, --fixture)", () => {
  it("resolves every price and prints a complete env patch", () => {
    const { code, out } = run(allExpected());
    expect(out).toContain(`${TOTAL()}/${TOTAL()} resolved`);
    for (const r of rowsFromManifest()) expect(out).toMatch(new RegExp(`^${r.env}=price_`, "m"));
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
    const { code, out } = run(live);
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

  it("v2 price with tax_behavior other than exclusive is MISSING and never reaches the env patch", () => {
    const prices = allExpected().filter((p) => p.unit_amount !== 2500);
    prices.push(price(2500, { product: "Revolis Start", taxBehavior: "inclusive" }));
    const { code, out } = run(prices);
    expect(out).toMatch(/MISSING {2}STRIPE_PRICE_V2_START[\s\S]*tax_behavior=inclusive, treba exclusive/);
    expect(out).not.toMatch(/^STRIPE_PRICE_V2_START=/m);
    expect(code).toBe(1);
  });

  it("v2 price with unspecified tax_behavior is MISSING", () => {
    const prices = allExpected().filter((p) => p.unit_amount !== 6000);
    prices.push(price(6000, { product: "Revolis Team", taxBehavior: "unspecified" }));
    const { out } = run(prices);
    expect(out).toMatch(/MISSING {2}STRIPE_PRICE_V2_TEAM[\s\S]*tax_behavior=unspecified/);
  });

  it("v2 price whose product has no tax_code is MISSING; legacy prices do not need one", () => {
    const prices = allExpected().filter((p) => p.unit_amount !== 14900);
    prices.push(price(14900, { product: "Revolis Kancelária", taxCode: null }));
    const { code, out } = run(prices);
    expect(out).toMatch(/MISSING {2}STRIPE_PRICE_V2_OFFICE[\s\S]*product\.tax_code chyba/);
    expect(code).toBe(1);
    const legacy = run(allExpected().map((p) => (typeof p.product === "object" && !V2_PRODUCT_NAMES.has(String((p.product as { name: string }).name)) ? { ...p, tax_behavior: "unspecified", product: { ...(p.product as object), tax_code: null } } : p)));
    expect(legacy.code).toBe(0);
  });

  it("v2 Siet 349 EUR and Owner Cockpit 349 EUR resolve by product name; a v2 price with a foreign name stays AMBIG", () => {
    const ok = run(allExpected());
    expect(ok.out).toMatch(/^STRIPE_PRICE_V2_NETWORK=price_/m);
    expect(ok.out).toMatch(/^STRIPE_PRICE_OWNER_COCKPIT=price_/m);
    const renamed = allExpected().map((p) =>
      (p.product as { name: string }).name === "Revolis Sieť" ? { ...p, product: { name: "Iny produkt", active: true } } : p,
    );
    const { code, out } = run(renamed);
    expect(out).toMatch(/AMBIG {4}STRIPE_PRICE_(V2_NETWORK|OWNER_COCKPIT)/);
    expect(code).toBe(1);
  });

  it("v2 gate is reported separately and never blocks the seat gate", () => {
    const prices = allExpected().filter((p) => p.unit_amount !== 70);
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
    // The wrapper must not touch the key at all — the original passed it to
    // `curl -u` on a continuation line, visible in `ps` for the whole request.
    expect(wrapper).not.toMatch(/\bcurl\b|STRIPE_SECRET_KEY/);
    expect(wrapper).toMatch(/exec python3 .*stripe_verify_prices\.py/);
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
