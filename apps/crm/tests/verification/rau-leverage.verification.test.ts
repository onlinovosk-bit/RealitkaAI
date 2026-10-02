/**
 * RAU Leverage track (L01–L05) — verifikácia štruktúry a ochranných pravidiel promptov.
 *
 * Čo to stráži:
 *  1. Knižnica je úplná a súdržná: L01..L05, šablóna, odkazy na existujúce súbory.
 *  2. Každý prompt nesie ochranné pravidlá, kvôli ktorým vznikol, a to v SPRÁVNEJ sekcii (zákaz vstupov v sekcii
 *     zakázaných vstupov, povinné „Čo hovorí PROTI" vo výstupe, limit výstupu…). Predchádzajúca verzia testu
 *     hľadala len podreťazce kdekoľvek v texte a z 45 nezávislých mutácií ich 44 prežilo — preto sa sekcie parsujú.
 *  3. Predaj promptov ako produktu je v Strategic Backlogu a router ho pri zhode vráti ako konflikt (tabuľka fráz,
 *     vrátane falošných poplachov, ktoré by sa zle opravovali).
 *  4. README, skill a spec nepovedia o routeri ani o rozhodnutí nič, čo neplatí (strážca driftu: keď sa router track
 *     naučí, test padne a treba prepísať README aj skill).
 *
 * POZOR — toto sú regresné testy písané implementátorom, NIE meranie užitočnosti. Že výstup promptu foundera
 * posunie k rozhodnutiu, nemeria nič (NEMERANÉ). Slepý beh promptov: docs/reports/2026-10-02-rau-leverage-blind-run.md.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = resolve(__dirname, "../../../..");
const RAU = join(REPO, "docs/rau");
const DIR = join(RAU, "leverage");
const ROUTER = join(REPO, "scripts/ops/rau-route.mjs");

const files = readdirSync(DIR).filter((f) => /^L\d\d-.+\.md$/.test(f)).sort();
const read = (f: string) => readFileSync(join(DIR, f), "utf8");
const promptBlock = (f: string) => /## PROMPT\n\n```text\n([\s\S]+)\n```\s*$/.exec(read(f))?.[1] ?? "";
const flat = (t: string) => t.replace(/\s+/g, " ").trim();
const byId = (id: string) => files.find((f) => f.startsWith(id)) as string;

/** Rozdelí PROMPT na sekcie podľa riadkov, ktoré začínajú veľkým nadpisom (ROLA:, VSTUPY (…):, VÝSTUP (…): …). */
const HEADERS = ["ROLA", "ÚLOHA", "VSTUPY", "ZAKÁZANÉ VSTUPY", "KROKY", "REBRÍK", "PRAVIDLÁ", "SPOLOČNÉ PRAVIDLÁ", "VÝSTUP"];
function sections(p: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = new RegExp(`^(${HEADERS.join("|")})(?=[\\s:(])[^\\n]*`, "gm");
  const hits = [...p.matchAll(re)];
  hits.forEach((m, i) => {
    const end = i + 1 < hits.length ? (hits[i + 1].index as number) : p.length;
    out[m[1]] = flat(p.slice(m.index as number, end));
  });
  return out;
}
const sec = (id: string) => sections(promptBlock(byId(id)));

const MONEY = [/(€|\$|\beur\b|\busd\b)\s*\d/i, /\d[\d\s.,]*\s*(€|\$|\beur\b|\busd\b|\beuro|\bdolár)/i, /\d+\s*(%|perc\w*)/i];
const normalize = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function route(texts: string[]) {
  const dir = mkdtempSync(join(tmpdir(), "rau-lev-"));
  const file = join(dir, "cases.json");
  writeFileSync(file, JSON.stringify(texts));
  const r = spawnSync("node", [ROUTER, "--batch", file, "--no-reuse"], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`router exit ${r.status}: ${r.stderr}`);
  return JSON.parse(r.stdout) as { gate: string; kind: { value: string }; backlog_conflicts: { id: string }[] }[];
}

describe("RAU leverage: library integrity", () => {
  it("has exactly L01..L05, contiguous", () => {
    expect(files.map((f) => f.slice(0, 3))).toEqual(["L01", "L02", "L03", "L04", "L05"]);
  });

  for (const f of files) {
    it(`${f} follows the template`, () => {
      const src = read(f);
      const fm = /^---\n([\s\S]*?)\n---/.exec(src);
      expect(fm, "frontmatter").not.toBeNull();
      const meta = Object.fromEntries(
        (fm?.[1] ?? "").split("\n").map((l) => {
          const m = /^([a-z_]+):\s*(.*)$/.exec(l);
          return m ? [m[1], m[2].trim()] : ["", ""];
        }),
      );
      expect(meta.id).toBe(f.slice(0, 3));
      expect(f.slice(4, -3)).toBe(String(meta.name).toLowerCase());
      expect(meta.track).toBe("LEVERAGE");
      expect(Number(meta.stage)).toBe(Number(f.slice(1, 3)));
      expect(meta.mutates).toBe("false");
      expect(src).toContain("> **Po ľudsky**");
      for (const label of ["Čo to je:", "Na čo to je:", "Čo potrebuje", "Čo ti vráti:", "Nepoužívaj"]) {
        expect(src, label).toContain(label);
      }
      expect(promptBlock(f).length, "PROMPT block").toBeGreaterThan(500);
      expect(src.split("\n").length).toBeLessThan(90);
    });

    it(`${f}: backticked repo paths and reuses exist`, () => {
      const src = read(f);
      const paths = new Set([...src.matchAll(/`((?:docs|scripts|apps|packages|\.claude|memory)\/[\w./-]+)`/g)].map((m) => m[1]));
      const reuses = /^reuses:\s*\[(.*)\]\s*$/m.exec(src)?.[1] ?? "";
      for (const p of reuses.split(",").map((x) => x.trim()).filter(Boolean)) paths.add(p);
      expect(paths.size).toBeGreaterThan(0);
      for (const p of paths) expect(existsSync(join(REPO, p)), p).toBe(true);
    });
  }
});

describe("RAU leverage: every prompt carries its safeguards in the right section", () => {
  for (const f of files) {
    const id = f.slice(0, 3);
    const required = id === "L05" ? [...HEADERS] : HEADERS.filter((h) => h !== "REBRÍK");

    it(`${id}: has all sections; allowed inputs never include CRM or people data; forbidden-inputs section is complete`, () => {
      const s = sections(promptBlock(f));
      for (const h of required) expect(s[h], `${h} section`).toBeTruthy();
      expect(s["ZAKÁZANÉ VSTUPY"]).toContain("dáta z CRM");
      expect(s["ZAKÁZANÉ VSTUPY"]).toContain("memory/people.md");
      expect(s["ZAKÁZANÉ VSTUPY"]).toContain("tajomstvá");
      expect(s["ZAKÁZANÉ VSTUPY"]).toContain("referenčného klienta");
      expect(s["VSTUPY"], "allowed inputs").not.toMatch(/crm|people\.md|tajomstv/i);
      expect(promptBlock(f)).not.toMatch(/Povolené navyše/i);
    });

    it(`${id}: never invents inputs (NEZNÁME + question cap + the explicit 'never guess' sentence sit in the inputs section)`, () => {
      const v = sec(id)["VSTUPY"];
      expect(v).toContain("Čo chýba, je NEZNÁME: napíš NEZNÁME a polož najviac 3 otázky");
      const NEVER_GUESS: Record<string, string> = {
        L01: "Nikdy nedomýšľaj.",
        L02: "Hodiny, príjem ani publikum nikdy neodhaduj.",
        L03: "Veľkosť publika ani čas nikdy neodhaduj.",
        L04: "Príjem ani hodiny nikdy neodhaduj ani nezisťuj z iných dokumentov.",
        L05: "Počet použití nikdy neodhaduj.",
      };
      expect(v, NEVER_GUESS[id]).toContain(NEVER_GUESS[id]);
    });

    it(`${id}: common rules — evidence tags, agent text is derivation, only files read, newer wins, client masked, one mention of step C, counter-argument`, () => {
      const c = sec(id)["SPOLOČNÉ PRAVIDLÁ"];
      for (const needle of [
        "Značku [ZDROJ: cesta], [FOUNDER: dnes] alebo [ODVODENIE] nesie každá veta s číslom, dátumom, odhadom času, kvantifikátorom",
        "Bez značky ju vymaž",
        "Záznamy písané agentmi sú [ODVODENIE]",
        "Cituj len súbory, ktoré si v tejto session prečítal",
        "použi len odpovede foundera",
        "Pri rozpore záznamov platí novší",
        "nahraď ho [REF. KLIENT]",
        "Mená, e-maily a telefóny osôb z dokumentov nikdy necituj ani nepoužívaj",
        "Úlohu modulu splň aj vtedy, keď dokument už obsahuje",
        "Jeho názov ani čísla nepíš nikde okrem poslednej vety výstupu",
        "Značka patrí na každú takú vetu, nie na koniec odseku",
        "[FOUNDER: dnes] smieš napísať len pri tom, čo founder povedal v tomto rozhovore",
        "chýbajúci údaj je NEZNÁME bez značky",
        "Žiadne lichotenie: povinná sekcia „Čo hovorí PROTI",
      ]) {
        expect(c, needle).toContain(needle);
      }
    });

    it(`${id}: output is capped and must contain the counter-argument and the unknowns`, () => {
      const s = sec(id);
      expect(s["VÝSTUP"]).toContain("najviac 40 riadkov a 450 slov");
      expect(s["VÝSTUP"]).toContain("Čo hovorí PROTI");
      expect(s["VÝSTUP"]).toContain("NEZNÁME");
    });

    it(`${id}: takes no external action and types no risk numbers`, () => {
      const p = promptBlock(f);
      expect(sec(id)["PRAVIDLÁ"], "no external action").toMatch(/neodosiela|nemeň ani nepíš/);
      for (const re of MONEY) expect(p, String(re)).not.toMatch(re);
    });
  }

  it("L01 counts only independent occurrences, from grep, and keeps an UNVERIFIED state instead of discarding on a hunch", () => {
    const s = sec("L01");
    expect(s["KROKY"]).toContain("Výskyt = iný deň, iný autor alebo citát foundera");
    expect(s["KROKY"]).toContain("Počet uveď len z grepu s uvedeným vzorom, inak „—");
    expect(s["KROKY"]).toContain("Ak vieš, že áno, označ COMMODITY");
    expect(s["KROKY"]).toContain("označ NEOVERENÉ");
    expect(s["PRAVIDLÁ"]).toContain("COMMODITY");
    expect(s["KROKY"]).toContain("Postup agenta (mutation proof, oprava CI) nie je vzor foundera");
    expect(s["PRAVIDLÁ"]).toContain("Ak sa nenájde ani jeden vzor s aspoň 2 výskytmi, povedz to a skonči");
  });

  it("L02 and L04 keep founder decisions out of the 'leak' list and never credit agent work to the founder", () => {
    const authority = ["GO, merge, cena, kapitál, externé správy, zápis do PROD alebo DB, platby, DNS, zmluvy, súhlasy"];
    const k2 = sec("L02")["KROKY"];
    const k4 = sec("L04")["KROKY"];
    expect(k2).toContain("Označ AUTORITA:");
    expect(k4).toContain("Oddeľ AUTORITA:");
    for (const k of [k2, k4]) {
      for (const a of authority) expect(k).toContain(a);
      expect(k).toContain("PRÁCA AGENTA");
      expect(k).toContain("INTERNÁ HYGIENA");
    }
    expect(k2).toContain("ak je aktér neurčený (napr. „HUMAN\"), označ ju NEZARADENÉ");
    expect(k4).toContain("Ak je aktér neurčený (napr. „HUMAN\"), označ činnosť NEZARADENÉ");
    expect(k4).toContain("MAJETOK len s dokladom, že výstup beží bez foundera; inak NEOVERENÉ");
    expect(k2).toContain("Neautomatizuj ich a nenavrhuj ich ako upgrade");
    expect(k4).toContain("Nie sú to konverzie. Ani konverzia, ani prvý krok nesmie byť položka z AUTORITY");
    expect(k2).toContain("Index páky = hodiny vo vrstvách KÓD a MÉDIÁ ÷ všetky hodiny foundera");
    expect(k4).toContain("Podiel času v prenájme = hodiny v ČAS-NÁJOM ÷ všetky hodiny foundera");
    expect(k2).toContain("Len ak hodiny existujú, inak NEZNÁME");
    expect(k4).toContain("Len ak hodiny existujú, inak NEZNÁME");
    expect(sec("L02")["VÝSTUP"]).toContain("Index páky (v % hodín alebo NEZNÁME)");
  });

  it("L03 stops without L01, has the Constitution inputs, never invents a price and cannot assign BUILD itself", () => {
    const s = sec("L03");
    expect(s["VSTUPY"]).toContain("Ak chýba, skonči a povedz: „Najprv spusti L01.");
    for (const doc of ["docs/architecture/revolis-constitution-v2.md", "docs/architecture/clay-positioning-reframe.md", "docs/rau/leverage/README.md"]) {
      expect(s["VSTUPY"], doc).toContain(doc);
    }
    expect(s["KROKY"]).toContain("SPÔSOB, ako ju otestovať, nie číslo. Číslo určuje founder");
    expect(s["KROKY"]).toContain("Q1 = NIE → najvyšší výsledok je VALIDATE");
    expect(s["KROKY"]).toContain("BACKLOG bez ohľadu na skóre");
    expect(s["KROKY"]).toContain("BUILD pridelí len founder. Q1 alebo Q8 NEZNÁME znamená najviac VALIDATE");
    expect(s["KROKY"]).toContain("Musí viazať na platiaceho klienta alebo retenciu so zdrojom; inak NEOVERENÉ a najviac VALIDATE");
    expect(s["PRAVIDLÁ"]).toContain("Úloha, ktorá oslovuje ľudí, smie použiť len kanál so zdrojom; inak je úlohou zistiť kanál");
    expect(s["KROKY"]).toContain("EXTERNÝ PREDAJ vypíš len ako „odložené — Strategic Backlog");
    expect(promptBlock(byId("L03"))).not.toMatch(/zaraď\s+BUILD|zaraď vždy BUILD/);
    expect(s["PRAVIDLÁ"]).toContain("Strategic Backlog");
  });

  it("L04 does not fake an income test or fetch traction from the CRM", () => {
    const s = sec("L04");
    expect(s["PRAVIDLÁ"]).toContain("príjmový test je NEZNÁMY alebo NEPLATÍ");
    expect(s["PRAVIDLÁ"]).toContain("Trakciu nikdy nehľadaj v CRM");
    expect(s["PRAVIDLÁ"]).toContain("Každý predpoklad scenára nesie [FOUNDER] alebo je to otázka");
    expect(s["KROKY"]).toContain("slovný scenár");
    expect(s["KROKY"]).toContain("Číslo len z čísel, ktoré founder dal. Ak predpoklady nedal, napíš len NEZNÁME");
  });

  it("L05 counts a use only in real work, promotes one rung on >=2 uses (or nothing) and treats AGENT+ as a proposal", () => {
    const s = sec("L05");
    expect(s["KROKY"]).toContain("Použitie = beh v reálnej práci alebo u zákazníka");
    expect(s["KROKY"]).toContain("Test, odkaz v dokumente a opätovné čítanie sa nepočítajú");
    expect(s["KROKY"]).toContain("Povýš o JEDEN stupeň len pri aspoň 2 použitiach. Ak nič nemá aspoň 2 použitia, napíš to a nepovyšuj nič");
    expect(s["KROKY"]).toContain("NÁVRH pre Ústavu v2");
    expect(s["KROKY"]).toContain("RULE smie vzniknúť len z aspoň 2 nezávislých prípadov");
    expect(s["KROKY"]).toContain("Vypíš výsledky bloku, každý s cestou. Čo nemá cestu, nepatrí do zoznamu");
    expect(s["KROKY"]).toContain("Vymenuj, čo z bloku aktívum NIE JE (jednorazové), a prečo");
    expect(s["KROKY"]).toContain("použitia v jednej session sú jedno použitie");
    expect(s["PRAVIDLÁ"]).toContain("Nič nemeň ani nepíš do pamäte");
    expect(s["PRAVIDLÁ"]).toContain("Povýšenie je odporúčanie; rozhodnutie má founder");
  });

  it("nothing in the track names the reference client (diacritics-insensitive; includes the README)", () => {
    for (const f of [...files, "README.md"]) {
      expect(normalize(readFileSync(join(DIR, f), "utf8")), f).not.toMatch(/smolk|reality\s*s\b|realitysmol/);
    }
  });
});

describe("RAU leverage: README, report, skill, spec and decision record", () => {
  const readme = readFileSync(join(DIR, "README.md"), "utf8");

  it("README lists every prompt, states the evidence limits and the Constitution verdict, and cites only existing paths", () => {
    for (const f of files) expect(readme, f).toContain(`[${f.slice(0, 3)}](${f})`);
    expect(readme).toContain("NEMERANÁ");
    expect(readme).toContain("Podľa Ústavy v2 by to bolo REJECT");
    expect(readme).toContain("**Zakázané vstupy:** dáta z CRM (leady, klienti), `memory/people.md`");
    expect(readme).toContain("`[REF. KLIENT]`");
    expect(readme).not.toMatch(/\{\{/);
    const paths = new Set([...readme.matchAll(/`((?:docs|scripts|apps|packages|\.claude|memory)\/[\w./-]+)`/g)].map((m) => m[1]));
    expect(paths.size).toBeGreaterThan(3);
    expect(paths.has("docs/reports/2026-10-02-rau-leverage-blind-run.md")).toBe(true);
    for (const p of paths) expect(existsSync(join(REPO, p)), p).toBe(true);
  });

  const registry = JSON.parse(readFileSync(join(RAU, "registry.json"), "utf8")) as {
    backlog: { id: string; match: string[]; veto: string; unlock: string; source: string }[];
  };
  const item = registry.backlog.find((b) => b.id === "leverage-external-productization");

  it("selling the prompts as a product is a Strategic Backlog item with veto, unlock and an existing source", () => {
    expect(item, "backlog item").toBeDefined();
    expect(item?.veto).toMatch(/Q1/);
    expect(item?.veto).toMatch(/Q8/);
    expect(item?.unlock).toMatch(/platiaci zákazník/);
    expect(item?.unlock).toContain("memory/decisions.md");
    for (const m of item?.source.matchAll(/(docs\/[\w./-]+\.md)/g) ?? []) expect(existsSync(join(REPO, m[1])), m[1]).toBe(true);
    expect(item?.match.length).toBeGreaterThanOrEqual(5);
    for (const m of item?.match ?? []) expect(() => new RegExp(m)).not.toThrow();
  });

  // [fráza, má to byť konflikt s položkou]. Falošné poplachy (0) sú legitímna práca, ktorú brána nesmie blokovať.
  const PHRASES: [string, boolean][] = [
    ["predaj RAU promptov zakaznikom", true],
    ["rau: napíš text o predaji promptov", true],
    ["predaj leverage track na Gumroad", true],
    ["e-book na základe RAU", true],
    ["predáme prompty L01 ako produkt", true],
    ["napíš text o predávaní RAU promptov", true],
    ["napíš post: predávame prompty", true],
    ["napíš text o kurze z RAU promptov", true],
    ["napíš text o spoplatnení RAU promptov", true],
    ["zabaľme leverage prompty do e-booku", true],
    ["monetizuj leverage prompty", true],
    ["licencuj RAU knižnicu", true],
    ["digitálny produkt z RAU promptov", true],
    ["spravíme z RAU promptov online kurz", true],
    ["rau: predaj prompty zakaznikom", true],
    ["rau: urob ebook z promptov", true],
    ["chcem speňažiť RAU prompty", true],
    ["chcem predať prompty zákazníkom", true],
    ["webinár z RAU promptov", true],
    ["RAU prompty ako digitálny produkt", true],
    ["oprav kurz eura v exporte", false],
    ["rau: oprav kurz eura v exporte", false],
    ["predaj bytu v Bratislave, pridaj filter", false],
    ["napíš prompt pre makléra", false],
    ["ebook o realitnom trhu", false],
    ["pridaj digitálny produkt do cenníka", false],
    ["predaj Rauf", false],
    ["oprav preklep v L03 prompte", false],
    ["pridaj filter predaj a prenájom do zoznamu", false],
  ];

  it("the router flags a sale of RAU prompts (never AUTO-SAFE) and leaves unrelated 'predaj/kurz/prompt' work alone", () => {
    const out = route(PHRASES.map(([t]) => t));
    PHRASES.forEach(([t, expected], i) => {
      const hit = out[i].backlog_conflicts.map((b) => b.id).includes("leverage-external-productization");
      expect(hit, t).toBe(expected);
      if (expected) expect(out[i].gate, t).not.toBe("AUTO-SAFE");
    });
    expect(out[PHRASES.findIndex(([t]) => t === "rau: napíš text o predaji promptov")].gate).toBe("GO_REQUIRED");
  });

  it("README's statement about the router is true: a bare module request returns ASK (update README + skill when it changes)", () => {
    expect(readme).toMatch(/vráti `ASK`/);
    const [r] = route(["spusti Knowledge DNA Engine pre Revolis"]);
    expect(r.gate).toBe("ASK");
    expect(r.kind.value).toBe("UNKNOWN");
  });

  it("the Rector skill keeps ASK whenever any risk field is non-empty and logs the route in the standard format", () => {
    const skill = flat(readFileSync(join(REPO, ".claude/skills/rau/SKILL.md"), "utf8"));
    expect(skill).toContain("docs/rau/leverage/README.md");
    expect(skill).toContain("`triggers`, `backlog_conflicts` a `quoted_only_triggers`");
    expect(skill).toContain("Ak je čo i len jedno z tých troch polí neprázdne, ASK ostáva a stojíš");
    expect(skill).toContain("RAU route: ASK UNKNOWN <projekt> (→L0X, modul pomenoval founder)");
  });

  it("spec §13 states the Constitution result honestly (score, REJECT, veto crossed on the founder's GO) and the decision is recorded", () => {
    const spec = readFileSync(join(RAU, "RAU-v1.0.md"), "utf8");
    expect(spec).toMatch(/## 13\. Leverage track/);
    const s13 = spec.slice(spec.indexOf("## 13. Leverage track"), spec.indexOf("## Rozhodnutia foundera"));
    expect(s13).toMatch(/REJECT/);
    expect(s13).toMatch(/Skóre \(odhad\)/);
    expect(s13).toMatch(/GO prišlo pred kontrolou Ústavy/);
    expect(readFileSync(join(REPO, "memory/decisions.md"), "utf8")).toContain("RAU Leverage track (L01–L05)");
  });

  it("the blind-run report exists and says what it does not prove", () => {
    const report = readFileSync(join(REPO, "docs/reports/2026-10-02-rau-leverage-blind-run.md"), "utf8");
    expect(report).toContain("NEMERANÁ");
    expect(report).toMatch(/LLM-sudca|model-sudc/);
    expect(report).toMatch(/prvý beh/i);
  });
});
