#!/usr/bin/env node
// Reconciles production's migration history against apps/crm/supabase/migrations.
//
// Why this exists
// ===============
// `supabase_migrations.schema_migrations` is an accounting record, not a
// measurement. A migration missing from it may still have taken full effect
// (applied through a path that does not record, or recorded under another
// version), and a migration present in it may have left nothing behind.
// AP-024 (docs/reports/2026-09-27-migration-history-reconcile.md) found both
// on the same database on the same day, so the only trustworthy question is
// per object: does production carry the object this file asserts?
//
// This script does the two halves that need no database:
//   --mode diff   which versions are in one side and not the other, and which
//                 of those pair up BY NAME (the signature of a migration
//                 applied through the MCP tool, which coins its own version)
//   --mode sql    the SQL that measures each asserted object against a live
//                 catalog, emitted in chunks and printing only mismatches
//
// Usage
//   node scripts/ops/reconcile-migration-history.mjs --mode diff \
//        --history history.txt
//   node scripts/ops/reconcile-migration-history.mjs --mode sql \
//        --history history.txt --chunk 165 > verify.sql
//
// `history.txt` holds one `version|name` per line, straight out of
//   select version || '|' || coalesce(name,'') from supabase_migrations.schema_migrations;
//
// What it does NOT do: connect to a database, or write anything anywhere.
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? dflt : argv[i + 1];
};

const DIR = resolve(arg("migrations", "apps/crm/supabase/migrations"));
const MODE = arg("mode", "diff");
const CHUNK = Number(arg("chunk", 165));
const HISTORY = arg("history", null);

const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const repo = files.map((f) => ({
  version: f.match(/^(\d+)_/)?.[1] ?? "",
  name: f.replace(/^\d+_/, "").replace(/\.sql$/, ""),
  file: f,
}));

function readHistory() {
  if (!HISTORY) {
    console.error("--history <file> is required (version|name per line)");
    process.exit(2);
  }
  return readFileSync(HISTORY, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [version, name = ""] = l.split("|");
      return { version, name };
    });
}

// ---------------------------------------------------------------- assertions

// Postgres folds an UNQUOTED identifier to lower case and preserves a QUOTED
// one, so `CREATE POLICY "Allow anon access"` and `create policy allow_anon`
// land in the catalog with different casing. Lowercasing both would make every
// mixed-case policy name look absent — a false finding, not a real one.
const unquote = (s) => {
  let raw = (s || "").trim();
  raw = raw.replace(/^public\./i, "");
  if (raw.startsWith('"') && raw.endsWith('"')) return raw.slice(1, -1);
  return raw.toLowerCase();
};

// Strips /* */ blocks and -- to end of line, leaving single-quoted strings
// alone so that a `--` inside a policy expression is not treated as a comment.
function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((line) => {
      let inString = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === "'") inString = !inString;
        if (!inString && line[i] === "-" && line[i + 1] === "-") return line.slice(0, i);
      }
      return line;
    })
    .join("\n");
}

const CODE = {
  table: "T", table_absent: "TA", view: "V", type: "TY", function: "F",
  index: "IX", trigger: "TG", policy: "P", policy_absent: "PA",
  rls_enabled: "R", rls_forced: "RF", column: "C", column_absent: "CA",
  not_null: "NN", constraint: "K", constraint_absent: "KA",
  priv_present: "PP", priv_absent: "PB",
};
const NEGATIVE = new Set(["TA", "PA", "CA", "KA", "PB"]);
const ALL_PRIVS = ["select", "insert", "update", "delete", "truncate", "references", "trigger"];

const RULES = [
  ["table", /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?([\w".]+)/gi, (m) => ({ name: unquote(m[1]) })],
  ["table_absent", /\bdrop\s+table\s+(?:if\s+exists\s+)?([\w".]+)/gi, (m) => ({ name: unquote(m[1]) })],
  ["view", /\bcreate\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?([\w".]+)/gi, (m) => ({ name: unquote(m[1]) })],
  ["type", /\bcreate\s+type\s+([\w".]+)/gi, (m) => ({ name: unquote(m[1]) })],
  ["function", /\bcreate\s+(?:or\s+replace\s+)?function\s+([\w".]+)\s*\(/gi, (m) => ({ name: unquote(m[1]) })],
  ["index", /\bcreate\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?([\w".]+)\s+on\s+([\w".]+)/gi, (m) => ({ name: unquote(m[1]), table: unquote(m[2]) })],
  ["trigger", /\bcreate\s+(?:or\s+replace\s+)?trigger\s+([\w".]+)[\s\S]{0,200}?\bon\s+([\w".]+)/gi, (m) => ({ name: unquote(m[1]), table: unquote(m[2]) })],
  ["policy", /\bcreate\s+policy\s+("[^"]+"|[\w]+)\s+on\s+([\w".]+)/gi, (m) => ({ name: unquote(m[1]), table: unquote(m[2]) })],
  ["policy_absent", /\bdrop\s+policy\s+(?:if\s+exists\s+)?("[^"]+"|[\w]+)\s+on\s+([\w".]+)/gi, (m) => ({ name: unquote(m[1]), table: unquote(m[2]) })],
  ["rls_enabled", /\balter\s+table\s+(?:if\s+exists\s+)?([\w".]+)\s+enable\s+row\s+level\s+security/gi, (m) => ({ table: unquote(m[1]) })],
  ["rls_forced", /\balter\s+table\s+(?:if\s+exists\s+)?([\w".]+)\s+force\s+row\s+level\s+security/gi, (m) => ({ table: unquote(m[1]) })],
];

function alterTableAssertions(sql) {
  const out = [];
  const re = /\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?([\w".]+)([\s\S]*?);/gi;
  let m;
  while ((m = re.exec(sql))) {
    const table = unquote(m[1]);
    const body = m[2];
    const scan = (kind, pattern) => {
      let c;
      const r = new RegExp(pattern.source, pattern.flags);
      while ((c = r.exec(body))) out.push({ kind, table, name: unquote(c[1]) });
    };
    scan("column", /\badd\s+column\s+(?:if\s+not\s+exists\s+)?([\w"]+)/gi);
    scan("column_absent", /\bdrop\s+column\s+(?:if\s+exists\s+)?([\w"]+)/gi);
    scan("constraint", /\badd\s+constraint\s+([\w"]+)/gi);
    scan("constraint_absent", /\bdrop\s+constraint\s+(?:if\s+exists\s+)?([\w"]+)/gi);
    scan("not_null", /\balter\s+column\s+([\w"]+)\s+set\s+not\s+null/gi);
  }
  return out;
}

function grantAssertions(sql) {
  const out = [];
  const re = /\b(revoke|grant)\s+([\s\S]*?)\s+on\s+(?:table\s+)?([\w".,\s]+?)\s+(?:from|to)\s+([\w",\s]+?);/gi;
  let m;
  while ((m = re.exec(sql))) {
    const kind = m[1].toLowerCase() === "revoke" ? "priv_absent" : "priv_present";
    // ALTER DEFAULT PRIVILEGES ... ON TABLES/SEQUENCES/FUNCTIONS names an object
    // CLASS, not a relation: there is no table called "tables" to look up.
    const OBJECT_CLASSES = new Set(["tables", "sequences", "functions", "routines", "types", "schemas"]);
    const privs = m[2].replace(/\s+/g, " ").trim().toLowerCase();
    for (const t of m[3].split(",").map(unquote).filter((t) => t && !OBJECT_CLASSES.has(t))) {
      for (const r of m[4].split(",").map((x) => unquote(x).trim()).filter(Boolean)) {
        out.push({ kind, table: t, role: r, privs });
      }
    }
  }
  return out;
}

function assertionsFor(file) {
  const sql = stripComments(readFileSync(`${DIR}/${file}`, "utf8"));
  const found = [];
  for (const [kind, re, map] of RULES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(sql))) found.push({ kind, ...map(m) });
  }
  found.push(...alterTableAssertions(sql), ...grantAssertions(sql));

  // `DROP POLICY IF EXISTS x; CREATE POLICY x` is an idempotency preamble, not
  // an intent that x be absent. Same for constraints, columns and tables.
  const positives = new Set(
    found.filter((a) => !a.kind.endsWith("_absent"))
      .map((a) => [a.kind, a.name || "", a.table || ""].join("\u0001")),
  );
  const seen = new Set();
  return found.filter((a) => {
    if (a.kind.endsWith("_absent")) {
      const base = a.kind.replace(/_absent$/, "");
      if (positives.has([base, a.name || "", a.table || ""].join("\u0001"))) return false;
    }
    const key = JSON.stringify(a);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// An identifier reaches the catalog query through quote_ident, so whitespace or
// a semicolon in one means the regex over-captured; a policy or constraint NAME
// may legitimately contain spaces, and only `;` disqualifies it.
const badIdent = (s) => !s || /[\s;|]/.test(s) || s.length > 63;
const badName = (s) => /[;|]/.test(s || "") || (s || "").length > 63;

function rowsFor(entries) {
  const rows = [];
  const skipped = [];
  for (const { version, file } of entries) {
    for (const a of assertionsFor(file)) {
      if (a.kind.startsWith("priv")) {
        if (badIdent(a.table) || badIdent(a.role)) { skipped.push({ version, a }); continue; }
        const privs = a.privs
          .replace(/all privileges|^all$/g, ALL_PRIVS.join(","))
          .split(",").map((s) => s.trim()).filter((s) => ALL_PRIVS.includes(s));
        if (!privs.length) { skipped.push({ version, a }); continue; }
        for (const p of privs) rows.push([version, CODE[a.kind], "", a.table, a.role, p].join("|"));
        continue;
      }
      const obj = a.name || "", tbl = a.table || "";
      if (badName(obj) || (tbl && badIdent(tbl))) { skipped.push({ version, a }); continue; }
      rows.push([version, CODE[a.kind], obj, tbl, "", ""].join("|"));
    }
  }
  return { rows: [...new Set(rows)], skipped };
}

const CASES = `case a.kind
  when 'T'  then (select true from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=a.obj and c.relkind in ('r','p'))
  when 'TA' then (select true from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=a.obj and c.relkind in ('r','p'))
  when 'V'  then (select true from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=a.obj and c.relkind in ('v','m'))
  when 'TY' then (select true from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname=a.obj)
  when 'F'  then (select true from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=a.obj limit 1)
  when 'IX' then (select true from pg_indexes where schemaname='public' and indexname=a.obj)
  when 'TG' then (select true from pg_trigger tg join pg_class c on c.oid=tg.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=a.tbl and tg.tgname=a.obj and not tg.tgisinternal)
  when 'P'  then (select true from pg_policies where schemaname='public' and tablename=a.tbl and policyname=a.obj)
  when 'PA' then (select true from pg_policies where schemaname='public' and tablename=a.tbl and policyname=a.obj)
  when 'R'  then (select c.relrowsecurity or null from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=a.tbl)
  when 'RF' then (select c.relforcerowsecurity or null from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=a.tbl)
  when 'C'  then (select true from pg_attribute at join pg_class c on c.oid=at.attrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=a.tbl and at.attname=a.obj and at.attnum>0 and not at.attisdropped)
  when 'CA' then (select true from pg_attribute at join pg_class c on c.oid=at.attrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=a.tbl and at.attname=a.obj and at.attnum>0 and not at.attisdropped)
  when 'NN' then (select at.attnotnull or null from pg_attribute at join pg_class c on c.oid=at.attrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=a.tbl and at.attname=a.obj)
  when 'K'  then (select true from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=a.tbl and con.conname=a.obj)
  when 'KA' then (select true from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=a.tbl and con.conname=a.obj)
  when 'PP' then (select has_table_privilege(a.rol, ('public.'||quote_ident(a.tbl))::regclass, a.priv) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=a.tbl)
  when 'PB' then (select has_table_privilege(a.rol, ('public.'||quote_ident(a.tbl))::regclass, a.priv) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=a.tbl)
end`;

const NEG_LIST = [...NEGATIVE].map((k) => `'${k}'`).join(",");

function emitSql(rows) {
  const out = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const blob = rows.slice(i, i + CHUNK).join("\n");
    out.push(`-- chunk ${out.length + 1}
with raw as (select unnest(string_to_array($rows$${blob}$rows$, E'\\n')) as l),
a as (select split_part(l,'|',1) vers, split_part(l,'|',2) kind, split_part(l,'|',3) obj,
             split_part(l,'|',4) tbl, split_part(l,'|',5) rol, split_part(l,'|',6) priv
      from raw where l <> ''),
ev as (select a.*, ${CASES} as present from a a)
select (select count(*) from ev) as checked,
       (select count(*) from ev where (kind in (${NEG_LIST}) and coalesce(present,false))
                                   or (kind not in (${NEG_LIST}) and not coalesce(present,false))) as mismatches,
       (select string_agg(vers||'|'||kind||'|'||obj||'|'||tbl||'|'||rol||'|'||priv||'|'||coalesce(present::text,'null'),
                          E'\\n' order by vers, kind, tbl, obj)
          from ev where (kind in (${NEG_LIST}) and coalesce(present,false))
                     or (kind not in (${NEG_LIST}) and not coalesce(present,false))) as detail;`);
  }
  return out.join("\n\n");
}

// --------------------------------------------------------------------- modes

if (MODE === "diff") {
  const history = readHistory();
  const histVersions = new Set(history.map((h) => h.version));
  const repoVersions = new Set(repo.map((r) => r.version));
  const missing = repo.filter((r) => !histVersions.has(r.version));
  const ghosts = history.filter((h) => !repoVersions.has(h.version));
  const byName = new Map(history.map((h) => [h.name, h.version]));

  console.log(`repo migrations        ${repo.length}`);
  console.log(`history rows           ${history.length}`);
  console.log(`in repo, not history   ${missing.length}`);
  console.log(`in history, not repo   ${ghosts.length}`);
  console.log("\n-- history rows with no repo file, paired by name --");
  for (const g of ghosts) {
    const hit = repo.filter((r) => r.name === g.name);
    console.log(`${g.version}  ${g.name}  ->  ${hit.length ? hit.map((h) => h.file).join(", ") : "NO REPO FILE (production-only)"}`);
  }
  console.log("\n-- repo files recorded under a different version --");
  let paired = 0;
  for (const m of missing) {
    if (byName.has(m.name)) { console.log(`${m.file}  == history ${byName.get(m.name)}`); paired++; }
  }
  console.log(`\npaired by name: ${paired} of ${missing.length} unrecorded repo migrations`);
} else if (MODE === "sql") {
  const history = readHistory();
  const histVersions = new Set(history.map((h) => h.version));
  const only = argv.includes("--all") ? repo : repo.filter((r) => !histVersions.has(r.version));
  const { rows, skipped } = rowsFor(only);
  console.error(`migrations: ${only.length}  assertion rows: ${rows.length}  unparsed: ${skipped.length}`);
  for (const s of skipped) console.error(`  unparsed ${s.version} ${s.a.kind} ${JSON.stringify(s.a)}`);
  console.log(emitSql(rows));
} else {
  console.error(`unknown --mode ${MODE} (expected diff or sql)`);
  process.exit(2);
}
