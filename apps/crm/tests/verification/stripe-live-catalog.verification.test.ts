/**
 * BOD 10 (zadanie foundera 2026-10-15): skript, ktorym founder zaklada ceny v
 * Stripe LIVE. Kampan stoji na cennikoch Start 25 / Team 60 / Kancelaria 149 /
 * Siet od 349 EUR bez DPH, takze sa tu pinuju dve veci:
 *   1. skript by v live zalozil presne tie sumy (inac by sa cennik rozisiel s webom),
 *   2. nezalozi nic bez vedomeho potvrdenia a nic existujuce nezmaze.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT = join(__dirname, "../../../../scripts/ops/stripe-v2/stripe_live_catalog.py");
const src = readFileSync(SCRIPT, "utf8");
const run = (...args: string[]) => spawnSync("python3", [SCRIPT, ...args], { encoding: "utf8" });

describe("stripe_live_catalog.py — plan bez siete", () => {
  it("bez argumentov vypise plan a skonci uspesne", () => {
    const res = run();
    expect(res.status, res.stderr).toBe(0);
    expect(res.stdout).toContain("Nic sa neposlalo do Stripe");
  });

  it("plan nesie presne tie sumy, ktore ide founder predavat", () => {
    const out = run().stdout;
    expect(out).toContain("start_month | Revolis Start | 25.00");
    expect(out).toContain("team_month | Revolis Team | 60.00");
    expect(out).toContain("office_month | Revolis Kancelária | 149.00");
    expect(out).toContain("network_month | Revolis Sieť | 349.00");
  });

  it("plan uvadza aj env kluc ku kazdej cene, aby sa dalo nastavit Vercel", () => {
    const out = run().stdout;
    for (const env of [
      "STRIPE_PRICE_V2_START",
      "STRIPE_PRICE_V2_TEAM",
      "STRIPE_PRICE_V2_OFFICE",
      "STRIPE_PRICE_V2_NETWORK",
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

  it("nic nemaze ani neupravuje: ziadne DELETE a ziadny zapis mimo produktov a cien", () => {
    expect(src).not.toMatch(/"DELETE"/);
    const posts = [...src.matchAll(/request\(\s*"POST",\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(posts)).toEqual(new Set(["/products", "/prices"]));
  });

  it("kluc necita z argumentu ani z repozitara", () => {
    expect(src).toContain("STRIPE_LIVE_SECRET_KEY");
    expect(src).toContain("getpass.getpass");
    expect(src).not.toMatch(/sk_live_[A-Za-z0-9]{6,}/);
  });

  it("idempotencia stoji na lookup_key, nie na poradi spustenia", () => {
    expect(src).toContain("prices_for(item[\"lookup_key\"])");
    expect(src).toContain("Idempotency-Key");
  });
});
