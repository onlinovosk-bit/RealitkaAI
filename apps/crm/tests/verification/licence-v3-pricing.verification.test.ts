/**
 * LICENCE-V3 — cenník licencie (Graduated) musí sedieť s tým, čo je v Stripe.
 *
 * Referenčné sumy pochádzajú z Stripe TEST režimu (founder, 1/2/5/20/30/50/100 maklérov),
 * nie z tohto kódu: 30 maklérov = 250 € mesačne; 2 makléri ročne = 600 €; 30 maklérov ročne
 * po kupóne 25 % = 1 930,00 €. Test zamyká kód voči nim a voči JSON manifestu.
 *
 * Rozsah: tento test NEVIDÍ Stripe ani produkciu a checkout licenciu nepoužíva.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LICENCE_V3_COUPON,
  LICENCE_V3_INTERVALS,
  LICENCE_V3_LOOKUP_KEYS,
  LICENCE_V3_PRODUCT_NAME,
  LICENCE_V3_TIERS,
  licenceV3AfterCouponCents,
  licenceV3ChargeCents,
} from "@/lib/licence-v3-pricing";

const MANIFEST = join(
  resolve(__dirname, "../../../../scripts/ops"),
  "stripe-expected-licence-v3.json",
);

type ManifestTier = { up_to: number | "inf"; unit_amount: number; flat_amount: number };
type Manifest = {
  product: string;
  tax_behavior: string;
  coupon: { percent_off: number; duration: string; redeem_by: string };
  prices: {
    lookup_key: string;
    interval: "month" | "year";
    billing_scheme: string;
    tiers_mode: string;
    tiers: ManifestTier[];
  }[];
};

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as Manifest;

describe("licence v3 ↔ stripe-expected-licence-v3.json", () => {
  it("has the product, lookup keys and a graduated, tax-exclusive shape", () => {
    expect(manifest.product).toBe(LICENCE_V3_PRODUCT_NAME);
    expect(manifest.tax_behavior).toBe("exclusive");
    expect(manifest.prices.map((p) => p.lookup_key).sort()).toEqual(
      Object.values(LICENCE_V3_LOOKUP_KEYS).sort(),
    );
    for (const p of manifest.prices) {
      expect(p.billing_scheme).toBe("tiered");
      expect(p.tiers_mode).toBe("graduated");
    }
  });

  it("tiers match the code, per interval", () => {
    for (const interval of LICENCE_V3_INTERVALS) {
      const fromManifest = manifest.prices
        .find((p) => p.interval === interval)!
        .tiers.map((t) => ({
          upTo: t.up_to === "inf" ? null : t.up_to,
          unitCents: t.unit_amount,
          flatCents: t.flat_amount,
        }));
      expect(fromManifest).toEqual(LICENCE_V3_TIERS[interval]);
    }
  });

  it("coupon matches the code", () => {
    expect(manifest.coupon.percent_off).toBe(LICENCE_V3_COUPON.percentOff);
    expect(manifest.coupon.duration).toBe(LICENCE_V3_COUPON.duration);
    expect(manifest.coupon.redeem_by).toBe(LICENCE_V3_COUPON.redeemBy);
  });

  it("tiers are contiguous, ascending, and the last one is open-ended", () => {
    for (const interval of LICENCE_V3_INTERVALS) {
      const tiers = LICENCE_V3_TIERS[interval];
      const bounds = tiers.slice(0, -1).map((t) => t.upTo as number);
      expect([...bounds].sort((a, b) => a - b)).toEqual(bounds);
      expect(new Set(bounds).size).toBe(bounds.length);
      expect(tiers[tiers.length - 1].upTo).toBeNull();
    }
  });
});

describe("licenceV3ChargeCents — Stripe TEST-mode reference amounts", () => {
  it("monthly: 30 makléri = 250 €, 1 a 2 makléri = 30 € a 60 €", () => {
    expect(licenceV3ChargeCents("month", 30)).toBe(25000);
    expect(licenceV3ChargeCents("month", 1)).toBe(3000);
    expect(licenceV3ChargeCents("month", 2)).toBe(6000);
  });

  it("yearly: 2 makléri = 600 €", () => {
    expect(licenceV3ChargeCents("year", 2)).toBe(60000);
  });

  it("yearly 30 makléri po kupóne 25 % = presne 1 930,00 €", () => {
    expect(licenceV3ChargeCents("year", 30)).toBe(257333);
    expect(licenceV3AfterCouponCents(licenceV3ChargeCents("year", 30))).toBe(193000);
  });

  it("a flat fee is charged once per tier reached, a unit price per piece inside it", () => {
    // 3–5: 18 € flat, nie 18 € za kus
    expect(licenceV3ChargeCents("month", 3)).toBe(3000 + 3000 + 1800);
    expect(licenceV3ChargeCents("month", 5)).toBe(3000 + 3000 + 1800);
    // 6. maklér pridá 10,80 €
    expect(licenceV3ChargeCents("month", 6)).toBe(3000 + 3000 + 1800 + 1080);
  });

  it("51+ is open-ended and never decreases the total", () => {
    for (const interval of LICENCE_V3_INTERVALS) {
      expect(licenceV3ChargeCents(interval, 100)).toBeGreaterThan(licenceV3ChargeCents(interval, 51));
      for (let q = 1; q < 120; q++) {
        expect(licenceV3ChargeCents(interval, q + 1)).toBeGreaterThanOrEqual(
          licenceV3ChargeCents(interval, q),
        );
      }
    }
  });

  it("rejects quantities that are not a positive integer instead of returning 0 €", () => {
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      expect(() => licenceV3ChargeCents("month", bad)).toThrow(RangeError);
    }
  });
});
