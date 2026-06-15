import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

type EnvSet = {
  url: string;
  anon: string;
  service: string;
};

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

describe("enrichment_log RLS isolation (TEST_SUPABASE_*)", () => {
  it("allows own-tenant writes and blocks cross-tenant read/write for signed-in user", async () => {
    const { url, anon, service } = getRequiredTestEnv();
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const userClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });

    const agencyA = "a0000001-0001-4001-8001-000000000001";
    const agencyB = "a0000002-0002-4002-8002-000000000002";
    const userEmail = `rls-enrichment-a-${Date.now()}@revolis.test`;
    const userPassword = "RlsEnrichmentTest123!";
    const authUserId = randomUUID();
    const profileId = randomUUID();

    const { error: agencyAErr } = await admin.from("agencies").upsert({
      id: agencyA,
      name: "RLS Enrichment Agency A",
      slug: "rls-enrichment-a",
      city: "Bratislava",
      plan: "Team",
    });
    const { error: agencyBErr } = await admin.from("agencies").upsert({
      id: agencyB,
      name: "RLS Enrichment Agency B",
      slug: "rls-enrichment-b",
      city: "Kosice",
      plan: "Team",
    });
    expect(agencyAErr?.message).toBeUndefined();
    expect(agencyBErr?.message).toBeUndefined();

    const { error: createUserErr } = await admin.auth.admin.createUser({
      id: authUserId,
      email: userEmail,
      password: userPassword,
      email_confirm: true,
    });
    expect(createUserErr?.message).toBeUndefined();

    const { error: profileErr } = await admin.from("profiles").upsert({
      id: profileId,
      agency_id: agencyA,
      auth_user_id: authUserId,
      full_name: "RLS Enrichment Owner A",
      email: userEmail,
      role: "owner",
    });
    expect(profileErr?.message).toBeUndefined();

    const { error: signInErr } = await userClient.auth.signInWithPassword({
      email: userEmail,
      password: userPassword,
    });
    expect(signInErr?.message).toBeUndefined();

    const seedBId = randomUUID();
    const { error: seedBErr } = await admin.from("enrichment_log").insert({
      id: seedBId,
      agency_id: agencyB,
      record_id: "lead-b-1",
      record_type: "lead",
      field: "email",
      source: "seed",
      value: { normalized: "b@example.com" },
    });
    expect(seedBErr?.message).toBeUndefined();

    const ownInsertId = randomUUID();
    const { error: ownInsertErr } = await userClient.from("enrichment_log").insert({
      id: ownInsertId,
      agency_id: agencyA,
      record_id: "lead-a-1",
      record_type: "lead",
      field: "phone",
      source: "probe",
      value: { normalized: "+421900000000" },
    });
    expect(ownInsertErr?.message).toBeUndefined();

    const { data: leakedRows } = await userClient.from("enrichment_log").select("id").eq("id", seedBId);
    expect(leakedRows ?? []).toHaveLength(0);

    const { error: crossInsertErr } = await userClient.from("enrichment_log").insert({
      agency_id: agencyB,
      record_id: "lead-b-2",
      record_type: "lead",
      field: "email",
      source: "probe",
      value: { normalized: "cross@example.com" },
    });
    expect(crossInsertErr).toBeTruthy();
  });
});
