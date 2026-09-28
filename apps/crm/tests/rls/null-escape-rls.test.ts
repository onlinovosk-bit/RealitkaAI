import { describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

/**
 * RLS-NULL-ESCAPES regression pin.
 *
 * The tenant policies on these ten tables used to read
 *   `agency_id IS NULL OR agency_id IN (…my agencies…)`
 * which looks like a tenant check and admits every row that cannot be
 * attributed. Because USING also decides who may READ a row, one authenticated
 * user inserting a NULL agency_id made that row visible to EVERY other tenant.
 *
 * Two properties are pinned here, and the second is the one that matters:
 *   1. an authenticated user cannot CREATE an unattributed row, and
 *   2. an unattributed row that already exists (planted with the service role,
 *      which bypasses RLS) is invisible to every tenant.
 *
 * Testing only (1) would pass against a policy that still leaks on read.
 */

type EnvSet = { url: string; anon: string; service: string };

function getRequiredTestEnv(): EnvSet {
  const url = process.env.TEST_SUPABASE_URL;
  const anon = process.env.TEST_SUPABASE_ANON_KEY;
  const service = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) {
    throw new Error(
      "Missing TEST_SUPABASE_URL / TEST_SUPABASE_ANON_KEY / TEST_SUPABASE_SERVICE_ROLE_KEY. " +
        "RLS integration test must run against dedicated TEST Supabase.",
    );
  }
  if (url.includes("ypgajkhqtbriqqmyawyv")) {
    throw new Error(`Refusing to run RLS test on production URL: ${url}`);
  }
  return { url, anon, service };
}

/**
 * The columns each table needs beyond agency_id. Taken from the production
 * catalog: NOT NULL, no default. A row missing one of these fails with 23502
 * before RLS is ever consulted, which would make the test pass for the wrong
 * reason — so the payloads are complete on purpose.
 */
const TABLES: { table: string; extra: (leadId: string, profileId: string) => Record<string, unknown> }[] = [
  { table: "ai_actions", extra: (leadId) => ({ lead_id: leadId, action: "probe" }) },
  {
    table: "bri_history",
    extra: (leadId, profileId) => ({
      lead_id: leadId,
      profile_id: profileId,
      bri_score: 42,
      reasoning_string: "probe",
    }),
  },
  { table: "client_dna", extra: (leadId) => ({ lead_id: leadId }) },
  { table: "deal_moments", extra: (leadId) => ({ lead_id: leadId }) },
  { table: "deal_risk", extra: (leadId) => ({ lead_id: leadId }) },
  { table: "lead_events", extra: (leadId) => ({ lead_id: leadId, type: "probe" }) },
  { table: "lead_scores", extra: (leadId) => ({ lead_id: leadId }) },
  { table: "priority_alerts", extra: () => ({ alert_type: "in_app", message: "probe" }) },
  { table: "ai_action_audit", extra: () => ({ action_kind: "probe" }) },
  { table: "properties", extra: () => ({ id: randomUUID(), title: "probe" }) },
];

describe("RLS null-escape: an unattributed row is nobody's row", () => {
  it("blocks creating and reading agency_id IS NULL rows on every escaped table", async () => {
    const { url, anon, service } = getRequiredTestEnv();
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const userClient: SupabaseClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const stamp = Date.now();
    const agencyA = randomUUID();
    const authUserId = randomUUID();
    const profileId = randomUUID();
    const leadId = `null-escape-lead-${stamp}`;
    const email = `rls-null-escape-${stamp}@revolis.test`;
    const password = "RlsNullEscapeTest123!";

    const { error: agencyErr } = await admin.from("agencies").upsert({
      id: agencyA,
      name: "RLS Null Escape Agency A",
      slug: `rls-null-escape-${stamp}`,
      city: "Bratislava",
      plan: "Team",
    });
    expect(agencyErr?.message).toBeUndefined();

    const { error: userErr } = await admin.auth.admin.createUser({
      id: authUserId,
      email,
      password,
      email_confirm: true,
    });
    expect(userErr?.message).toBeUndefined();

    const { error: profileErr } = await admin.from("profiles").upsert({
      id: profileId,
      agency_id: agencyA,
      auth_user_id: authUserId,
      full_name: "RLS Null Escape Owner A",
      email,
      role: "owner",
    });
    expect(profileErr?.message).toBeUndefined();

    const { error: leadErr } = await admin.from("leads").upsert({
      id: leadId,
      name: "Null Escape Lead",
      email: `lead-${stamp}@revolis.test`,
      agency_id: agencyA,
      status: "Nový",
    });
    expect(leadErr?.message).toBeUndefined();

    const { error: signInErr } = await userClient.auth.signInWithPassword({ email, password });
    expect(signInErr?.message).toBeUndefined();

    for (const { table, extra } of TABLES) {
      const payload = extra(leadId, profileId);

      // The service role bypasses RLS, so this plants the row the policy used to
      // hand to everyone. If planting fails the table shape changed — that is a
      // real failure, not a reason to skip.
      const plantedId = randomUUID();
      const { error: plantErr } = await admin
        .from(table)
        .insert({ ...payload, id: plantedId, agency_id: null });
      expect(plantErr?.message, `could not plant an unattributed row in ${table}`).toBeUndefined();

      // 1. A tenant must not be able to manufacture one.
      const { error: insertErr } = await userClient
        .from(table)
        .insert({ ...extra(leadId, profileId), id: randomUUID(), agency_id: null });
      expect(insertErr, `${table}: authenticated could insert agency_id = NULL`).toBeTruthy();

      // 2. And must not be able to see one that exists.
      const { data: visible } = await userClient.from(table).select("id").eq("id", plantedId);
      expect(visible ?? [], `${table}: an unattributed row was visible to a tenant`).toHaveLength(0);

      await admin.from(table).delete().eq("id", plantedId);
    }
  }, 120_000);
});
