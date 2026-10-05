/**
 * CHECKOUT-TAX-01 — runbook nesmie tvrdiť o DPH niečo, čo kód nerobí.
 *
 * `docs/runbooks/calendly-a-stripe-nastavenie.md` §B2 do 2026-10-05 tvrdil:
 * „ak ich myslíš s DPH, nastav inclusive, inak Stripe pripočíta DPH navrch
 * a zákazník zaplatí 58,80 € tam, kde si sľúbil 49 €."
 *
 * Merané: tento kód neposiela `automatic_tax` ani `tax_behavior` ani
 * `tax_rates` ani `tax_id_collection` — nikde. Stripe teda účtuje presne
 * `unit_amount` a nepripočíta nič. Tá veta vedela doviesť foundera k zadaniu
 * desiatich cien v sumách bez DPH; použitú Stripe cenu už nemožno prepísať,
 * iba archivovať a nahradiť.
 *
 * Pin drží OBE strany naraz: kým kód daňové API nepoužíva, runbook o ňom
 * nesmie strašiť. Keď sa `automatic_tax` naozaj zapne, zhasne tento test —
 * a runbook sa prepíše spolu s ním, nie o pol roka neskôr.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = resolve(__dirname, "../../../..");
const TAX_API = /\b(automatic_tax|tax_behavior|tax_rates|tax_id_collection)\b/;

/** Zdrojové súbory v apps/, ktoré pozná git — bez node_modules a buildov. */
function appSources(): string[] {
  const res = spawnSync("git", ["ls-files", "apps"], { cwd: REPO, encoding: "utf8" });
  if (res.status !== 0) throw new Error(`git ls-files zlyhalo: ${res.stderr}`);
  return res.stdout.split("\n").filter((f) => /\.(ts|tsx|js|mjs)$/.test(f));
}

/**
 * Komentáre sa odstrihnú: pin, ktorý zhasne na vlastnom vysvetlení, stráži
 * formuláciu, nie vlastnosť (poučenie z EVENTS-WIRE, kde to padlo trikrát).
 */
const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[^\S\n]*\/\/.*$/gm, "");

describe("Checkout neúčtuje daň navyše", () => {
  it("žiadny zdroj v apps/ neposiela daňové pole do Stripe", () => {
    const offenders = appSources().filter((f) =>
      TAX_API.test(codeOnly(readFileSync(join(REPO, f), "utf8"))),
    );
    // Keď tu niečo pribudne, nie je to nutne chyba — ale runbook §B2 vtedy
    // prestáva platiť a musí sa prepísať v tom istom PR.
    expect(offenders).toEqual([]);
  });
});

describe("runbook hovorí to isté, čo kód", () => {
  const RUNBOOK = join(REPO, "docs/runbooks/calendly-a-stripe-nastavenie.md");
  const text = readFileSync(RUNBOOK, "utf8");

  it("už nestraší pripočítaním DPH navrch", () => {
    expect(text).not.toContain("pripočíta DPH navrch");
    expect(text).not.toContain("58,80");
  });

  it("hovorí, že suma je presne to, čo zákazník zaplatí, a odkazuje na --spec", () => {
    expect(text).toContain("--spec");
    expect(text).toMatch(/automatic_tax/);
  });
});
