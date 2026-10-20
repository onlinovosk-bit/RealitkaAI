import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { REALVIA_FAILURE_KINDS } from "@/lib/realvia/failureKinds";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

/**
 * Pripnutie poučenia z vlny A (`docs/reports/2026-10-18-vlna-a-realvia-zlyhania.md`):
 * k 2026-10-18 bolo v PROD 1 287 zlyhaní Realvia fronty a príčina ani jedného
 * nebola nikde uložená — `realvia_metrics.meta` bolo prázdne vo VŠETKÝCH 1 077
 * riadkoch a `error_message` vo fronte mala hŕstka (5 z 253). Nešlo o chýbajúci
 * stĺpec: worker písal do existujúceho `jsonb` natvrdo `{}`.
 */
describe("[verification] Realvia: príčina zlyhania sa zapisuje", () => {
  it("worker už nepíše do meta natvrdo prázdny objekt", () => {
    const metrics = read("src/lib/realvia/metrics.ts");
    // Práve tento literál spôsobil, že 1 077 riadkov nenesie príčinu.
    expect(metrics).not.toMatch(/meta:\s*\{\s*\}/);
    expect(metrics).toContain("buildMetricsMeta(row)");
  });

  it("dávka posiela do metrík spočítané druhy zlyhaní, nielen počet", () => {
    const queue = read("src/lib/realvia/processQueue.ts");
    expect(queue).toContain("tallyRealviaFailures(results)");
    expect(queue).toContain("failures:");
  });

  it("druhy zlyhaní sú uzavretá množina — do metrík nesmie tiecť text payloadu", () => {
    // GDPR aj použiteľnosť: agregovať sa dá len konečná množina.
    expect(REALVIA_FAILURE_KINDS.length).toBeGreaterThanOrEqual(5);
    expect(new Set(REALVIA_FAILURE_KINDS).size).toBe(REALVIA_FAILURE_KINDS.length);
    expect(REALVIA_FAILURE_KINDS).toContain("duplicate_source_id");
    expect(REALVIA_FAILURE_KINDS).toContain("unknown_payload");
    expect(REALVIA_FAILURE_KINDS).toContain("other");
  });
});

/**
 * Jediná septembrová chyba, ktorú máme čiernobielu z PROD, bola kolízia na
 * `idx_properties_source_id_unique` — UNIQUE indexe na `properties.source_id`
 * SAMOTNOM. Taký index znamená, že dve agentúry nemôžu mať tú istú inzerátovú
 * id. Repozitár ho ruší a zakladá tenantový; tieto testy držia, aby sa globálny
 * index nevrátil novou migráciou.
 */
describe("[verification] properties: jednoznačnosť source_id je tenantová, nie globálna", () => {
  const MIGRATIONS = join(ROOT, "supabase", "migrations");

  it("migrácia 20260617120000 ruší globálny index a zakladá tenantový", () => {
    const sql = read("supabase/migrations/20260617120000_uc_export_mapper.sql");
    expect(sql).toContain("DROP INDEX IF EXISTS public.idx_properties_source_id_unique");
    expect(sql).toContain("idx_properties_tenant_source_unique");
    expect(sql).toMatch(/\(agency_id,\s*source_system,\s*source_id\)/);
  });

  it("žiadna NOVŠIA migrácia globálny unique index na source_id nezakladá", () => {
    expect(existsSync(MIGRATIONS)).toBe(true);
    const neskorsie = readdirSync(MIGRATIONS)
      .filter((f) => f.endsWith(".sql") && f > "20260617120000");

    const previnilci = neskorsie.filter((f) => {
      const sql = readFileSync(join(MIGRATIONS, f), "utf8");
      // Unique index/constraint na source_id BEZ agency_id v tom istom kľúči.
      return /create\s+unique\s+index[\s\S]{0,200}?properties[\s\S]{0,200}?\(\s*source_id\s*\)/i.test(sql);
    });

    expect(previnilci).toEqual([]);
  });

  it("worker nehľadá ani nemení riadok podľa source_id samotného", () => {
    const queue = read("src/lib/realvia/processQueue.ts");
    expect(queue).toContain("agency_id");
    expect(queue).toContain("source_system");
  });
});
