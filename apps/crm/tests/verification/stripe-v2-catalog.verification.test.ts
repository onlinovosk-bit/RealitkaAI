/**
 * Katalóg pre Stripe v `scripts/ops/stripe-v2/` sa nesmie rozísť s kódom ani s manifestom.
 * Zdroj pravdy: pricing-v2.ts (sumy, kredity), pricing-v2-contract.ts (env kľúče),
 * scripts/ops/stripe-expected-prices.json (názvy produktov a sumy pre verifikátor).
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRICING_V2_BANDS,
  PRICING_V2_CREDIT_NET_CENTS,
  PRICING_V2_MONTHLY_PACKS,
  priceFromNetCents,
} from "@/lib/pricing-v2";
import {
  PRICING_V2_BAND_PRICE_ENV,
  PRICING_V2_CREDIT_PRICE_ENV,
  PRICING_V2_PACK_PRICE_ENV,
} from "@/lib/pricing-v2-contract";

const DIR = join(__dirname, "../../../../scripts/ops/stripe-v2");
const catalog = JSON.parse(readFileSync(join(DIR, "revolis-stripe-v2-catalog.json"), "utf8")) as {
  items: Array<Record<string, unknown>>;
  tax_behavior: string;
  currency: string;
};
const manifest = (
  JSON.parse(readFileSync(join(DIR, "../stripe-expected-prices.json"), "utf8")) as {
    prices: Array<{ env: string; product: string; amount: number; type: string }>;
  }
).prices;
const bySku = (sku: string) => catalog.items.find((i) => i.sku === sku)!;

describe("scripts/ops/stripe-v2 katalóg vs kód", () => {
  it("štyri plány: suma, kredity, pásma, env kľúč", () => {
    for (const b of PRICING_V2_BANDS) {
      const item = bySku(`${b.id}_month`);
      expect(item.unit_amount_cents, b.id).toBe(b.netCents);
      expect(item.credits_per_cycle, b.id).toBe(b.monthlyCredits);
      expect(item.seat_min, b.id).toBe(b.minUsers);
      expect(item.seat_max, b.id).toBe(b.maxUsers);
      expect(item.env_key, b.id).toBe(PRICING_V2_BAND_PRICE_ENV[b.id]);
      expect(item.gross_example_cents, b.id).toBe(priceFromNetCents(b.netCents).grossCents);
    }
  });

  it("zahrnuté kredity plánov sú 20 / 50 / 100 / 150", () => {
    expect(["start", "team", "office", "network"].map((id) => bySku(`${id}_month`).credits_per_cycle)).toEqual([20, 50, 100, 150]);
  });

  it("päť mesačných balíkov a jednorazový kredit", () => {
    for (const p of PRICING_V2_MONTHLY_PACKS) {
      const item = bySku(`credits_${p.credits}_month`);
      expect(item.unit_amount_cents).toBe(p.netCents);
      expect(item.credits_per_cycle).toBe(p.credits);
      expect(item.env_key).toBe(PRICING_V2_PACK_PRICE_ENV[p.credits]);
    }
    const unit = bySku("credit_unit_one_time");
    expect(unit.unit_amount_cents).toBe(PRICING_V2_CREDIT_NET_CENTS);
    expect(unit.env_key).toBe(PRICING_V2_CREDIT_PRICE_ENV);
    expect(unit.recurring_interval).toBeNull();
    expect(catalog.items).toHaveLength(10);
  });

  it("mena EUR a tax_behavior exclusive", () => {
    expect(catalog.currency).toBe("eur");
    expect(catalog.tax_behavior).toBe("exclusive");
  });

  it("názvy produktov a sumy zodpovedajú manifestu verifikátora (pregate pricing_v2)", () => {
    for (const item of catalog.items) {
      const row = manifest.find((m) => m.env === item.env_key)!;
      expect(row, String(item.env_key)).toBeDefined();
      expect(row.product).toBe(item.name);
      expect(row.amount).toBe(item.unit_amount_cents);
    }
  });

  it("testovací skript prejde vlastnou validáciou (bez siete)", () => {
    const res = spawnSync("python3", [join(DIR, "stripe_test_catalog.py")], { encoding: "utf8" });
    expect(res.status, res.stderr).toBe(0);
    expect(res.stdout).toContain("start_month | 25.00 | 30.75 | 20 |");
  });

  it("skript nevie vytvoriť live objekty: vyžaduje sk_test_", () => {
    const src = readFileSync(join(DIR, "stripe_test_catalog.py"), "utf8");
    expect(src).toContain('startswith("sk_test_")');
    expect(src).not.toMatch(/sk_live_/);
  });
});
