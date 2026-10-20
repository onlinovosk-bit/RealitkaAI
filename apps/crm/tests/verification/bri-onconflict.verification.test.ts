import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const MIGRATIONS = join(ROOT, "supabase", "migrations");
const MIGRACIA = "20261020050000_bri_onconflict_lead_id.sql";

const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

/**
 * BRI-ONCONFLICT. `compute_bri_score` aj `compute_bri_score_v2` upsertovali do
 * `lead_scores` s `ON CONFLICT (profile_id, lead_id)`. Taký constraint na
 * tabuľke nie je — má `PRIMARY KEY (id)` a `UNIQUE (lead_id)` — takže obe
 * funkcie padali pri každom volaní. Zmerané v PROD 2026-10-19: cron
 * `recompute-bri` 3 z 3 pokusov `failed`, `lead_scores` 0 riadkov.
 *
 * Tieto testy držia dve veci: že oprava je v repe, a že sa chyba nevráti
 * novou migráciou. Samotné SPRÁVANIE migrácie overuje až jej aplikovanie —
 * pokiaľ na PROD nebeží, je NEZMERANÉ a tieto testy to netvrdia.
 */
describe("[verification] BRI: ON CONFLICT cieli na constraint, ktorý existuje", () => {
  it("migrácia patchuje živú definíciu, neprepisuje ju kópiou z repa", () => {
    const sql = read(`supabase/migrations/${MIGRACIA}`);
    // Pri 138 migráciách v repe vs 78 aplikovaných by kópia potichu vrátila
    // späť zmeny, o ktorých nevieme. Preto pg_get_functiondef + replace.
    expect(sql).toContain("pg_get_functiondef");
    expect(sql).toContain("ON CONFLICT (profile_id, lead_id)");
    expect(sql).toContain("'ON CONFLICT (lead_id)'");
  });

  it("migrácia spadne, keď nenájde, čo má opraviť — nenechá PROD v polovici", () => {
    const sql = read(`supabase/migrations/${MIGRACIA}`);
    expect(sql).toContain("RAISE EXCEPTION");
    expect(sql).toMatch(/BEGIN;[\s\S]*COMMIT;/);
    // Overenie po patchi: ani jedna funkcia už nesmie cieliť na neexistujúci kľúč.
    expect(sql).toContain("stále cieli na (profile_id, lead_id)");
  });

  it("pri konflikte na lead_id riadok prevezme aktuálneho vlastníka", () => {
    // leads.assigned_profile_id priraďuje lead jednému profilu. Po prepise
    // leadu na iného makléra musí ísť riadok skóre za ním, inak ho čítanie
    // `.eq(lead_id).eq(profile_id)` nenájde.
    const sql = read(`supabase/migrations/${MIGRACIA}`);
    expect(sql).toContain("profile_id       = EXCLUDED.profile_id,");
  });

  it("UNIQUE (lead_id) sa neruší — závisí od neho tretí zapisovateľ", () => {
    const sql = read(`supabase/migrations/${MIGRACIA}`);
    expect(sql).not.toMatch(/DROP\s+(CONSTRAINT|INDEX)/i);
    expect(sql).not.toMatch(/ALTER\s+TABLE[\s\S]*lead_scores/i);

    // enterprise-intelligence-store upsertuje na lead_id z /api/ai/process-lead.
    const store = read("src/lib/db/enterprise-intelligence-store.ts");
    expect(store).toContain('onConflict: "lead_id"');
  });

  it("žiadna NOVŠIA migrácia nevráti ON CONFLICT (profile_id, lead_id)", () => {
    const neskorsie = readdirSync(MIGRATIONS)
      .filter((f) => f.endsWith(".sql") && f > MIGRACIA);

    const previnilci = neskorsie.filter((f) => {
      const sql = readFileSync(join(MIGRATIONS, f), "utf8");
      // Len skutočný upsert, nie zmienka v komentári.
      return /ON CONFLICT\s*\(\s*profile_id\s*,\s*lead_id\s*\)\s*(\r?\n\s*)?DO UPDATE/i.test(sql);
    });

    expect(previnilci).toEqual([]);
  });

  it("obaja volajúci čítajú riadok podľa lead_id A profile_id", () => {
    // Keby niektorý čítal len podľa lead_id, prepis vlastníka by mu vrátil
    // cudzí riadok. Toto drží, že oba filtre zostanú.
    const v1 = read("src/lib/events/bri-score.ts");
    const v2 = read("src/lib/bri/engine.ts");
    for (const src of [v1, v2]) {
      expect(src).toContain("'lead_id'");
      expect(src).toContain("'profile_id'");
    }
  });
});
