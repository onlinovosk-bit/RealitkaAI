import { describe, it, expect, beforeAll } from "vitest";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import {
  TENANT_TABLES,
  PLATFORM_TABLES,
} from "./tenant-table-registry";
import {
  createServiceClient,
  seedRlsFixtures,
  RLS_FIXTURE,
  type RlsFixtureContext,
} from "./fixtures";
import {
  assertLocalTestDb,
  signInAs,
  testCrossTenantIsolation,
  fetchRlsAudit,
  mergeRlsStatus,
  type TableIsolationResult,
} from "./isolation-helpers";

const REPORT_PATH = resolve(
  __dirname,
  "../../docs/audit/RLS-ISOLATION-REPORT.md",
);

let ctx: RlsFixtureContext;
let results: TableIsolationResult[] = [];
let testCount = 0;

function generateReport(rows: TableIsolationResult[]): string {
  const critical = rows.filter((r) => r.critical);
  const noRls = rows.filter((r) => !r.rlsEnabled);
  const failIso = rows.filter((r) => r.rlsEnabled && r.seeded && !r.isolationOk && !r.note?.includes("service_role"));

  const lines = [
    "# RLS Tenant Isolation Report",
    "",
    `Generated: ${new Date().toISOString().slice(0, 10)} · Branch: \`chore/rls-tenant-isolation-suite\``,
    "",
    "## Summary",
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Tenant tables in registry | ${TENANT_TABLES.length} |`,
    `| Tables tested (CRUD probe) | ${rows.filter((r) => r.seeded).length} |`,
    `| RLS disabled findings | ${noRls.length} |`,
    `| Critical isolation failures | ${critical.length} |`,
    `| Vitest assertions | ${testCount} |`,
    "",
    "## Tenant tables",
    "",
    "| Table | RLS enabled | Isolation | Fix |",
    "|-------|-------------|-----------|-----|",
  ];

  for (const r of rows) {
    const rls = r.rlsEnabled ? "yes" : "**NO**";
    let iso = "—";
    if (r.seeded) {
      iso = r.isolationOk ? "OK" : "**FAIL**";
    } else if (r.note?.includes("service_role")) {
      iso = "N/A (service_role)";
    } else {
      iso = "seed skip";
    }
    let fix = "—";
    if (!r.rlsEnabled) fix = r.table === "credit_ledger" || r.table === "lead_action_scores" ? "fix in PR" : "proposal";
    else if (!r.isolationOk && r.seeded) fix = "fix in PR / proposal";
    lines.push(`| \`${r.table}\` | ${rls} | ${iso} | ${fix} |`);
  }

  lines.push("", "## Platform tables (not cross-tenant)", "", "| Table | Note |", "|-------|------|");
  for (const p of PLATFORM_TABLES) {
    lines.push(`| \`${p.table}\` | ${p.note} |`);
  }

  if (critical.length > 0) {
    lines.push("", "## Critical findings detail", "");
    for (const c of critical) {
      lines.push(`### \`${c.table}\``, "");
      if (c.note) lines.push(`Note: ${c.note}`, "");
      for (const op of c.operations) {
        lines.push(`- **${op.operation}**: ${op.blocked ? "blocked" : "LEAK"} — ${op.detail}`);
      }
      lines.push("");
    }
  }

  lines.push(
    "",
    "## Method",
    "",
    "- Seed: 2 agencies (A/B), owner + broker users, rows in tenant tables via service role.",
    "- Probe: Agency A owner authenticated client (anon key, not service role).",
    "- Expect: SELECT/INSERT/UPDATE/DELETE on agency B data blocked.",
    "- RLS status: `rls_audit_snapshot()` RPC (service_role).",
    "",
  );

  return lines.join("\n");
}

describe("RLS tenant isolation suite", () => {
  beforeAll(async () => {
    assertLocalTestDb();
    const admin = createServiceClient();
    ctx = await seedRlsFixtures(admin);
    const client = await signInAs(RLS_FIXTURE.emails.ownerA, RLS_FIXTURE.password);

    const raw: TableIsolationResult[] = [];
    for (const def of TENANT_TABLES) {
      raw.push(await testCrossTenantIsolation(client, def, ctx.rows));
    }

    const audit = await fetchRlsAudit(admin);
    results = mergeRlsStatus(raw, audit);

    // Attach RLS status for tables in registry but missing from seed
    for (const def of TENANT_TABLES) {
      const entry = audit.find((a) => a.table_name === def.table);
      if (entry && !entry.rls_enabled) {
        const idx = results.findIndex((r) => r.table === def.table);
        if (idx >= 0) {
          results[idx] = {
            ...results[idx],
            rlsEnabled: false,
            isolationOk: false,
            critical: true,
            note: "RLS NOT ENABLED",
          };
        }
      }
    }

    mkdirSync(dirname(REPORT_PATH), { recursive: true });
    writeFileSync(REPORT_PATH, generateReport(results), "utf8");
  }, 120_000);

  it("covers all tenant tables in registry", () => {
    testCount++;
    expect(results.length).toBe(TENANT_TABLES.length);
  });

  it("has RLS enabled on every tenant table", () => {
    testCount++;
    const disabled = results.filter((r) => !r.rlsEnabled);
    expect(disabled.map((d) => d.table)).toEqual([]);
  });

  for (const def of TENANT_TABLES) {
    it(`isolates agency B data on ${def.table}`, () => {
      testCount++;
      const r = results.find((x) => x.table === def.table);
      expect(r, `missing result for ${def.table}`).toBeDefined();
      if (!r!.seeded) {
        if (def.serviceRoleOnly) return;
        expect.soft(r!.note).not.toMatch(/seed missing/);
        return;
      }
      if (def.serviceRoleOnly) return;
      expect(r!.isolationOk, JSON.stringify(r!.operations, null, 2)).toBe(true);
    });
  }
});

export { results, testCount };
