/**
 * CHECKOUT-FAILCLOSED-01 — dve miesta, ktoré jednotkový test route nechytí.
 *
 * 1. `/upgrade` nemá vlastný test (je to veľký klientský komponent), takže
 *    návrat k fail-open `!== false` by nič nezhodilo. Mutácia to potvrdila:
 *    route testy zostali zelené.
 * 2. Že route nevracia interné hlášky, drží jednotkový test na správaní —
 *    tento pin drží, že sa taká cesta ani nedá napísať (`error.message` sa
 *    do `errorResponse` nedostane).
 *
 * Komentáre sa pred kontrolou odstrihnú. Obe miesta vo svojom vysvetlení
 * citujú presne ten zakázaný tvar, takže pin bez toho zhasne sám na sebe —
 * presne to sa stalo daňovému pinu v tej istej vlne (`1d398c5`).
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const CRM = resolve(__dirname, "../..");
const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[^\S\n]*\/\/.*$/gm, "");
const read = (p: string) => codeOnly(readFileSync(join(CRM, p), "utf8"));

describe("/upgrade neponúka add-on, ktorý sa nedá kúpiť", () => {
  const page = read("src/app/(dashboard)/upgrade/page.tsx");

  it("cockpit sa ponúka len pri POTVRDENOM ownerPurchasable", () => {
    // `!== false` je pravdivé aj pre `undefined`, teda aj keď sa
    // `/api/billing/checkout-config` vôbec nenačítal (`.catch` nastaví null).
    expect(page).not.toMatch(/ownerPurchasable\s*!==\s*false/);
    expect(page).toMatch(/ownerPurchasable\s*===\s*true/);
  });
});

describe("checkout route neposiela zákazníkovi interné hlášky", () => {
  const route = read("src/app/api/billing/credits/checkout/route.ts");

  it("do odpovede nejde error.message ani String(error)", () => {
    expect(route).not.toMatch(/errorResponse\(\s*(message|String\(error\)|error\.message)/);
    expect(route).not.toMatch(/error\s+instanceof\s+Error\s*\?\s*error\.message/);
  });

  it("rozlišuje podľa typu chyby, nie podľa textu", () => {
    expect(route).toContain("error instanceof CheckoutConfigError");
    expect(route).not.toMatch(/message\.includes\(|message\.startsWith\(/);
  });

  it("konfiguračné zlyhanie je 503, nie 400", () => {
    expect(route).toMatch(/CheckoutConfigError\)\s*\{\s*return errorResponse\(UNAVAILABLE,\s*503\)/);
  });
});
