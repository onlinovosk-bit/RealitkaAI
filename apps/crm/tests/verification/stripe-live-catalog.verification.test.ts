/**
 * Skript, ktorym founder (Andrej, až po merge PR „Cenník v3“) zakladá ceny v Stripe LIVE.
 * Pinuje sa tu:
 *   1. skript by v live založil presne cenník v3 (tiers licencie, kupón 9/12, balíky, kredit),
 *   2. predvolene je DRY-RUN, nezapíše nič bez vedomého potvrdenia a nič existujúce nezmaže.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT = join(__dirname, "../../../../scripts/ops/stripe-v2/stripe_live_catalog.py");
const SHARED = join(__dirname, "../../../../scripts/ops/stripe-v2/stripe_test_catalog.py");
const src = readFileSync(SCRIPT, "utf8");
const shared = readFileSync(SHARED, "utf8");
const run = (...args: string[]) => {
  // Žiadny skutočný kľúč nesmie presiahnuť do testu.
  const env = { ...process.env };
  delete env.STRIPE_LIVE_SECRET_KEY;
  return spawnSync("python3", [SCRIPT, ...args], { encoding: "utf8", env });
};

describe("stripe_live_catalog.py — plan bez siete (DRY-RUN je predvolený)", () => {
  it("bez argumentov vypise plan a skonci uspesne", () => {
    const res = run();
    expect(res.status, res.stderr).toBe(0);
    expect(res.stdout).toContain("DRY-RUN");
    expect(res.stdout).toContain("Nic sa neposlalo do Stripe");
  });

  it("plan nesie tiers licencie, kupon, baliky a kredit presne podla cennika v3", () => {
    const out = run().stdout;
    expect(out).toContain("licence_year | Revolis licencia | tiered graduated (do 1: flat 300.00; do 5: flat 480.00; do 10: 108.00/ks; do 20: 72.00/ks; do inf: 60.00/ks)");
    expect(out).toContain("licence_month | Revolis licencia | tiered graduated (do 1: flat 30.00; do 5: flat 48.00; do 10: 10.80/ks; do 20: 7.20/ks; do inf: 6.00/ks)");
    expect(out).toContain("annual_promo | kupon | -25 % duration=once redeem_by=2026-12-31T22:59:59Z (1798757999)");
    const packs: Array<[number, string]> = [[50, "26.00"], [100, "51.00"], [150, "74.00"], [200, "94.00"], [250, "114.00"], [300, "131.00"]];
    for (const [credits, eur] of packs) expect(out).toContain(`credits_${credits}_month | Revolis balíky kreditov | ${eur}`);
    expect(out).toContain("credit_unit_one_time | Revolis Kredit (1 ks) | 0.75");
    expect(out).not.toMatch(/credits_(60|120|180|240)_month|start_month|network_month/);
  });

  it("plan uvadza aj env kluc ku kazdej cene a kuponu, aby sa dalo nastavit Vercel", () => {
    const out = run().stdout;
    for (const env of [
      "STRIPE_PRICE_V3_SEAT_MONTHLY",
      "STRIPE_PRICE_V3_SEAT_YEARLY",
      "STRIPE_COUPON_V3_ANNUAL_PROMO",
      "STRIPE_PRICE_V3_PACK_50",
      "STRIPE_PRICE_V3_PACK_100",
      "STRIPE_PRICE_V3_PACK_150",
      "STRIPE_PRICE_V3_PACK_200",
      "STRIPE_PRICE_V3_PACK_250",
      "STRIPE_PRICE_V3_PACK_300",
      "STRIPE_PRICE_V3_CREDIT",
    ]) {
      expect(out).toContain(env);
    }
  });
});

describe("zapis do live sa neda spustit nedopatrenim", () => {
  it("--apply bez --yes-live zlyha", () => {
    const res = run("--apply", "--expect-account", "acct_test123");
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain("--yes-live");
  });

  it("--apply bez --expect-account zlyha", () => {
    const res = run("--apply", "--yes-live");
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain("--expect-account");
  });

  it("--apply bez danovych kodov zlyha", () => {
    const res = run("--apply", "--yes-live", "--expect-account", "acct_test123");
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain("tax-code");
  });

  it("--apply so vsetkym okrem --i-am-the-founder zlyha este pred akymkolvek volanim Stripe", () => {
    const res = run(
      "--apply", "--yes-live", "--expect-account", "acct_test123",
      "--plan-tax-code", "txcd_10000000", "--credit-tax-code", "txcd_10000000",
    );
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain("--i-am-the-founder");
  });

  it("zapis vyzaduje vsetkych sest potvrdeni naraz", () => {
    expect(src).toContain("--i-am-the-founder");
    expect(src).toContain("if not args.yes_live");
    expect(src).toContain("if not args.founder");
    expect(src).toContain("elif args.apply");
  });
});

describe("tvrde poistky v zdrojaku", () => {
  it("prijme vylucne live kluc", () => {
    expect(src).toContain('LIVE_KEY_PREFIX = "sk_live_"');
    expect(src).toContain("key.startswith(LIVE_KEY_PREFIX)");
  });

  it("overi, ze ucet naozaj hlasi live rezim a povolene platby", () => {
    expect(src).toContain('account.get("livemode") is not True');
    expect(src).toContain('account.get("charges_enabled") is not True');
  });

  it("nic nemaze ani neupravuje: ziadne DELETE a zapis iba produktov, cien a kuponu", () => {
    expect(src).not.toMatch(/"DELETE"/);
    expect(shared).not.toMatch(/"DELETE"/);
    const posts = [...(src + shared).matchAll(/request\(\s*"POST",\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(posts)).toEqual(new Set(["/products", "/prices", "/coupons"]));
  });

  it("kupon sa zaklada az po produkte licencie a v live musi byt livemode", () => {
    expect(src).toContain("shared.ensure_coupons(stripe, catalog, known, \"live:\", require_live)");
    expect(src.indexOf("shared.ensure_coupons")).toBeGreaterThan(src.indexOf('"/prices", shared.price_params'));
    expect(src).toContain('obj.get("livemode") is not True');
  });

  it("kluc necita z argumentu ani z repozitara", () => {
    expect(src).toContain("STRIPE_LIVE_SECRET_KEY");
    expect(src).toContain("getpass.getpass");
    expect(src).not.toMatch(/sk_live_[A-Za-z0-9]{6,}/);
    expect(src).not.toMatch(/print\([^\n]*\bkey\b/);
  });

  it("idempotencia stoji na lookup_key (ceny) a metadata (kupon), nie na poradi spustenia", () => {
    expect(src).toContain("prices_for(item[\"lookup_key\"])");
    expect(src).toContain("Idempotency-Key");
    expect(shared).toContain("def find_coupon");
    expect(shared).toContain('metadata", {}).get("revolis_sku") == coupon["sku"]');
  });

  it("existujuca cena s inymi tiers alebo existujuci kupon s inymi parametrami zastavi beh, nic sa neprepise", () => {
    expect(shared).toContain("normalize_tiers(price)");
    expect(shared).toContain("existuje, ale parametre nesedia");
    expect(shared).toContain("def check_existing_coupon");
  });
});
