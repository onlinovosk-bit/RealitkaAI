/**
 * CHECKOUT-PROBE-01 — krok D ako skript, nie ako päť ručných klikov.
 *
 * Kit §8 mal prvú položku „`GET /api/billing/checkout-config` →
 * `seatCheckoutAvailable: true`" ako vec, ktorú si niekto pozrie okom.
 * `scripts/ops/stripe-checkout-probe.py` z nej robí jeden príkaz s exit kódom.
 *
 * Tieto testy NEvytvárajú ručný obrázok odpovede — volajú **skutočnú route**
 * (`GET /api/billing/checkout-config`), jej telo podstrčia **skutočnému
 * skriptu** cez `--fixture` a pozerajú na exit kód. Keby route zmenila tvar
 * (premenovaný `seatTiers[].key`, iná obálka), sonda by na PROD mlčky tvrdila
 * nezmysel a tu to zhasne.
 *
 * Sumy sa kontrolujú proti `scripts/ops/stripe-expected-prices.json`; že ten
 * manifest sedí s `program-tier-pricing.ts`, drží sused
 * `stripe-expected-prices.verification.test.ts`.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET } from "@/app/api/billing/checkout-config/route";

const OPS = resolve(__dirname, "../../../../scripts/ops");
const PROBE = join(OPS, "stripe-checkout-probe.py");
const MANIFEST = join(OPS, "stripe-expected-prices.json");

type ManifestRow = { env: string; key: string; amount: number };
const manifest = (): ManifestRow[] =>
  (JSON.parse(readFileSync(MANIFEST, "utf8")) as { prices: ManifestRow[] }).prices;

/** Platné `price_*` ID (`STRIPE_PRICE_ID_PATTERN`), hodnota je vymyslená a neodchádza nikam. */
const fakePriceId = (i: number) => `price_fixture${String(i).padStart(8, "0")}`;

/** Spustí SKUTOČNÝ skript nad daným telom odpovede. */
function runProbe(payload: unknown): { code: number | null; out: string } {
  const file = join(mkdtempSync(join(tmpdir(), "checkout-probe-")), "fixture.json");
  writeFileSync(file, JSON.stringify(payload));
  const res = spawnSync("python3", [PROBE, "--fixture", file], { encoding: "utf8" });
  return { code: res.status, out: `${res.stdout}${res.stderr}` };
}

/** Telo, ktoré route naozaj vráti pri danom prostredí. */
async function liveBody(): Promise<Record<string, unknown>> {
  return (await (await GET()).json()) as Record<string, unknown>;
}

const PRICE_ENVS = manifest().map((r) => r.env);
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(PRICE_ENVS.map((k) => [k, process.env[k]]));
  for (const k of PRICE_ENVS) delete process.env[k];
});

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("sonda proti skutočnej route", () => {
  it("bez nastavených premenných je červená a vymenuje NÁZVY, nie hodnoty", async () => {
    const { code, out } = runProbe({ status: 200, body: await liveBody() });
    expect(code).toBe(1);
    expect(out).toMatch(/^NIE {2}seat/m);
    for (const env of ["STRIPE_PRICE_SOLO_SEAT", "STRIPE_PRICE_TEAM_SEAT", "STRIPE_PRICE_OFFICE_SEAT"]) {
      expect(out).toContain(`chyba env: ${env}`);
    }
    // Hodnota premennej sa do výpisu nesmie dostať ani náhodou.
    expect(out).not.toContain("price_");
  });

  it("so všetkými premennými je zelená a sumy sedia na manifest", async () => {
    manifest().forEach((row, i) => {
      process.env[row.env] = fakePriceId(i + 1);
    });
    const { code, out } = runProbe({ status: 200, body: await liveBody() });
    expect(out).toMatch(/^OK {3}sumy/m);
    expect(out).toMatch(/^OK {3}seat/m);
    expect(out).toMatch(/^OK {3}topup/m);
    expect(code).toBe(0);
  });

  it("chýbajúci top-up nezhodí seat bránu, ale sonda zostane červená", async () => {
    manifest()
      .filter((r) => r.key !== "mega")
      .forEach((row, i) => {
        process.env[row.env] = fakePriceId(i + 1);
      });
    const { code, out } = runProbe({ status: 200, body: await liveBody() });
    expect(out).toMatch(/^OK {3}seat/m);
    expect(out).toMatch(/^NIE {2}topup/m);
    expect(out).toContain("chyba env: STRIPE_PRICE_CREDITS_MEGA");
    expect(code).toBe(1);
  });

  it("povie, ktorá z dvoch cockpit cien platí — to je pasca z kitu §3", async () => {
    manifest().forEach((row, i) => {
      process.env[row.env] = fakePriceId(i + 1);
    });
    const { out } = runProbe({ status: 200, body: await liveBody() });
    expect(out).toMatch(/cockpit {2}Owner Cockpit, plati cena: (founder 249 EUR|standard 349 EUR)/);
  });
});

describe("sonda chytí drift aj nečitateľnú odpoveď", () => {
  it("nasadený kód s inou sumou je nález, nie OK", async () => {
    manifest().forEach((row, i) => {
      process.env[row.env] = fakePriceId(i + 1);
    });
    const body = await liveBody();
    // Presne ten prípad, pre ktorý sonda existuje: env sedí, cena nie.
    (body.seatTiers as Array<{ key: string; priceEur: number }>)[0].priceEur = 75;
    const { code, out } = runProbe({ status: 200, body });
    expect(out).toMatch(/solo: PROD ponuka 75\.00 EUR, manifest ma 79\.00 EUR/);
    expect(code).toBe(1);
  });

  it("položka, ktorú PROD vôbec nevystaví, je nález", async () => {
    manifest().forEach((row, i) => {
      process.env[row.env] = fakePriceId(i + 1);
    });
    const body = await liveBody();
    body.topupPackages = (body.topupPackages as Array<{ key: string }>).filter(
      (p) => p.key !== "pro",
    );
    const { code, out } = runProbe({ status: 200, body });
    expect(out).toContain("pro: PROD tuto polozku nevystavil");
    expect(code).toBe(1);
  });

  it("HTTP 503 je 2 (nedosiahnuteľné), nie 1 (chýbajúca cena)", () => {
    const { code } = runProbe({ status: 503, body: "<html>no deployment</html>" });
    expect(code).toBe(2);
  });

  it("telo bez ok:true nie je tá route", () => {
    const { code, out } = runProbe({ status: 200, body: { seatCheckoutAvailable: true } });
    expect(out).toContain("to nie je checkout-config");
    expect(code).toBe(2);
  });

  it("nečitateľné telo je 2, nie tichá nula", () => {
    const { code } = runProbe({ status: 200, body: "not json at all" });
    expect(code).toBe(2);
  });
});
