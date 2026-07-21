#!/usr/bin/env node
/**
 * Apply sandbox + lead_consents migration to PROD Postgres.
 *
 * Usage:
 *   POSTGRES_URL_NON_POOLING="postgresql://..." node scripts/apply-sandbox-gdpr-prod.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const MIGRATION = resolve(
  process.cwd(),
  "supabase/migrations/20260722120000_sandbox_gdpr_consent.sql",
);

const VERIFY_SQL = `
select slug, enabled, is_sandbox
from public.valuation_tenants
where slug in ('demo', 'reality-smolko')
order by slug;

select to_regclass('public.sandbox_submissions') as sandbox_submissions,
       to_regclass('public.lead_consents') as lead_consents;
`;

async function main() {
  const url =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  if (!url || url.length < 20) {
    throw new Error(
      "Missing POSTGRES_URL_NON_POOLING (or POSTGRES_URL). Pull from Supabase → Settings → Database.",
    );
  }

  const sql = readFileSync(MIGRATION, "utf8");
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("Migration applied OK.");
    const verify = await client.query(VERIFY_SQL);
    console.log(JSON.stringify(verify, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
