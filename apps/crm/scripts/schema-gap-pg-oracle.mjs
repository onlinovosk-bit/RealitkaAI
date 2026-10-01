#!/usr/bin/env node
/**
 * Cieľová cesta: apps/crm/scripts/schema-gap-pg-oracle.mjs
 *
 * Jednorazový (ručný) oracle pre check-schema-gap.mjs: prehrá všetky migrácie na
 * skutočnom PostgreSQL a porovná množinu objektov v `public` s tým, čo tvrdí
 * statický parser. Parser je regex a dá sa ním pomýliť (podmienený CREATE, názov
 * v úvodzovkách s bodkou, DROP/RENAME v poradí); toto je dôkaz, že sa nemýli.
 *
 * Do CI to nepatrí: potrebuje Postgres, a CI už migrácie prehráva v `supabase db
 * reset`. Spusti pri každej zmene parsera v check-schema-gap.mjs.
 *
 * Postgres beží v-procese ako WASM (PGlite), takže netreba Docker ani root.
 * Supabase-špecifické veci (roly, schéma auth/storage, pg_cron) sú nahradené
 * minimálnymi stubmi — nič z toho nevytvára tabuľky v `public`.
 *
 * Emuluje `supabase db reset`: súbory v poradí názvov, každý v jednej transakcii.
 * Súbor, ktorý padne, sa vypíše a ZNAMENÁ medzeru v stuboch (v CI by padol celý
 * reset) — parser sa potom porovnáva proti neúplnému stavu, a to oracle povie.
 *
 * Použitie (z koreňa repa):
 *   (cd apps/crm && npm i --no-save @electric-sql/pglite)
 *   node apps/crm/scripts/schema-gap-pg-oracle.mjs
 * Výstup: počty, rozdiely v oboch smeroch; exit 1 pri akomkoľvek rozdiele alebo
 * zlyhanej migrácii.
 */
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { MIGRATIONS_DIR, findRepoRoot, scanMigrations } from "./check-schema-gap.mjs";

const root = findRepoRoot();
if (!root) {
  console.error(`CHYBA: nad ${process.cwd()} som nenašiel ${MIGRATIONS_DIR}/ — spusti z repa.`);
  process.exit(2);
}

let PGlite;
let pgcrypto;
try {
  // Rieši sa z apps/crm/node_modules, kde ho nainštaluje `npm i --no-save`.
  const require = createRequire(join(root, "apps/crm/package.json"));
  ({ PGlite } = await import(require.resolve("@electric-sql/pglite")));
  try {
    ({ pgcrypto } = await import(require.resolve("@electric-sql/pglite/contrib/pgcrypto")));
  } catch {
    pgcrypto = null;
  }
} catch {
  console.error("CHYBA: chýba @electric-sql/pglite. Spusti: (cd apps/crm && npm i --no-save @electric-sql/pglite)");
  process.exit(2);
}

const pg = new PGlite({ extensions: pgcrypto ? { pgcrypto } : {} });
await pg.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create role supabase_admin; create role authenticator; create role supabase_auth_admin;
create schema if not exists extensions; create schema if not exists auth; create schema if not exists storage;
create schema if not exists realtime; create schema if not exists cron; create schema if not exists graphql_public;
${pgcrypto
  ? "create extension if not exists pgcrypto schema extensions;"
  : "create function extensions.gen_salt(text) returns text language sql as $$ select 'x' $$; create function extensions.crypt(text,text) returns text language sql as $$ select $1 $$;"}
create table auth.users (id uuid primary key default gen_random_uuid(), email text, phone text, encrypted_password text,
  email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}',
  created_at timestamptz default now(), updated_at timestamptz default now(), last_sign_in_at timestamptz, role text);
create publication supabase_realtime;
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create function auth.role() returns text language sql stable as $$ select 'anon'::text $$;
create function auth.email() returns text language sql stable as $$ select null::text $$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[], created_at timestamptz default now());
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb, created_at timestamptz default now());
alter table storage.objects enable row level security;
create table cron.job (jobid bigserial primary key, jobname text, schedule text, command text);
create function cron.schedule(text, text, text) returns bigint language sql as $$ select 1::bigint $$;
create function cron.schedule(text, text) returns bigint language sql as $$ select 1::bigint $$;
create function cron.unschedule(text) returns boolean language sql as $$ select true $$;
create function cron.unschedule(bigint) returns boolean language sql as $$ select true $$;
`);

const dir = join(root, MIGRATIONS_DIR);
const files = readdirSync(dir).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
const failed = [];
for (const f of files) {
  // pg_cron nie je v PGlite; nahrádza ho stub schéma `cron` vyššie.
  const sql = readFileSync(join(dir, f), "utf8").replace(
    /create\s+extension\s+if\s+not\s+exists\s+"?pg_cron"?[^;]*;/gi,
    "select 1;",
  );
  try {
    await pg.exec("begin;");
    await pg.exec(sql);
    await pg.exec("commit;");
  } catch (e) {
    await pg.exec("rollback;").catch(() => {});
    failed.push(`${f}: ${String(e.message).split("\n")[0]}`);
  }
}

const real = new Set(
  (await pg.query(`
    select c.relname as name
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','v','m','f','p')`)).rows.map((r) => r.name),
);
const parsed = new Set(scanMigrations(MIGRATIONS_DIR, root).relations.keys());
const onlyParsed = [...parsed].filter((x) => !real.has(x)).sort();
const onlyReal = [...real].filter((x) => !parsed.has(x)).sort();

console.log(`Migrácií prehraných:                 ${files.length - failed.length}/${files.length}`);
console.log(`Objektov v public (skutočný Postgres): ${real.size}`);
console.log(`Objektov v public (parser):            ${parsed.size}`);
console.log(`Parser tvrdí, Postgres nemá:           ${JSON.stringify(onlyParsed)}`);
console.log(`Postgres má, parser minul:             ${JSON.stringify(onlyReal)}`);
for (const f of failed) console.log(`ZLYHALA MIGRÁCIA  ${f}`);

process.exit(onlyParsed.length || onlyReal.length || failed.length ? 1 : 0);
