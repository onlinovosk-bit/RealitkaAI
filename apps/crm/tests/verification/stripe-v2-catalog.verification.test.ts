/**
 * Katalóg pre Stripe v `scripts/ops/stripe-v2/` (cenník v3) sa nesmie rozísť s kódom ani s manifestom.
 * Zdroj pravdy: pricing-v2.ts (tiers, balíky, kredit), pricing-v2-contract.ts (env kľúče),
 * scripts/ops/stripe-expected-prices.json (názvy produktov a tiers pre verifikátor).
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRICING_V2_CREDIT_NET_CENTS,
  PRICING_V2_MONTHLY_PACKS,
  PRICING_V3_PROMO_UNTIL,
  PRICING_V3_SEAT_TIERS,
  licenseNetCents,
  priceFromNetCents,
  type PricingV3Tier,
} from "@/lib/pricing-v2";
import {
  PRICING_V2_CREDIT_PRICE_ENV,
  PRICING_V2_PACK_PRICE_ENV,
  PRICING_V3_ANNUAL_PROMO_COUPON_ENV,
  PRICING_V3_SEAT_PRICE_ENV,
} from "@/lib/pricing-v2-contract";

const DIR = join(__dirname, "../../../../scripts/ops/stripe-v2");
type CatalogTier = { up_to: number | "inf"; flat_amount: number; unit_amount: number };
type Item = Record<string, unknown> & { tiers?: CatalogTier[] };
const catalog = JSON.parse(readFileSync(join(DIR, "revolis-stripe-v2-catalog.json"), "utf8")) as {
  catalog_version: string;
  items: Item[];
  coupons: Array<Record<string, unknown>>;
  tax_behavior: string;
  currency: string;
};
const manifest = JSON.parse(readFileSync(join(DIR, "../stripe-expected-prices.json"), "utf8")) as {
  prices: Array<{ env: string; product: string; amount?: number; type: string; tiers?: CatalogTier[]; interval?: string }>;
  coupons: Array<{ env: string; name: string; percent_off: number; duration: string; redeem_by: number; applies_to_product: string }>;
};
const bySku = (sku: string) => catalog.items.find((i) => i.sku === sku)!;
const asCatalogTiers = (tiers: readonly PricingV3Tier[]): CatalogTier[] =>
  tiers.map((t) => ({ up_to: t.up_to === null ? "inf" : t.up_to, flat_amount: t.flat_amount, unit_amount: t.unit_amount }));

/** Simulácia Stripe graduated z JSON tiers (nezávislá od kódu v pricing-v2.ts). */
function graduated(tiers: CatalogTier[], quantity: number): number {
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

describe("scripts/ops/stripe-v2 katalóg vs kód (cenník v3)", () => {
  it("licencia: jeden produkt, dve tiered graduated ceny, tiers z PRICING_V3_SEAT_TIERS, env kľúč z kontraktu", () => {
    for (const [interval, sku] of [["month", "licence_month"], ["year", "licence_year"]] as const) {
      const item = bySku(sku);
      expect(item.name, sku).toBe("Revolis licencia");
      expect(item.billing_scheme, sku).toBe("tiered");
      expect(item.tiers_mode, sku).toBe("graduated");
      expect(item.recurring_interval, sku).toBe(interval);
      expect(item.unit_amount_cents, sku).toBeUndefined();
      expect(item.tiers, sku).toEqual(asCatalogTiers(PRICING_V3_SEAT_TIERS[interval]));
      expect(item.env_key, sku).toBe(PRICING_V3_SEAT_PRICE_ENV[interval]);
    }
    // ročná je druhá Price na produkte mesačnej
    expect(bySku("licence_year").product_sku).toBe("licence_month");
    expect(bySku("licence_month").product_sku).toBeUndefined();
  });

  it("graduated výpočet z tiers katalógu = licenseNetCents(n, interval) pre n = 1…60 (ročne aj mesačne)", () => {
    for (const [interval, sku] of [["month", "licence_month"], ["year", "licence_year"]] as const) {
      for (let n = 1; n <= 60; n++) {
        expect(graduated(bySku(sku).tiers!, n), `${interval} n=${n}`).toBe(licenseNetCents(n, interval));
      }
    }
  });

  it("šesť mesačných balíkov 50–300 na jednom samostatnom produkte a jednorazový kredit 0,75 €", () => {
    expect(PRICING_V2_MONTHLY_PACKS.map((p) => p.credits)).toEqual([50, 100, 150, 200, 250, 300]);
    for (const p of PRICING_V2_MONTHLY_PACKS) {
      const item = bySku(`credits_${p.credits}_month`);
      expect(item.unit_amount_cents).toBe(p.netCents);
      expect(item.credits_per_cycle).toBe(p.credits);
      expect(item.recurring_interval).toBe("month");
      expect(item.env_key).toBe(PRICING_V2_PACK_PRICE_ENV[p.credits]);
      expect(item.name).toBe("Revolis balíky kreditov");
      expect(item.gross_example_cents).toBe(priceFromNetCents(p.netCents).grossCents);
      if (p.credits !== 50) expect(item.product_sku).toBe("credits_50_month");
    }
    const unit = bySku("credit_unit_one_time");
    expect(unit.unit_amount_cents).toBe(PRICING_V2_CREDIT_NET_CENTS);
    expect(unit.unit_amount_cents).toBe(75);
    expect(unit.env_key).toBe(PRICING_V2_CREDIT_PRICE_ENV);
    expect(unit.recurring_interval).toBeNull();
    expect(catalog.items).toHaveLength(9);
  });

  it("kupón akcie 9/12: 25 %, once, redeem_by 2026-12-31T22:59:59Z, len produkt licencie, env kľúč z kontraktu", () => {
    expect(catalog.coupons).toHaveLength(1);
    const c = catalog.coupons[0];
    expect(c.percent_off).toBe(25);
    expect(c.duration).toBe("once");
    expect(c.redeem_by).toBe(1798757999);
    expect(c.redeem_by).toBe(Date.parse(PRICING_V3_PROMO_UNTIL) / 1000);
    expect(c.redeem_by_iso).toBe(PRICING_V3_PROMO_UNTIL);
    expect(c.env_key).toBe(PRICING_V3_ANNUAL_PROMO_COUPON_ENV);
    expect(bySku(String(c.applies_to_product_sku)).name).toBe("Revolis licencia");
    expect(bySku(String(c.applies_to_product_sku)).product_sku).toBeUndefined();
  });

  it("mena EUR a tax_behavior exclusive; staré v2 SKU, env a sumy v katalógu nie sú", () => {
    expect(catalog.currency).toBe("eur");
    expect(catalog.tax_behavior).toBe("exclusive");
    expect(catalog.catalog_version).toBe("revolis_v3_2026_10_21");
    const text = JSON.stringify(catalog);
    expect(text).not.toMatch(/STRIPE_PRICE_V2_|revolis_v2_|credits_(60|120|180|240)_month/);
    expect(catalog.items.find((i) => i.unit_amount_cents === 70)).toBeUndefined();
    expect(text).not.toMatch(/pilot/i);
  });

  it("názvy produktov, sumy a tiers zodpovedajú manifestu verifikátora (gate pricing_v2)", () => {
    for (const item of catalog.items) {
      const row = manifest.prices.find((m) => m.env === item.env_key)!;
      expect(row, String(item.env_key)).toBeDefined();
      expect(row.product).toBe(item.name);
      if (item.billing_scheme === "tiered") {
        expect(row.amount).toBeUndefined();
        expect(row.tiers).toEqual(item.tiers);
        expect(row.interval ?? "month").toBe(item.recurring_interval);
      } else {
        expect(row.amount).toBe(item.unit_amount_cents);
      }
    }
    const c = catalog.coupons[0];
    const mc = manifest.coupons.find((m) => m.env === c.env_key)!;
    expect(mc).toBeDefined();
    expect([mc.name, mc.percent_off, mc.duration, mc.redeem_by]).toEqual([c.name, c.percent_off, c.duration, c.redeem_by]);
    expect(mc.applies_to_product).toBe(bySku(String(c.applies_to_product_sku)).name);
  });

  it("testovací skript prejde vlastnou validáciou (bez siete) a vypíše tiers, kupón a balíky", () => {
    const res = spawnSync("python3", [join(DIR, "stripe_test_catalog.py")], { encoding: "utf8" });
    expect(res.status, res.stderr).toBe(0);
    expect(res.stdout).toContain("licence_year | do 1: flat 300.00; do 2: flat 300.00; do 5: flat 180.00; do 10: 108.00/ks; do 20: 72.00/ks; do 30: flat 0.03 + 53.33/ks; do 50: 48.00/ks; do inf: 36.00/ks");
    expect(res.stdout).toContain("licence_month | do 1: flat 30.00; do 2: flat 30.00; do 5: flat 18.00; do 10: 10.80/ks; do 20: 7.20/ks; do 30: 4.60/ks; do 50: 4.80/ks; do inf: 3.60/ks");
    expect(res.stdout).toContain("Kupon annual_promo: -25 %, duration=once, redeem_by=2026-12-31T22:59:59Z (1798757999)");
    expect(res.stdout).toContain("credits_50_month | 26.00 | 31.98 | 50 |");
    expect(res.stdout).toContain("credit_unit_one_time | 0.75 | 0.92 | 1 |");
  });

  it("skript nevie vytvoriť live objekty: vyžaduje sk_test_ a odmieta livemode odpoveď", () => {
    const src = readFileSync(join(DIR, "stripe_test_catalog.py"), "utf8");
    expect(src).toContain('startswith("sk_test_")');
    expect(src).not.toMatch(/sk_live_/);
    expect(src).toContain("Stripe vytvoril produkt v live režime");
    expect(src).toContain("Stripe vytvoril cenu v live režime");
    expect(src).toContain("Stripe vytvoril {what} v live režime");
  });

  it("test skript zakladá tiered cenu s tiers[i][up_to|flat_amount|unit_amount] a kupón s applies_to bez siete", () => {
    const src = readFileSync(join(DIR, "stripe_test_catalog.py"), "utf8");
    expect(src).toContain('params["billing_scheme"] = "tiered"');
    expect(src).toContain('params["tiers_mode"] = item["tiers_mode"]');
    expect(src).toContain('f"tiers[{i}][up_to]"');
    expect(src).toContain('f"tiers[{i}][flat_amount]"');
    expect(src).toContain('f"tiers[{i}][unit_amount]"');
    expect(src).toContain('"applies_to[products][0]"');
    expect(src).toContain('"redeem_by": coupon["redeem_by"]');
    const posts = [...src.matchAll(/request\(\s*"POST",\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(posts)).toEqual(new Set(["/products", "/prices", "/coupons"]));
  });
});
