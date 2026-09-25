#!/usr/bin/env node
/**
 * Testy pre migration-ledger-audit.mjs.
 *
 * Každý prípad je postavený na skutočnom tvare, ktorý sa vyskytol v PROD
 * 2026-09-24 — vrátane toho, na ktorom sa nástroj zámerne priznáva k nevedomosti.
 *
 * Run: node scripts/db/migration-ledger-audit.test.mjs
 */

import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { audit, readRepoMigrations, fileDigests } from "./migration-ledger-audit.mjs";

const md5 = (s) => createHash("md5").update(s).digest("hex");

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}`);
  if (!ok) {
    console.log(`        očakávané: ${JSON.stringify(expected)}`);
    console.log(`        skutočné : ${JSON.stringify(actual)}`);
    failures += 1;
  }
}

const dir = mkdtempSync(join(tmpdir(), "ledger-audit-"));
try {
  // Súbor aplikovaný pod vlastným razítkom.
  const matched = "create table if not exists public.a (id uuid primary key);\n";
  writeFileSync(join(dir, "20260101000000_matched.sql"), matched);

  // Súbor aplikovaný pod CUDZÍM razítkom — Supabase odsekol koncový newline.
  const aliased = "create table if not exists public.b (id uuid primary key);\n";
  writeFileSync(join(dir, "20260102000000_aliased.sql"), aliased);

  // Súbor, ktorý v PROD nie je vôbec.
  writeFileSync(join(dir, "20260103000000_unapplied.sql"), "select 1;\n");

  // Viacpríkazová migrácia — text je v PROD rozsekaný, md5 na súbor nesedí.
  writeFileSync(join(dir, "20260104000000_multi.sql"), "select 1;\nselect 2;\n");

  const repo = readRepoMigrations(dir);
  check("fileDigests vracia tvar s aj bez koncového newline", fileDigests(Buffer.from(aliased)).length, 2);

  const ledger = [
    { version: "20260101000000", name: "matched", md5: md5(matched), stmts: 1 },
    // to isté SQL, iné razítko, bez koncového newline
    { version: "20260201000000", name: "aliased_elsewhere", md5: md5(aliased.slice(0, -1)), stmts: 1 },
    // prepísaný variant toho istého zámeru — md5 nesedí, nástroj to NESMIE zamlčať
    { version: "20260202000000", name: "rewritten", md5: md5("select 42;"), stmts: 1 },
    // registrované bez textu — md5 sa porovnať nedá
    { version: "20260203000000", name: "no_statements", md5: null, stmts: 0 },
    // viacpríkazová migrácia bez súboru — md5 nesedí, lebo text je preskladaný
    { version: "20260204000000", name: "multi_no_file", md5: md5("select 1;\nselect 2;"), stmts: 2 },
  ];

  const { rows, unapplied } = audit(ledger, repo);
  const kinds = Object.fromEntries(rows.map((r) => [r.version, r.kind]));

  check("verzia so zhodným razítkom je MATCH", kinds["20260101000000"], "MATCH");
  check("to isté SQL pod iným razítkom je ALIAS", kinds["20260201000000"], "ALIAS");
  check("ALIAS ukazuje na správny súbor", rows.find((r) => r.version === "20260201000000").file, "20260102000000_aliased.sql");
  check("prepísaný variant je GHOST, nie ALIAS", kinds["20260202000000"], "GHOST");
  check("záznam bez textu je GHOST", kinds["20260203000000"], "GHOST");
  check(
    "záznam bez textu priznáva dôvod",
    rows.find((r) => r.version === "20260203000000").reason,
    "stmts=0, md5 sa porovnať nedá",
  );
  check("viacpríkazový bez súboru je GHOST (známa hranica)", kinds["20260204000000"], "GHOST");

  const byFile = Object.fromEntries(unapplied.map((u) => [u.file, u.kind]));
  check("súbor mimo PROD je UNAPPLIED", byFile["20260103000000_unapplied.sql"], "UNAPPLIED");
  check("súbor aplikovaný pod iným razítkom je UNAPPLIED_ALIASED", byFile["20260102000000_aliased.sql"], "UNAPPLIED_ALIASED");
  check(
    "UNAPPLIED_ALIASED nesie razítko, pod ktorým už v PROD je",
    unapplied.find((u) => u.file === "20260102000000_aliased.sql").appliedAs,
    "20260201000000",
  );
  check("aplikovaný súbor sa medzi neaplikovanými neobjaví", byFile["20260101000000_matched.sql"], undefined);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(failures === 0 ? "\nVŠETKO OK" : `\n${failures} test(ov) zlyhalo`);
process.exit(failures === 0 ? 0 : 1);
