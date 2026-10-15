// ================================================================
// BOD 3 (zadanie foundera 2026-10-15): "plánovač Gmail pull v repozitári".
//
// Route `/api/inbound/gmail-pull` existovala a bola plne inštrumentovaná, ale
// v `vercel.json` nebola — plánovač teda žil mimo repozitára (externý cron,
// neoverený). Matica schopností to viedla ako "Gmail pull ✅ ✅ ❓".
//
// Tento pin drží, že rozvrh je v repozitári, že je hodinový (nie denný, lebo
// dopyt z portálu, ktorý príde ráno, nemôže čakať na zajtra) a že route,
// na ktorú ukazuje, naozaj existuje.
// ================================================================
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CRM_ROOT = join(__dirname, "../..");
const vercel = JSON.parse(readFileSync(join(CRM_ROOT, "vercel.json"), "utf8")) as {
  crons: Array<{ path: string; schedule: string }>;
};

const GMAIL_PATH = "/api/inbound/gmail-pull";
const entries = vercel.crons.filter((c) => c.path === GMAIL_PATH);

describe("Gmail pull má plánovač v repozitári", () => {
  it("je vo vercel.json práve raz", () => {
    expect(entries).toHaveLength(1);
  });

  it("beží každú hodinu, nie raz denne", () => {
    // Tvar `M * * * *`: pevná minúta, každá hodina. Denný rozvrh by znamenal,
    // že dopyt doručený o 09:05 sa stane leadom až nasledujúci deň.
    expect(entries[0]?.schedule).toMatch(/^\d{1,2} \* \* \* \*$/);
  });

  it("nebeží na celú hodinu, aby sa nestretol s ostatnými", () => {
    const minute = Number(entries[0]?.schedule.split(" ")[0]);
    expect(minute).toBeGreaterThan(0);
    expect(minute).toBeLessThan(60);
  });

  it("route, na ktorú rozvrh ukazuje, existuje a zapisuje stopu", () => {
    const file = join(CRM_ROOT, `src/app${GMAIL_PATH}/route.ts`);
    expect(existsSync(file)).toBe(true);
    const src = readFileSync(file, "utf8");
    expect(src).toContain("recordCronRun(");
    // Preskočený beh (chýbajúca konfigurácia) musí nechať stopu tiež, inak je
    // "nespúšťa sa" nerozlíšiteľné od "spúšťa sa a je vypnutý".
    expect(src).toContain("recordSkippedCronRun(");
  });

  it("každý rozvrh vo vercel.json ukazuje na existujúcu route", () => {
    for (const cron of vercel.crons) {
      expect(
        existsSync(join(CRM_ROOT, `src/app${cron.path}/route.ts`)),
        `${cron.path}: route.ts neexistuje`,
      ).toBe(true);
    }
  });
});
