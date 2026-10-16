// ================================================================
// BOD 3 (zadanie foundera 2026-10-15): "plánovač Gmail pull v repozitári".
//
// Route `/api/inbound/gmail-pull` existovala a bola plne inštrumentovaná, ale
// v `vercel.json` nebola — plánovač teda žil mimo repozitára (externý cron,
// neoverený). Matica schopností to viedla ako "Gmail pull ✅ ✅ ❓".
//
// Tento pin drží, že rozvrh je v repozitári a že route, na ktorú ukazuje,
// existuje a nechá po sebe stopu.
//
// PREČO DENNE, A NIE ČASTEJŠIE: prvá verzia mala `20 * * * *`. Vercel build
// ju odmietol doslova takto:
//   „Hobby accounts are limited to daily cron jobs. This cron expression
//    (20 * * * *) would run more than once per day."
// Je to teda zmeraná hranica účtu, nie voľba. Častejší pull potrebuje buď plán
// Pro, alebo externý plánovač; rozhodnutie je na founderovi
// (docs/runbooks/2026-10-15-gmail-pull-zapnutie.md).
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

  it("je denný — viac Hobby plán nedovolí", () => {
    // Tvar `M H * * *`: raz za deň. Hodinový rozvrh Vercel na tomto účte
    // odmietne a padne celý deployment, nielen cron.
    expect(entries[0]?.schedule).toMatch(/^\d{1,2} \d{1,2} \* \* \*$/);
  });

  it("nebeží na celú hodinu ani v tú istú hodinu ako iný cron", () => {
    const [minute, hour] = (entries[0]?.schedule ?? "").split(" ");
    expect(Number(minute)).toBeGreaterThan(0);
    const ine = vercel.crons.filter((c) => c.path !== GMAIL_PATH).map((c) => c.schedule.split(" ")[1]);
    expect(ine).not.toContain(hour);
  });

  it("žiadny rozvrh vo vercel.json nebeží viac než raz denne", () => {
    // Jediný sub-denný výraz zhodí deployment celého projektu, nie iba ten cron.
    for (const cron of vercel.crons) {
      expect(cron.schedule, `${cron.path}: ${cron.schedule}`).toMatch(/^[\d,\-/]+ [\d,\-/]+ /);
      const [, hour] = cron.schedule.split(" ");
      expect(hour, `${cron.path}: hodina musí byť konkrétna`).not.toContain("*");
    }
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
