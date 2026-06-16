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
      "Missing TEST_SUPABASE_URL / TEST_SUPABASE_ANON_KEY / TEST_SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (url.includes("ypgajkhqtbriqqmyawyv")) {
    throw new Error(`Refusing to run RLS test on production URL: ${url}`);
  }
  return { url, anon, service };
}

describe("realsoft_import_logs RLS isolation (TEST_SUPABASE_*)", () => {
  it("allows own-tenant insert/read and blocks cross-tenant read/insert", async () => {
    const { url, anon, service } = getRequiredTestEnv();
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const userClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });

    const agencyA = "a0000001-0001-4001-8001-000000000001";
    const agencyB = "a0000002-0002-4002-8002-000000000002";
    const userEmail = `rls-realsoft-a-${Date.now()}@revolis.test`;
    const userPassword = "RlsRealsoftTest123!";
    const authUserId = randomUUID();
    const profileId = randomUUID();

    await admin.from("agencies").upsert({
      id: agencyA,
      name: "RLS Realsoft Agency A",
      slug: "rls-realsoft-a",
      city: "Bratislava",
      plan: "Team",
    });
    await admin.from("agencies").upsert({
      id: agencyB,
      name: "RLS Realsoft Agency B",
      slug: "rls-realsoft-b",
      city: "Kosice",
      plan: "Team",
    });

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
      full_name: "RLS Realsoft Owner A",
      email: userEmail,
      role: "owner",
    });
    expect(profileErr?.message).toBeUndefined();

    const { error: signInErr } = await userClient.auth.signInWithPassword({
      email: userEmail,
      password: userPassword,
    });
    expect(signInErr?.message).toBeUndefined();

    const foreignLogId = randomUUID();
    const foreignExternalId = `foreign-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const { error: seedForeignErr } = await admin.from("realsoft_import_logs").insert({
      id: foreignLogId,
      agency_id: agencyB,
      action: 1,
      external_id: foreignExternalId,
      raw_payload: { source: "seed" },
      unmapped: {},
    });
    expect(seedForeignErr?.message).toBeUndefined();

    const { error: ownInsertErr } = await userClient.from("realsoft_import_logs").insert({
      agency_id: agencyA,
      action: 1,
      external_id: `own-${Date.now()}`,
      raw_payload: { source: "probe" },
      unmapped: {},
    });
    expect(ownInsertErr?.message).toBeUndefined();

    const { data: leakedRows } = await userClient
      .from("realsoft_import_logs")
      .select("id")
      .eq("id", foreignLogId);
    expect(leakedRows ?? []).toHaveLength(0);

    const { error: crossInsertErr } = await userClient.from("realsoft_import_logs").insert({
      agency_id: agencyB,
      action: 2,
      external_id: `cross-${Date.now()}`,
      raw_payload: { source: "probe" },
      unmapped: {},
    });
    expect(crossInsertErr).toBeTruthy();
  });
});

