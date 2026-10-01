#!/usr/bin/env node
/**
 * Testy pre apps/crm/scripts/typecheck-baseline.mjs.
 *
 * Existuje kvôli jednej konkrétnej chybe: prvá verzia ERROR_LINE bola
 * /^([^\s(][^(]*)\(.../ , teda sa zastavila na prvej zátvorke. Cesty Next.js
 * route groups zátvorku obsahujú — `src/app/(dashboard)/leads/page.tsx` —
 * takže taký riadok nezmatchoval vôbec a chyba z počtu ZMIZLA. Ratchet by
 * mlčky prepustil nové typové chyby v celom (dashboard) segmente.
 *
 * Fixture preto obsahuje route group v zdroji AJ v .next/, plus odsadené
 * pokračovacie riadky, ktoré sa počítať nesmú.
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SUBJECT = join(HERE, "../../../apps/crm/scripts/typecheck-baseline.mjs");
const FIXTURE = join(HERE, "__fixtures__/tsc-output.txt");

let failures = 0;
const run = () =>
  execFileSync("node", [SUBJECT], {
    encoding: "utf8",
    env: { ...process.env, TYPECHECK_INPUT_FILE: FIXTURE },
  });

const check = (name, cond, detail = "") => {
  if (cond) console.log(`ok    ${name}`);
  else {
    console.log(`FAIL  ${name}${detail ? `  ${detail}` : ""}`);
    failures++;
  }
};

let out = "";
try {
  out = run();
} catch (err) {
  // Ratchet skončí nenulovo, keď count > baseline. Výstup nás zaujíma aj tak.
  out = `${err.stdout ?? ""}${err.stderr ?? ""}`;
}

const srcLine = out.match(/Typovych chyb:\s+(\d+)/);
const genLine = out.match(/Vylucene:\s+(\d+)/);

// Fixture: 3 v zdroji (dva z nich v route groups), 2 v .next/ (jeden route group),
// 2 odsadené pokračovacie riadky, ktoré nie sú samostatné chyby.
check("3 chyby v zdroji vrátane dvoch route groups", srcLine?.[1] === "3", `dostal ${srcLine?.[1]}`);
check("2 chyby v .next/ vylúčené", genLine?.[1] === "2", `dostal ${genLine?.[1]}`);
check("odsadené pokračovacie riadky sa nepočítajú", srcLine?.[1] === "3");

console.log();
if (failures === 0) {
  console.log("typecheck-baseline: všetky kontroly prešli");
} else {
  console.log(`typecheck-baseline: ${failures} zlyhaní`);
  process.exit(1);
}
