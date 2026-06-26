#!/usr/bin/env node
/**
 * READ-ONLY RLS + schema-parity audit (brief: docs/audit/rls-schema-parity-audit-brief.md)
 * Writes apps/crm/docs/audit/rls-schema-parity-matrix.{json,md}
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.production.local") });
config({ path: resolve(process.cwd(), ".env.local") });

const CRM_ROOT = process.cwd();
const MIGRATIONS_DIR = join(CRM_ROOT, "supabase/migrations");
const ALLOWLIST_PATH = join(CRM_ROOT, "config/public-schema-allowlist.json");
const API_DIR = join(CRM_ROOT, "src/app/api");
const STORE_DIR = join(CRM_ROOT, "src/lib");
const OUT_JSON = join(CRM_ROOT, "docs/audit/rls-schema-parity-matrix.json");
const OUT_MD = join(CRM_ROOT, "docs/audit/rls-schema-parity-matrix.md");

const TENANT_TABLES = new Set([
  "agencies", "teams", "profiles", "leads", "properties", "activities", "tasks",
  "ai_recommendations", "lead_property_matches", "lead_events", "lead_scores",
  "client_dna", "deal_risk", "deal_moments", "ai_actions", "lead_action_scores",
  "lead_closing_windows", "lead_rescue_runs", "lead_micro_actions", "ai_action_audit",
  "ai_sourced_deals", "scheduled_events", "routine_notifications", "credit_ledger",
  "dashboard_insights_cache", "import_jobs", "import_rows", "realsoft_import_logs",
  "enrichment_log", "outreach_logs", "events", "stealth_recruiter_prospects",
  "morning_briefs", "morning_brief_settings", "pipeline_moves", "lead_property_scores",
  "lead_property_events", "decisions", "integration_settings", "broker_events",
  "buyer_events", "buyer_intents", "kataster_events", "neighborhood_alerts",
  "neighborhood_subscriptions", "watched_parcels", "property_price_trail",
  "listing_price_history", "price_alerts", "priority_alerts", "arbitrage_matches",
  "arbitrage_config", "bri_config", "bri_history", "bri_score_history",
  "competition_radar", "deal_moments", "exclusivity_outcomes", "ghostwriter_letters",
  "ghost_sessions", "onboarding_sessions", "client_onboarding_progress",
  "client_onboarding_messages", "push_subscriptions", "profile_integrations",
  "profile_google_calendar", "team_licenses", "usage_metrics_daily",
]);

const CMD_MAP = { r: "SELECT", a: "ALL", s: "SELECT", i: "INSERT", u: "UPDATE", d: "DELETE", "*": "ALL" };

function requireEnv(primary, fallback) {
  const value = (process.env[primary] ?? process.env[fallback] ?? "").trim();
  if (!value) throw new Error(`Missing env: ${primary} or ${fallback}`);
  return value;
}

function walkFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function parseMigrationPolicies() {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  const byTable = new Map();

  function ensure(table) {
    if (!byTable.has(table)) {
      byTable.set(table, { policies: new Map(), rlsEnabled: false, migrations: new Set() });
    }
    return byTable.get(table);
  }

  function addPolicy(table, name, cmdRaw, block, file) {
    const cmdUpper = cmdRaw.toUpperCase();
    const cmds =
      cmdUpper === "ALL"
        ? ["SELECT", "INSERT", "UPDATE", "DELETE", "ALL"]
        : [CMD_MAP[cmdRaw.toLowerCase()] ?? cmdUpper];
    const permissiveTrue = /using\s*\(\s*true\s*\)/i.test(block) || /with\s+check\s*\(\s*true\s*\)/i.test(block);
    const tenantScoped = /profile_agencies_for_auth\s*\(\s*\)/i.test(block);
    const serviceRoleOnly = /auth\.role\(\)\s*=\s*'service_role'/i.test(block);
    const row = ensure(table);
    row.policies.set(name, { cmds, permissiveTrue, tenantScoped, serviceRoleOnly, migration: file });
    row.migrations.add(file);
  }

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    const createPolicy =
      /create\s+policy\s+"([^"]+)"\s+on\s+public\.(\w+)\s+for\s+(\w+)/gi;
    const dropPolicy = /drop\s+policy\s+if\s+exists\s+"([^"]+)"\s+on\s+public\.(\w+)/gi;
    const enableRls = /alter\s+table\s+public\.(\w+)\s+enable\s+row\s+level\s+security/gi;

    let m;
    while ((m = dropPolicy.exec(sql))) {
      const [, name, table] = m;
      ensure(table).policies.delete(name);
      ensure(table).migrations.add(file);
    }
    while ((m = createPolicy.exec(sql))) {
      const [, name, table, cmdRaw] = m;
      addPolicy(table, name, cmdRaw, sql.slice(m.index, m.index + 700), file);
      ensure(table).rlsEnabled = true;
    }
    while ((m = enableRls.exec(sql))) {
      ensure(m[1]).rlsEnabled = true;
      ensure(m[1]).migrations.add(file);
    }

    // Dynamic Wave A hardening: ('table', 'policy_name')
    const waveValues = /\(\s*'(\w+)'\s*,\s*'(\w+)'\s*\)/g;
    while ((m = waveValues.exec(sql))) {
      if (!/for all to authenticated using \(agency_id in \(select public\.profile_agencies_for_auth\(\)\)\)/.test(sql)) continue;
      const [, table, policyName] = m;
      addPolicy(table, policyName, "ALL", "profile_agencies_for_auth()", file);
      ensure(table).rlsEnabled = true;
    }

    const foreachTables = /foreach\s+tbl\s+in\s+array\s+array\[([^\]]+)\]/gi;
    while ((m = foreachTables.exec(sql))) {
      const tables = [...m[1].matchAll(/'(\w+)'/g)].map((x) => x[1]);
      for (const table of tables) {
        addPolicy(table, `${table}_service_role_all`, "ALL", "auth.role() = 'service_role'", file);
        ensure(table).rlsEnabled = true;
      }
    }
  }
  return byTable;
}

function summarizeRepoPolicies(row) {
  if (!row) {
    return {
      select: false,
      insert: false,
      update: false,
      delete: false,
      tenantPolicyOk: false,
      permissiveTrue: false,
      serviceRoleOnly: false,
      policyNames: [],
    };
  }
  const policies = [...row.policies.values()];
  const allCmds = new Set(policies.flatMap((p) => p.cmds ?? [p.cmd]));
  const tenantPolicyOk = policies.some((p) => p.tenantScoped && !p.permissiveTrue);
  const serviceRoleOnly = policies.some((p) => p.serviceRoleOnly);
  const permissiveTrue = policies.some((p) => p.permissiveTrue && !p.serviceRoleOnly);
  return {
    select: allCmds.has("SELECT") || allCmds.has("ALL"),
    insert: allCmds.has("INSERT") || allCmds.has("ALL"),
    update: allCmds.has("UPDATE") || allCmds.has("ALL"),
    delete: allCmds.has("DELETE") || allCmds.has("ALL"),
    tenantPolicyOk: tenantPolicyOk || serviceRoleOnly,
    permissiveTrue,
    serviceRoleOnly,
    policyNames: [...row.policies.keys()],
  };
}

function scanAppWritePaths() {
  const apiFiles = walkFiles(API_DIR);
  const hits = [];
  const storeUnscopedWriters = [];

  for (const file of apiFiles) {
    const text = readFileSync(file, "utf8");
    if (!/(POST|PUT|PATCH|DELETE)/.test(text) && !/method:\s*"(POST|PUT|PATCH|DELETE)"/.test(text)) continue;
    if (!/\.insert\(|\.update\(|\.upsert\(|\.delete\(/.test(text) && !/(createLead|updateLead|createProperty|createActivity|createTask)\(/.test(text)) continue;

    const rel = file.replace(CRM_ROOT + "\\", "").replace(CRM_ROOT + "/", "");
    const usesServerClient = /createClient\(\)|await createClient\(\)/.test(text);
    const passesScoped =
      /,\s*supabase|,\s*supabaseAuth|,\s*scoped|listLeads\([^)]*,\s*supabase|createLead\([\s\S]*?,\s*supabaseAuth/.test(text);
    const usesStoreWriter = /(createLead|updateLead|createActivity|createProperty|updateProperty|createTask)\(/.test(text);

    if (usesStoreWriter && !passesScoped) {
      hits.push({ route: rel, issue: "store_writer_without_scoped_client", severity: "P0" });
    } else if (/getSupabaseClient\(\)|supabaseClient\./.test(text)) {
      hits.push({ route: rel, issue: "browser_singleton_in_api", severity: "P0" });
    } else if (usesServerClient && /\.insert\(|\.update\(|\.upsert\(|\.delete\(/.test(text)) {
      hits.push({ route: rel, issue: "server_client_direct_write", severity: "P1" });
    }
  }

  for (const file of walkFiles(STORE_DIR)) {
    const base = file.split(/[/\\]/).pop();
    if (!base?.endsWith("-store.ts") && base !== "leads-store.ts") continue;
    const text = readFileSync(file, "utf8");
    if (/export async function create\w+|export async function update\w+|export async function delete\w+/.test(text) && /resolveTenantSupabase\(\)/.test(text)) {
      if (!/resolveTenantSupabase\(scoped\)/.test(text) && !/resolveTenantSupabase\(\s*scoped/.test(text)) {
        storeUnscopedWriters.push(base);
      }
    }
  }

  return { hits, storeUnscopedWriters: [...new Set(storeUnscopedWriters)] };
}

function classifySeverity(table, live, repoSummary, allowlisted, appIssues) {
  const isTenant = TENANT_TABLES.has(table) || live.has_agency_id;
  const notes = [];

  if (appIssues.some((h) => h.severity === "P0")) {
    return { severity: "P0", notes: ["live API write path without scoped server client"] };
  }

  if (isTenant && !live.rls_enabled) {
    notes.push("RLS off on tenant-scoped table (cross-tenant leak at customer #2)");
    return { severity: "P0", notes };
  }

  if (live.rls_enabled && isTenant) {
    if (!repoSummary.insert || !repoSummary.select) {
      notes.push("RLS on but repo migrations missing SELECT/INSERT policy coverage");
      return { severity: live.on_prod ? "P0" : "P1", notes };
    }
    if (repoSummary.permissiveTrue && !repoSummary.tenantPolicyOk) {
      notes.push("permissive using(true) without profile_agencies_for_auth scope");
      return { severity: "P0", notes };
    }
    if (!repoSummary.tenantPolicyOk && isTenant) {
      notes.push("no tenant-scoped policy in repo migrations");
      return { severity: "P1", notes };
    }
  }

  if (!allowlisted && live.on_prod) {
    notes.push("table on PROD but missing from AP-019 allowlist");
    return { severity: "P0", notes };
  }
  if (allowlisted && !live.on_prod) {
    notes.push("allowlisted table missing on PROD");
    return { severity: "P0", notes };
  }

  return { severity: "P2", notes };
}

function buildBacklog(rows, writeScan) {
  const backlog = [];
  const p0Tables = rows.filter((r) => r.severity === "P0");

  if (writeScan.hits.some((h) => h.route.includes("api/leads/route.ts") && h.issue === "store_writer_without_scoped_client")) {
    backlog.push({ id: "fix/w-leads-create-rls", severity: "P0", status: "in_flight", note: "createLead scoped server client" });
  }
  if (writeScan.storeUnscopedWriters.length > 0) {
    backlog.push({ id: "fix/resolveTenantSupabase-audit", severity: "P0", status: "open", note: `Unscoped store writers: ${writeScan.storeUnscopedWriters.join(", ")}` });
  }

  for (const row of p0Tables) {
    if (row.gaps.includes("allowlist_missing")) {
      backlog.push({ id: `fix/allowlist-gap-${row.table}`, severity: "P0", status: "open", note: row.table });
    }
    if (row.gaps.includes("prod_missing")) {
      backlog.push({ id: `fix/prod-migration-${row.table}`, severity: "P0", status: "open", note: `${row.table} in allowlist/repo but not on PROD` });
    }
    if (row.gaps.includes("rls_off_tenant")) {
      backlog.push({ id: `fix/rls-enable-${row.table}`, severity: "P0", status: "open", note: "enable RLS + tenant policy" });
    }
    if (row.gaps.includes("permissive_policy")) {
      backlog.push({ id: `fix/rls-policy-${row.table}`, severity: "P0", status: "open", note: "replace using(true) with profile_agencies_for_auth" });
    }
  }

  backlog.push({ id: "fix/ci-ap019-guard", severity: "P1", status: "open", note: "schema-governance-guard: CREATE TABLE requires allowlist+policy+verification in same PR" });

  const seen = new Set();
  return backlog.filter((b) => {
    const key = b.id + b.note;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  const url = requireEnv("SCHEMA_GUARD_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SCHEMA_GUARD_SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY");
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const allowlist = new Set(JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8")));
  const repoPolicies = parseMigrationPolicies();
  const writeScan = scanAppWritePaths();

  const { data: snapshot, error } = await sb.rpc("rls_audit_snapshot");
  if (error) throw new Error(`rls_audit_snapshot: ${error.message}`);

  const liveByTable = new Map((snapshot ?? []).map((r) => [r.table_name, r]));
  const allTables = [...new Set([...liveByTable.keys(), ...allowlist, ...repoPolicies.keys()])].sort();

  const rows = allTables.map((table) => {
    const live = liveByTable.get(table) ?? { rls_enabled: null, has_agency_id: false, on_prod: false };
    live.on_prod = liveByTable.has(table);
    const repoRow = repoPolicies.get(table);
    const repoSummary = summarizeRepoPolicies(repoRow);
    const allowlisted = allowlist.has(table);
    const appIssues = writeScan.hits.filter((h) => h.route.includes(`/${table}/`) || (table === "leads" && h.route.includes("api/leads/route.ts")));

    const gaps = [];
    if (!allowlisted && live.on_prod) gaps.push("allowlist_missing");
    if (allowlisted && !live.on_prod) gaps.push("prod_missing");
    if ((TENANT_TABLES.has(table) || live.has_agency_id) && live.on_prod && live.rls_enabled === false) gaps.push("rls_off_tenant");
    if (repoSummary.permissiveTrue && !repoSummary.tenantPolicyOk) gaps.push("permissive_policy");
    if (live.rls_enabled && (TENANT_TABLES.has(table) || live.has_agency_id) && !repoSummary.tenantPolicyOk) gaps.push("missing_tenant_policy_repo");

    const { severity, notes } = classifySeverity(table, live, repoSummary, allowlisted, appIssues);

    return {
      table,
      rls_enabled: live.rls_enabled,
      has_agency_id: live.has_agency_id,
      on_prod: live.on_prod,
      in_allowlist: allowlisted,
      in_repo_migrations: Boolean(repoRow?.migrations?.size),
      policies_repo: repoSummary,
      app_write_paths: appIssues,
      gaps,
      severity,
      notes,
    };
  });

  const p0Count = rows.filter((r) => r.severity === "P0").length;
  const backlog = buildBacklog(rows, writeScan);

  const report = {
    at: new Date().toISOString(),
    readOnly: true,
    source: {
      rls_snapshot: "rls_audit_snapshot()",
      allowlist: "config/public-schema-allowlist.json",
      policies: "supabase/migrations parse (repo truth; live pg_policies requires POSTGRES_URL)",
      app_paths: "grep api routes + *-store.ts",
    },
    summary: {
      tables: rows.length,
      prod_tables: liveByTable.size,
      allowlist_size: allowlist.size,
      p0: p0Count,
      p1: rows.filter((r) => r.severity === "P1").length,
      p2: rows.filter((r) => r.severity === "P2").length,
      unscoped_api_hits: writeScan.hits.filter((h) => h.severity === "P0").length,
    },
    write_scan: writeScan,
    backlog,
    rows,
    exit: p0Count === 0 ? "pass_with_exceptions_only" : "p0_gaps_remain",
  };

  writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);

  const md = [
    "# RLS + Schema-Parity Matrix",
    "",
    `Generated: ${report.at} · READ-ONLY audit`,
    "",
    "## Summary",
    `- PROD tables: **${report.summary.prod_tables}** · Allowlist: **${report.summary.allowlist_size}**`,
    `- P0: **${report.summary.p0}** · P1: **${report.summary.p1}** · P2: **${report.summary.p2}**`,
    `- Unscoped API write hits (P0 class): **${report.summary.unscoped_api_hits}**`,
    "",
    "## PR Backlog (severity order)",
    "",
    ...backlog.map((b) => `- \`${b.id}\` · **${b.severity}** · ${b.status} — ${b.note}`),
    "",
    "## P0 rows",
    "",
    "| table | gaps | notes |",
    "|---|---|---|",
    ...rows
      .filter((r) => r.severity === "P0")
      .map((r) => `| ${r.table} | ${r.gaps.join(", ") || "—"} | ${r.notes.join("; ") || "—"} |`),
    "",
    "## Limitations",
    "- Live `pg_policies` not queried (POSTGRES_URL empty). Policy columns are **repo migration parse**.",
    "- Re-run with DB URL for live policy parity confirmation.",
    "",
  ].join("\n");

  writeFileSync(OUT_MD, md);
  console.log(JSON.stringify({ ok: true, out: OUT_JSON, p0: p0Count, backlog: backlog.length }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
