// ================================================================
// BOD 4 (zadanie foundera 2026-10-15): plánovač Realvia fronty.
//
// V route stálo, že ju spúšťa externý cron každých 5 minút. Zmerané na PROD
// 2026-10-15 z `realvia_metrics`: za 21 dní beh prebehol iba v 7 dňoch
// (spolu 24 behov). Úloha vo fronte čakala v priemere ~2 dni, najdlhšie 28.
// Plánovač teda buď nebol, alebo nebežal — a z repozitára sa to nedalo zistiť.
// ================================================================
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CRM_ROOT = join(__dirname, "../..");
const vercel = JSON.parse(readFileSync(join(CRM_ROOT, "vercel.json"), "utf8")) as {
  crons: Array<{ path: string; schedule: string }>;
};

const PATH = "/api/cron/realvia-process";
const entries = vercel.crons.filter((c) => c.path === PATH);
const src = readFileSync(join(CRM_ROOT, `src/app${PATH}/route.ts`), "utf8");

describe("Realvia worker má plánovač v repozitári", () => {
  it("je vo vercel.json práve raz a beží hodinovo", () => {
    expect(entries).toHaveLength(1);
    expect(entries[0]?.schedule).toMatch(/^\d{1,2} \* \* \* \*$/);
  });

  it("nebeží v tú istú minútu ako Gmail pull", () => {
    // Dve ťažké úlohy v tej istej minúte si zbytočne konkurujú.
    const gmail = vercel.crons.find((c) => c.path === "/api/inbound/gmail-pull");
    expect(gmail?.schedule).toBeDefined();
    expect(entries[0]?.schedule).not.toBe(gmail?.schedule);
  });

  it("route existuje", () => {
    expect(existsSync(join(CRM_ROOT, `src/app${PATH}/route.ts`))).toBe(true);
  });
});

describe("beh worker-a je dohľadateľný", () => {
  it("úspešný aj neúspešný beh zapíše do cron_runs", () => {
    expect(src).toContain("recordCronRun(");
    expect(src).toContain("deriveCronStatus(");
  });

  it("prázdna fronta sa zapisuje zastropovane", () => {
    // Hodinový rozvrh = 24 behov denne; bez stropu by prázdna fronta z denníka
    // urobila skládku, a bez zápisu úplne by „nebeží" splynulo s „nič nečakalo".
    expect(src).toContain("recordSkippedCronRun(");
    expect(src).toContain("empty_queue");
  });

  it("odmietnutie na autorizácii nechá stopu, keď prišiel Vercel cron", () => {
    expect(src).toContain("vercelCronSchedule(request.headers)");
    const authBranch = src.slice(src.indexOf("const cronSecret"), src.indexOf("status: 401"));
    expect(
      authBranch.includes("recordUnauthorizedCronRun("),
      "zápis nie je vnútri 401 vetvy",
    ).toBe(true);
  });

  it("komentár v route už netvrdí, že plánovač je mimo repozitára", () => {
    // Zastaraný komentár poslal 2026-10-15 diagnostiku na hodinu zlým smerom.
    expect(src).not.toMatch(/EXTERNAL cron/i);
    expect(src).toContain("vercel.json");
  });
});
