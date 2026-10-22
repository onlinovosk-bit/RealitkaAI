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
  PRICING_V2_BAND_IDS,
  PRICING_V2_MONTHLY_PACKS,
  PRICING_V3_PLAN_TIERS,
  licenseNetCents,
  priceFromNetCents,
  type PricingV3Tier,
} from "@/lib/pricing-v2";
import {
  PRICING_V2_CREDIT_PRICE_ENV,
  PRICING_V2_PACK_PRICE_ENV,
  PRICING_V3_PLAN_PRICE_ENV,
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
  const licenceSku = (band: (typeof PRICING_V2_BAND_IDS)[number], interval: "month" | "year") =>
    `licence_${band === "office" ? "kancelaria" : band === "network" ? "siet" : band}_${interval}`;

  it("licencia: jeden produkt, osem tiered graduated cien, tiers z PRICING_V3_PLAN_TIERS, env kľúče z kontraktu", () => {
    for (const band of PRICING_V2_BAND_IDS) {
      for (const interval of ["month", "year"] as const) {
        const sku = licenceSku(band, interval);
        const item = bySku(sku);
        expect(item.name, sku).toBe("Revolis licencia");
        expect(item.billing_scheme, sku).toBe("tiered");
        expect(item.tiers_mode, sku).toBe("graduated");
        expect(item.recurring_interval, sku).toBe(interval);
        expect(item.unit_amount_cents, sku).toBeUndefined();
        expect(item.tiers, sku).toEqual(asCatalogTiers(PRICING_V3_PLAN_TIERS[band][interval]));
        expect(item.env_key, sku).toBe(PRICING_V3_PLAN_PRICE_ENV[band][interval]);
      }
    }
    expect(bySku("licence_start_month").product_sku).toBeUndefined();
    for (const band of PRICING_V2_BAND_IDS) {
      for (const interval of ["month", "year"] as const) {
        const sku = licenceSku(band, interval);
        if (sku !== "licence_start_month") expect(bySku(sku).product_sku).toBe("licence_start_month");
      }
    }
  });

  it("graduated výpočet z tiers katalógu = licenseNetCents(n, interval) pre hranice pásiem", () => {
    for (const n of [1, 5, 6, 10, 11, 20, 21, 30, 31]) {
      const band = n === 1 ? "start" : n <= 5 ? "team" : n <= 10 ? "office" : "network";
      for (const interval of ["month", "year"] as const) {
        expect(graduated(bySku(licenceSku(band, interval)).tiers!, n), `${interval} n=${n}`).toBe(licenseNetCents(n, interval));
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
    expect(catalog.items).toHaveLength(15);
  });

  it("kupóny nie sú súčasťou tohto katalógu", () => {
    expect(catalog.coupons).toEqual([]);
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
    expect(manifest.coupons).toEqual([]);
  });

  it("testovací skript prejde vlastnou validáciou (bez siete) a vypíše tiers a balíky", () => {
    const res = spawnSync("python3", [join(DIR, "stripe_test_catalog.py")], { encoding: "utf8" });
    expect(res.status, res.stderr).toBe(0);
    expect(res.stdout).toContain("licence_team_year | do 5: flat 780.00");
    expect(res.stdout).toContain("licence_siet_month | do 10: flat 132.00; do 20: 7.20/ks; do inf: 6.00/ks");
    expect(res.stdout).toContain("Kupony: ziadne v tomto katalogu");
    expect(res.stdout).toContain("credits_50_month | 26.00 | 31.98 | 50 |");
    expect(res.stdout).toContain("credit_unit_one_time | 0.75 | 0.92 | 1 |");
  });

  it("skript nevie vytvoriť live objekty: vyžaduje sk_test_ a odmieta livemode odpoveď", () => {
    const src = readFileSync(join(DIR, "stripe_test_catalog.py"), "utf8");
    expect(src).toContain('startswith("sk_test_")');
    expect(src).not.toMatch(/sk_live_/);
    expect(src).toContain("Stripe vytvoril produkt v live režime");
    expect(src).toContain("Stripe vytvoril cenu v live režime");
  });

  it("test skript zakladá tiered cenu s tiers[i][up_to|flat_amount|unit_amount] bez siete", () => {
    const src = readFileSync(join(DIR, "stripe_test_catalog.py"), "utf8");
    expect(src).toContain('params["billing_scheme"] = "tiered"');
    expect(src).toContain('params["tiers_mode"] = item["tiers_mode"]');
    expect(src).toContain('f"tiers[{i}][up_to]"');
    expect(src).toContain('f"tiers[{i}][flat_amount]"');
    expect(src).toContain('f"tiers[{i}][unit_amount]"');
    const posts = [...src.matchAll(/request\(\s*"POST",\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(posts)).toEqual(new Set(["/products", "/prices"]));
  });
});
