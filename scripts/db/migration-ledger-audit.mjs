#!/usr/bin/env node
/**
 * Migration ledger audit — porovná PROD `supabase_migrations.schema_migrations`
 * so súbormi v apps/crm/supabase/migrations/.
 *
 * PROBLÉM, KTORÝ RIEŠI
 * Verzia zapísaná v PROD nemusí existovať ako súbor v repe. Doteraz sme taký
 * záznam volali "duch" a predpokladali sme, že chýba DDL. Meranie 2026-09-24
 * ukázalo, že to tak väčšinou NIE JE: ten istý súbor bol do PROD nahraný pod
 * iným časovým razítkom. Rozdiel medzi "chýba nám SQL" a "to isté SQL pod inou
 * verziou" je rozdiel medzi poplachom a evidenčnou chybou — a rozhodne ho md5,
 * nie meno.
 *
 * VSTUP (--ledger): JSON pole {version, name, md5, stmts}, kde md5 je
 *   md5(array_to_string(statements, E'\n')). Vyrobí ho presne tento dotaz:
 *
 *     select json_agg(json_build_object(
 *              'version', version, 'name', name,
 *              'md5', md5(array_to_string(statements, E'\n')),
 *              'stmts', coalesce(array_length(statements,1),0)
 *            ) order by version)
 *     from supabase_migrations.schema_migrations;
 *
 * KLASIFIKÁCIA
 *   MATCH    verzia má súbor s rovnakým razítkom
 *   ALIAS    verzia súbor nemá, ale md5 sedí na iný súbor → to isté SQL, iné razítko
 *   GHOST    verzia súbor nemá a md5 nesedí na nič → skutočne chýbajúce SQL
 *
 * HRANICA NÁSTROJA (čítaj, kým sa naň spoľahneš)
 * Supabase ukladá `statements` ako pole príkazov. Pri jednopríkazovej migrácii
 * je to celý súbor a md5 sedí na bajt. Pri viacpríkazovej je text rozsekaný
 * a znovu poskladaný, takže md5 na súbor NESEDÍ — taký záznam bez súboru
 * ostane GHOST, aj keby SQL v repe bolo. Časť záznamov má `stmts = 0`
 * (registrované bez textu) — tie sa md5 porovnať nedajú vôbec.
 * ALIAS je teda dôkaz zhody; GHOST je podnet na ručné dohľadanie, nie rozsudok.
 *
 * Exit 1, ak existuje aspoň jeden GHOST.
 *
 * Run: node scripts/db/migration-ledger-audit.mjs --ledger <subor.json>
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";

const DEFAULT_DIR = "apps/crm/supabase/migrations";

function parseArgs(argv) {
  const out = { dir: DEFAULT_DIR, ledger: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--ledger") out.ledger = argv[++i];
    else if (argv[i] === "--dir") out.dir = argv[++i];
    else if (argv[i] === "--json") out.json = true;
  }
  return out;
}

const md5 = (buf) => createHash("md5").update(buf).digest("hex");

/**
 * Supabase zapisuje príkaz bez koncového newline, ak ho sám odsekol.
 * Preto sa súbor odtlačkuje v oboch tvaroch.
 */
export function fileDigests(buf) {
  const digests = [md5(buf)];
  if (buf.length > 0 && buf[buf.length - 1] === 0x0a) {
    digests.push(md5(buf.subarray(0, buf.length - 1)));
  }
  return digests;
}

export function readRepoMigrations(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((file) => {
      const version = basename(file).split("_")[0];
      const buf = readFileSync(resolve(dir, file));
      return { file, version, digests: fileDigests(buf) };
    });
}

export function audit(ledger, repo) {
  const byVersion = new Map(repo.map((m) => [m.version, m]));
  const byDigest = new Map();
  for (const m of repo) {
    for (const d of m.digests) if (!byDigest.has(d)) byDigest.set(d, m);
  }

  const rows = [];
  const aliasedFiles = new Map();

  for (const entry of ledger) {
    const direct = byVersion.get(entry.version);
    if (direct) {
      rows.push({ kind: "MATCH", version: entry.version, name: entry.name, file: direct.file });
      continue;
    }
    // md5 je dôkaz iba pri jednopríkazovej migrácii — inak je text preskladaný.
    const alias = entry.stmts === 1 && entry.md5 ? byDigest.get(entry.md5) : undefined;
    if (alias) {
      rows.push({ kind: "ALIAS", version: entry.version, name: entry.name, file: alias.file });
      aliasedFiles.set(alias.file, entry.version);
      continue;
    }
    rows.push({
      kind: "GHOST",
      version: entry.version,
      name: entry.name,
      file: null,
      reason: entry.stmts === 1 ? "md5 nesedí na žiadny súbor" : `stmts=${entry.stmts}, md5 sa porovnať nedá`,
    });
  }

  const applied = new Set(ledger.map((e) => e.version));
  const unapplied = repo
    .filter((m) => !applied.has(m.version))
    .map((m) => ({
      kind: aliasedFiles.has(m.file) ? "UNAPPLIED_ALIASED" : "UNAPPLIED",
      version: m.version,
      file: m.file,
      appliedAs: aliasedFiles.get(m.file) ?? null,
    }));

  return { rows, unapplied };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.ledger) {
    console.error("chýba --ledger <subor.json> (dotaz je v hlavičke tohto súboru)");
    process.exit(2);
  }
  const ledger = JSON.parse(readFileSync(args.ledger, "utf8"));
  if (!Array.isArray(ledger)) {
    console.error("--ledger musí byť JSON pole");
    process.exit(2);
  }
  const repo = readRepoMigrations(args.dir);
  const { rows, unapplied } = audit(ledger, repo);

  const ghosts = rows.filter((r) => r.kind === "GHOST");
  const aliases = rows.filter((r) => r.kind === "ALIAS");
  const trulyUnapplied = unapplied.filter((u) => u.kind === "UNAPPLIED");

  if (args.json) {
    console.log(JSON.stringify({ rows, unapplied }, null, 2));
  } else {
    console.log(`repo súborov:        ${repo.length}`);
    console.log(`v PROD registrované: ${ledger.length}`);
    console.log(`  MATCH:  ${rows.filter((r) => r.kind === "MATCH").length}`);
    console.log(`  ALIAS:  ${aliases.length}  (to isté SQL pod iným razítkom)`);
    console.log(`  GHOST:  ${ghosts.length}`);
    console.log("");
    for (const a of aliases) console.log(`ALIAS  ${a.version} ${a.name}  ->  ${a.file}`);
    for (const g of ghosts) console.log(`GHOST  ${g.version} ${g.name}  (${g.reason})`);
    console.log("");
    console.log(`neaplikované (db push ich spustí):        ${trulyUnapplied.length}`);
    console.log(`z toho už v PROD pod iným razítkom:       ${unapplied.length - trulyUnapplied.length}`);
    for (const u of unapplied.filter((x) => x.kind === "UNAPPLIED_ALIASED")) {
      console.log(`  ${u.file}  už aplikované ako ${u.appliedAs}`);
    }
  }

  if (ghosts.length > 0) {
    console.error(`\nFAIL: ${ghosts.length} verzií v PROD sa nedá priradiť k súboru v repe.`);
    process.exit(1);
  }
  console.log("\nOK: každá verzia v PROD má v repe zdroj.");
}

if (import.meta.url === `file://${process.argv[1]}`) main();
