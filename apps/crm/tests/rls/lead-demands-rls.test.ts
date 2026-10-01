import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

/**
 * DEMAND-D1 tenant pin for `lead_demands`.
 *
 * Pinned:
 *   1. a tenant reads its own agency's demand records,
 *   2. a tenant does NOT read another agency's records,
 *   3. a tenant cannot write at all (service role is the only writer),
 *   4. a row without an agency cannot exist (NOT NULL), so the null escape
 *      closed by 20260928070000 has nothing to open here.
 */

function env() {
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

const DEMAND = { property_type: { value: null, confidence: 0, source: null, evidence: null } };

describe("lead_demands RLS", () => {
  it("isolates tenants and allows no tenant writes", async () => {
    const { url, anon, service } = env();
    const opts = { auth: { persistSession: false, autoRefreshToken: false } };
    const admin = createClient(url, service, opts);
    const user = createClient(url, anon, opts);

    const stamp = Date.now();
    const agencyA = randomUUID();
    const agencyB = randomUUID();
    const authUserId = randomUUID();
    const email = `rls-lead-demands-${stamp}@revolis.test`;
    const password = "RlsLeadDemands123!";
    const leadA = `lead-demands-a-${stamp}`;
    const leadB = `lead-demands-b-${stamp}`;

    for (const [id, tag] of [
      [agencyA, "a"],
      [agencyB, "b"],
    ] as const) {
      const { error } = await admin.from("agencies").upsert({
        id,
        name: `RLS Lead Demands ${tag}`,
        slug: `rls-lead-demands-${tag}-${stamp}`,
        city: "Bratislava",
        plan: "Team",
      });
      expect(error?.message).toBeUndefined();
    }

    const { error: userErr } = await admin.auth.admin.createUser({
      id: authUserId,
      email,
      password,
      email_confirm: true,
    });
    expect(userErr?.message).toBeUndefined();

    const { error: profileErr } = await admin.from("profiles").upsert({
      id: randomUUID(),
      agency_id: agencyA,
      auth_user_id: authUserId,
      full_name: "RLS Lead Demands Owner A",
      email,
      role: "owner",
    });
    expect(profileErr?.message).toBeUndefined();

    for (const [id, agency] of [
      [leadA, agencyA],
      [leadB, agencyB],
    ] as const) {
      const { error } = await admin.from("leads").upsert({
        id,
        name: "Lead Demands Probe",
        email: `${id}@revolis.test`,
        agency_id: agency,
        status: "Nový",
      });
      expect(error?.message).toBeUndefined();
    }

    const row = (agency: string, lead: string) => ({
      agency_id: agency,
      lead_id: lead,
      status: "ok",
      demand: DEMAND,
      extractor: "test",
    });
    const { data: planted, error: plantErr } = await admin
      .from("lead_demands")
      .insert([row(agencyA, leadA), row(agencyB, leadB)])
      .select("id, agency_id");
    expect(plantErr?.message).toBeUndefined();
    const idA = planted!.find((r) => r.agency_id === agencyA)!.id;
    const idB = planted!.find((r) => r.agency_id === agencyB)!.id;

    // 4. no unattributed rows, even for the service role
    const { error: nullErr } = await admin.from("lead_demands").insert({ ...row(agencyA, leadA), agency_id: null });
    expect(nullErr, "lead_demands accepted agency_id = NULL").toBeTruthy();

    const { error: signInErr } = await user.auth.signInWithPassword({ email, password });
    expect(signInErr?.message).toBeUndefined();

    // 1. own rows visible
    const { data: own } = await user.from("lead_demands").select("id").eq("id", idA);
    expect(own ?? []).toHaveLength(1);

    // 2. foreign rows invisible
    const { data: foreign } = await user.from("lead_demands").select("id").eq("id", idB);
    expect(foreign ?? [], "tenant A read tenant B's demand").toHaveLength(0);

    // 3. no tenant writes, not even into its own agency
    const { error: insErr } = await user.from("lead_demands").insert(row(agencyA, leadA));
    expect(insErr, "authenticated could insert into lead_demands").toBeTruthy();
    const { data: upd } = await user
      .from("lead_demands")
      .update({ known_fields: 9 })
      .eq("id", idA)
      .select("id");
    expect(upd ?? [], "authenticated could update lead_demands").toHaveLength(0);

    await admin.from("lead_demands").delete().in("id", [idA, idB]);
    await admin.from("leads").delete().in("id", [leadA, leadB]);
  }, 120_000);
});
