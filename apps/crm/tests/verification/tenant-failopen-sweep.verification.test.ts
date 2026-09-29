import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const CRM_ROOT = process.cwd();
const API_ROOT = join(CRM_ROOT, "src/app/api");

/**
 * Fail-open tenant gate: `if (caller?.agency_id && row.agency_id !== caller.agency_id)`.
 *
 * Pri `agency_id = null` sa podmienka skratuje a brána sa preskočí. Profily bez
 * agentúry reálne vznikajú (`api/invite/route.ts` ich vyrába), takže to nie je
 * teoretický prípad. Za bránou pritom často nasleduje service-role klient, ktorý
 * obchádza RLS.
 *
 * Tento test drží vzor mimo `src/app/api`. Keď pribudne nová routa s tou istou
 * konštrukciou, spadne tu, nie až v produkcii.
 */
const FAIL_OPEN = /\?\.agency_id\s*&&/;

/**
 * Jediná známa výnimka. `lead_assignment_rules` nemá stĺpec `agency_id` — oprava
 * potrebuje migráciu a rieši ju PR #490 vrátane tenant RLS. Keby sme sem siahli
 * teraz, #490 by sa prestalo dať zmergovať.
 */
const ALLOWED = new Set(["automation/rules/[id]/route.ts"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("[verification] tenant gates fail closed across the API surface", () => {
  const files = walk(API_ROOT);

  it("nájde route súbory (inak by test bol prázdny a vždy zelený)", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("žiadna routa mimo známej výnimky nepoužíva fail-open vzor", () => {
    const offenders = files
      .filter((f) => FAIL_OPEN.test(readFileSync(f, "utf8")))
      .map((f) => relative(API_ROOT, f).split("\\").join("/"))
      .filter((rel) => !ALLOWED.has(rel));

    expect(offenders).toEqual([]);
  });

  it("výnimka stále existuje — keď ju #490 opraví, zmaž ju aj odtiaľto", () => {
    // Bez tejto kontroly by zoznam výnimiek potichu zhnil.
    for (const rel of ALLOWED) {
      const body = readFileSync(join(API_ROOT, rel), "utf8");
      expect(FAIL_OPEN.test(body)).toBe(true);
    }
  });

  it("brány, ktoré stoja pred service-role klientom, používajú sameAgency", () => {
    const guarded = [
      "integrations/hubspot/sync/route.ts",
      "ai/call/analyze/route.ts",
    ];
    for (const rel of guarded) {
      const body = readFileSync(join(API_ROOT, rel), "utf8");
      expect(body).toContain("sameAgency(");
      expect(body).toMatch(/createAdminClient|createServiceRoleClient/);
    }
  });
});
