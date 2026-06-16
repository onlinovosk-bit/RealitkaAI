#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

async function main() {
  const allowlistPath = resolve(process.cwd(), "config/public-schema-allowlist.json");
  const allowed = new Set(JSON.parse(readFileSync(allowlistPath, "utf8")));

  const supabaseUrl = requireEnv("SCHEMA_GUARD_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SCHEMA_GUARD_SUPABASE_SERVICE_ROLE_KEY");
  const sb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await sb.rpc("rls_audit_snapshot");
  if (error) {
    throw new Error(`rls_audit_snapshot failed: ${error.message}`);
  }

  const liveTables = [...new Set((data ?? []).map((row) => row.table_name).filter(Boolean))].sort();
  const unexpected = liveTables.filter((table) => !allowed.has(table));
  const missing = [...allowed].filter((table) => !liveTables.includes(table));

  if (unexpected.length > 0 || missing.length > 0) {
    console.error("[schema-guard] public schema drift detected");
    if (unexpected.length > 0) {
      console.error(`[schema-guard] Unexpected tables (${unexpected.length}):`);
      for (const table of unexpected) console.error(`  - ${table}`);
    }
    if (missing.length > 0) {
      console.error(`[schema-guard] Missing allowlisted tables (${missing.length}):`);
      for (const table of missing) console.error(`  - ${table}`);
    }
    process.exit(1);
  }

  console.log(`[schema-guard] OK - ${liveTables.length} public tables match allowlist`);
}

main().catch((err) => {
  console.error(`[schema-guard] ERROR: ${err.message}`);
  process.exit(1);
});

