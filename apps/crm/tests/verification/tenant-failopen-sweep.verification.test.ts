import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
 * DRUHÝ fail-open tvar (TENANT-GATE-2, nález PII-GATE-AUDIT): brána obalená do
 * `if (caller?.agency_id) { … row.agency_id !== caller.agency_id … }`. Profil bez
 * agentúry blok celý preskočí, takže prejde rovnako ako pri `&&` vzore vyššie.
 *
 * Zámerne sa hľadá aj porovnanie vo vnútri bloku (do 400 znakov): holé
 * `if (profile?.agency_id) { … }` bez porovnania (napr. voliteľné logovanie) brána nie je.
 */
const FAIL_OPEN_WRAPPED =
  /if\s*\(\s*\w+\??\.agency_id\s*\)\s*\{[\s\S]{0,400}?!==\s*\w+\??\.agency_id/;

/**
 * Jediná výnimka — a je naviazaná na svoju PRÍČINU, nie na dátum ani na to, či si
 * niekto spomenie ju zmazať.
 *
 * `lead_assignment_rules` nemá stĺpec `agency_id`, takže tam nie je podľa čoho
 * bránu postaviť. Chýbajúci stĺpec dopĺňa migrácia z PR #490. Kým tá migrácia
 * v repozitári nie je, vzor v tomto jednom súbore tolerujeme; v okamihu, keď
 * pribudne, výnimka zaniká a súbor musí byť čistý.
 *
 * Preto tu nie je pevný zoznam. Pevný zoznam by po merge #490 zhnil a nikto by
 * si to nevšimol — presne to, čomu má tento súbor brániť. Zoznam sa počíta zo
 * stavu repozitára, takže test je zelený pred aj po #490 a červený vtedy, keď
 * skutočne má byť.
 */
const ASSIGNMENT_RULES_ROUTE = "automation/rules/[id]/route.ts";
const ASSIGNMENT_RULES_TENANT_MIGRATION =
  "supabase/migrations/20260827230000_lead_assignment_rules_tenant_rls.sql";

function agencyColumnMigrationLanded(): boolean {
  return existsSync(join(CRM_ROOT, ASSIGNMENT_RULES_TENANT_MIGRATION));
}

const ALLOWED = new Set(
  agencyColumnMigrationLanded() ? [] : [ASSIGNMENT_RULES_ROUTE],
);

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

  it("žiadna routa nepoužíva fail-open brány obalené do if (caller?.agency_id) { … !== … }", () => {
    const offenders = files
      .filter((f) => FAIL_OPEN_WRAPPED.test(readFileSync(f, "utf8")))
      .map((f) => relative(API_ROOT, f).split("\\").join("/"));

    expect(offenders).toEqual([]);
  });

  it("výnimka platí presne dovtedy, kým chýba migrácia, ktorá jej berie dôvod", () => {
    const migrationLanded = agencyColumnMigrationLanded();
    const routeFailsOpen = FAIL_OPEN.test(
      readFileSync(join(API_ROOT, ASSIGNMENT_RULES_ROUTE), "utf8"),
    );

    if (migrationLanded) {
      // #490 je vnútri: `lead_assignment_rules` má `agency_id`, bránu sa dá
      // postaviť, takže tolerancia skončila.
      expect(routeFailsOpen).toBe(false);
    } else {
      // Ešte nie je čím bránu postaviť. Keby tu vzor už nebol, výnimka je
      // zbytočná a patrí preč aj s touto vetvou.
      expect(routeFailsOpen).toBe(true);
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
