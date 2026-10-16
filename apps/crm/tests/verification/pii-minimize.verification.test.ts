// ================================================================
// BOD 9 (zadanie foundera 2026-10-15) — 19 miest MINIMIZE z auditu #750.
//
// Audit `docs/reports/2026-09-29-llm-callsite-pii-audit.md` našiel 34 volaní
// LLM: 5 PATCH (3 živé opravil #750), 19 MINIMIZE, 10 OK. MINIMIZE znamená,
// že k poskytovateľovi odchádza meno alebo adresa, ktorú úloha nepotrebuje —
// GDPR čl. 5 ods. 1 písm. c).
//
// Tento pin drží 12 ŽIVÝCH miest. Zvyšných 7 nemá vstupný bod (mŕtvy kód);
// tie stráži posledný test nižšie, ktorý nedovolí oživiť ich bez opravy.
//
// Pin je na VLASTNOSTI, nie na texte: kontroluje, že zdrojový súbor
// neinterpoluje celé meno / presnú adresu do promptu a že používa helper.
// ================================================================
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "../../src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

/** Živé miesta z auditu: súbor → čo sa v ňom NESMIE objaviť. */
const ZIVE: Array<{
  file: string;
  /** Interpolácie, ktoré by poslali celé meno alebo presnú adresu. */
  zakazane: string[];
  /** Helper, ktorý tam musí byť (prázdne = meno sa nemá posielať vôbec). */
  helper?: string;
}> = [
  { file: "lib/ai/lead-triage-batch.ts", zakazane: ["name: l.name"] },
  { file: "lib/ai/open-followup-generator.ts", zakazane: ["name: l.name"], helper: "firstNameOnly" },
  { file: "lib/inbound/auto-reply.ts", zakazane: ["Meno: ${data.leadName}"], helper: "NAME_PLACEHOLDER" },
  { file: "lib/morning-brief/generators/ai-text.ts", zakazane: ["${top?.full_name", "${hotLeads[1]?.full_name"], helper: "firstNameOnly" },
  { file: "lib/ai/dashboard-insights.ts", zakazane: ["| ${lead.name} |"], helper: "firstNameOnly" },
  { file: "lib/ai/rescue-message.ts", zakazane: ["Meno: ${context.leadName}"], helper: "firstNameOnly" },
  { file: "lib/assistant-chat.ts", zakazane: ["`Meno: ${lead.name}`"] },
  { file: "lib/rescore-lead.ts", zakazane: ["Lead: ${lead.name}"] },
  { file: "lib/ai-outreach.ts", zakazane: ["- meno: ${lead.name}"], helper: "firstNameOnly" },
  { file: "app/api/ghostwriter/generate/route.ts", zakazane: ["adrese: ${body.ownerAddress}", "vážený ${body.ownerName}"], helper: "ADDRESS_PLACEHOLDER" },
  { file: "app/api/stealth-recruiter/outreach/route.ts", zakazane: ["- Adresa: ${body.address}"], helper: "ADDRESS_PLACEHOLDER" },
  { file: "app/api/stealth-recruiter/scan/route.ts", zakazane: ["${p.id}: ${p.address}"], helper: "cityOnly" },
];

describe("MINIMIZE — celé meno ani presná adresa neodchádzajú do promptu", () => {
  it("pin pokrýva všetkých 12 živých miest z auditu", () => {
    // Keď niekto riadok vyhodí, číslo prestane sedieť a test to pripomenie.
    expect(ZIVE).toHaveLength(12);
    expect(new Set(ZIVE.map((z) => z.file)).size).toBe(12);
  });

  for (const { file, zakazane, helper } of ZIVE) {
    it(`${file}: neposiela celé meno ani presnú adresu`, () => {
      const src = read(file);
      for (const vzor of zakazane) {
        expect(src.includes(vzor), `${file}: vrátila sa interpolácia ${vzor}`).toBe(false);
      }
      if (helper) {
        expect(src, `${file}: chýba ${helper}`).toContain(helper);
        expect(src, `${file}: nepoužíva @/lib/privacy/minimize`).toContain("@/lib/privacy/minimize");
      }
    });
  }

  it("rescue-message volá cez callClaude, nie priamo cez klienta (obchádzal sanitizér)", () => {
    const src = read("lib/ai/rescue-message.ts");
    expect(src).toContain("callClaude(");
    expect(src).not.toContain("getClaudeClient()");
  });

  it("embedding text leadu neobsahuje meno", () => {
    // Meno vo vektore nič nerieši (presná zhoda patrí do databázy) a odchádzalo
    // k poskytovateľovi pri každom uložení leadu.
    const src = read("lib/embeddings.ts");
    const fn = src.slice(src.indexOf("export function buildLeadEmbeddingText"));
    const body = fn.slice(0, fn.indexOf("\n}"));
    expect(body).not.toContain("lead.name");
  });
});

describe("mŕtve miesta zostávajú mŕtve", () => {
  // Audit: 7 miest MINIMIZE nemá vstupný bod. Kým ich nikto nevolá, neposielajú
  // nič. Keď ich niekto zapojí, tento test spadne — a oprava PII sa musí urobiť
  // v tom istom PR, nie „niekedy potom".
  // Sledujeme FUNKCIU, nie modul: `multi-channel-sender` ako celok živý je
  // (`sendMessage` posiela SMS a e-maily z playbooku), ale LLM vetva
  // `generateAiReply` volajúceho nemá. Pin na modul by preto padal od začiatku
  // a nič by nestrážil.
  const MRTVE_FUNKCIE = ["generateAiReply", "buildDossier"];

  for (const fn of MRTVE_FUNKCIE) {
    it(`${fn} nemá volajúceho mimo vlastného modulu a testov`, () => {
      const res = spawnSync(
        "grep",
        ["-rn", "--include=*.ts", "--include=*.tsx", fn, join(SRC, "app"), join(SRC, "lib")],
        { encoding: "utf8" },
      );
      // grep: 0 = našlo, 1 = nenašlo nič, 2 = chyba
      expect(res.status, `grep zlyhal: ${res.stderr}`).not.toBe(2);
      const cudzie = res.stdout
        .split("\n")
        .filter(Boolean)
        .filter((r) => !r.includes("__tests__"))
        .filter((r) => !r.includes("multi-channel-sender.ts") && !r.includes("build-dossier.ts"));
      expect(
        cudzie,
        `${fn} už niekto volá — doplň minimalizáciu v tom istom PR`,
      ).toEqual([]);
    });
  }

  it("audit uvádza, ktoré miesta zostali otvorené", () => {
    const audit = readFileSync(
      join(__dirname, "../../../../docs/reports/2026-09-29-llm-callsite-pii-audit.md"),
      "utf8",
    );
    expect(audit).toContain("MINIMIZE");
    expect(audit).toContain("multi-channel-sender");
  });
});
