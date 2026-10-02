/**
 * RAU Leverage track (L01–L05) — verifikácia štruktúry a ochranných pravidiel promptov.
 *
 * Čo to stráži:
 *  1. Knižnica je úplná a súdržná: L01..L05, šablóna, odkazy na existujúce súbory.
 *  2. Každý prompt nesie ochranné pravidlá, kvôli ktorým vznikol (nič nedomýšľaj, zakázané vstupy,
 *     značky zdroja, „Čo hovorí PROTI", žiadne čísla rizika, nič sa neodosiela). Zmazať pravidlo nejde bez pádu.
 *  3. Predaj promptov ako produktu je v Strategic Backlogu a router ho pri zhode vráti ako konflikt.
 *  4. README nepovie o routeri nič, čo neplatí (strážca driftu: keď sa router track naučí, test padne
 *     a treba prepísať README aj skill).
 *
 * POZOR — toto sú regresné testy písané implementátorom, NIE meranie užitočnosti. Že výstup promptu
 * foundera posunie k rozhodnutiu, nemeria nič (NEMERANÉ). Slepý beh promptov a jeho výsledok sú
 * v docs/rau/RAU-v1.0.md §13.
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
const flat = (t: string) => t.replace(/\s+/g, " ");
const byId = (id: string) => files.find((f) => f.startsWith(id)) as string;

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

describe("RAU leverage: every prompt carries its safeguards", () => {
  for (const f of files) {
    const id = f.slice(0, 3);
    it(`${id}: never invents inputs, forbids personal/CRM/client data, tags claims, argues against itself`, () => {
      const p = flat(promptBlock(f));
      expect(p, "NEZNÁME rule").toContain("Čo chýba, je NEZNÁME: napíš NEZNÁME a polož najviac 3 otázky");
      expect(p, "forbidden inputs").toContain("ZAKÁZANÉ VSTUPY");
      expect(p, "third-party personal data").toContain("memory/people.md");
      expect(p, "reference client").toContain("referenčného klienta");
      expect(p, "source tags").toContain("[ZDROJ: cesta]");
      expect(p, "derivation tag").toContain("[ODVODENIE]");
      expect(p, "counter-evidence rule").toContain("Žiadne lichotenie: povinná sekcia");
      expect(p, "counter-evidence section").toContain("Čo hovorí PROTI");
    });

    it(`${id}: takes no external action and types no risk numbers`, () => {
      const p = promptBlock(f);
      expect(p, "no external action").toMatch(/neodosiela|nemeň ani nepíš/);
      expect(p, "no money amounts").not.toMatch(/\d[\d\s.,]*\s*(€|eur\b|usd\b|\$)/i);
      expect(p, "no percentages typed").not.toMatch(/\d\s*%/);
    });
  }

  it("L02 and L04 keep the founder's deliberate decisions out of the 'leak' list (AUTORITA)", () => {
    const step = { L02: "Označ AUTORITA:", L04: "Oddeľ AUTORITA:" } as const;
    for (const id of ["L02", "L04"] as const) {
      const p = flat(promptBlock(byId(id)));
      expect(p, id).toContain(step[id]);
      expect(p, id).toContain("GO, merge");
    }
    expect(flat(promptBlock(byId("L02")))).toContain("Neautomatizuj ich");
    expect(flat(promptBlock(byId("L04")))).toContain("Nie sú to konverzie");
  });

  it("L01 discards commodity niches and demands repetition in the evidence", () => {
    const p = promptBlock(byId("L01"));
    expect(p).toContain("COMMODITY");
    expect(p).toMatch(/aspoň 2×/);
  });

  it("L03 stops without L01, proposes a price TEST not a price, and routes through the Constitution", () => {
    const p = promptBlock(byId("L03"));
    expect(p).toContain("Najprv spusti L01");
    expect(p).toMatch(/SPÔSOB, ako ju otestovať, nie číslo/);
    expect(p).toContain("Číslo určuje founder");
    expect(p).toMatch(/Strategic Backlog/);
    expect(p).toMatch(/Q1 a Q8/);
    expect(p).toContain("clay-positioning-reframe.md");
  });

  it("L04 does not fake an income test", () => {
    expect(promptBlock(byId("L04"))).toMatch(/príjmový test je NEZNÁMY alebo NEPLATÍ/);
  });

  it("L05 promotes one rung at a time on >=2 uses and treats AGENT+ as a proposal to the Constitution", () => {
    const p = promptBlock(byId("L05"));
    expect(p).toMatch(/aspoň 2 použitiach/);
    expect(p).toMatch(/NÁVRH pre Ústavu v2/);
    expect(p).toContain("aktívum NIE JE");
    expect(p).toMatch(/Nič nemeň ani nepíš do pamäte/);
  });

  it("nothing in the track names the reference client", () => {
    for (const f of [...files, "README.md"]) expect(readFileSync(join(DIR, f), "utf8"), f).not.toMatch(/smolk/i);
  });
});

describe("RAU leverage: README and backlog", () => {
  const readme = readFileSync(join(DIR, "README.md"), "utf8");

  it("README lists every prompt, states the evidence limits and cites only existing paths", () => {
    for (const f of files) expect(readme, f).toContain(`[${f.slice(0, 3)}](${f})`);
    expect(readme).toContain("NEMERANÁ");
    expect(readme).not.toMatch(/\{\{/);
    const paths = new Set([...readme.matchAll(/`((?:docs|scripts|apps|packages|\.claude|memory)\/[\w./-]+)`/g)].map((m) => m[1]));
    expect(paths.size).toBeGreaterThan(3);
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
    for (const m of item?.source.matchAll(/(docs\/[\w./-]+\.md)/g) ?? []) expect(existsSync(join(REPO, m[1])), m[1]).toBe(true);
    for (const m of item?.match ?? []) expect(() => new RegExp(m)).not.toThrow();
  });

  it("the router flags a sale of RAU prompts (conflict, never AUTO-SAFE; GO_REQUIRED when the rest is clear) but not maintenance of the prompts", () => {
    const [clear, ambiguous, ebook, edit, rate] = route([
      "rau: napis text o predaji RAU promptov",
      "revolis: predaj RAU promptov zakaznikom",
      "rau: napis ebook z RAU promptov",
      "rau: oprav preklep v L03 prompte",
      "rau: oprav kurz eura v exporte",
    ]);
    for (const r of [clear, ambiguous, ebook]) {
      expect(r.backlog_conflicts.map((b) => b.id)).toContain("leverage-external-productization");
      expect(r.gate).not.toBe("AUTO-SAFE");
    }
    expect(clear.gate).toBe("GO_REQUIRED");
    for (const r of [edit, rate]) {
      expect(r.backlog_conflicts.map((b) => b.id)).not.toContain("leverage-external-productization");
      expect(r.gate).toBe("AUTO-SAFE");
    }
  });

  it("README's statement about the router is true: a bare module request returns ASK (update README + skill when it changes)", () => {
    expect(readme).toMatch(/vráti `ASK`/);
    const [r] = route(["spusti Knowledge DNA Engine pre Revolis"]);
    expect(r.gate).toBe("ASK");
    expect(r.kind.value).toBe("UNKNOWN");
  });

  it("spec §13 and the Rector skill point at the track", () => {
    expect(readFileSync(join(RAU, "RAU-v1.0.md"), "utf8")).toMatch(/## 13\. Leverage track/);
    expect(readFileSync(join(REPO, ".claude/skills/rau/SKILL.md"), "utf8")).toContain("docs/rau/leverage/README.md");
  });
});
