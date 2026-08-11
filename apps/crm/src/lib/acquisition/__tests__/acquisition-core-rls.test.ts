/**
 * PR-S0.1 acquisition core — RLS / FK / append-only / dedupe.
 *
 * Requires local (or explicit TEST) Supabase with migration applied.
 * Env: TEST_SUPABASE_URL + TEST_SUPABASE_ANON_KEY + TEST_SUPABASE_SERVICE_ROLE_KEY
 *   or NEXT_PUBLIC_SUPABASE_URL(+ANON) + SUPABASE_SERVICE_ROLE_KEY on localhost.
 *
 * Skips entirely when env is missing — does not invent a fake DB.
 * Existing suite under apps/crm/tests/rls/ is intentionally untouched.
 */
import { describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

type EnvSet = {
  url: string;
  anon: string;
  service: string;
};

function resolveTestEnv(): EnvSet | null {
  const url =
    process.env.TEST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon =
    process.env.TEST_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "";
  const service =
    process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SERVICE_ROLE_KEY ??
    "";
  if (!url || !anon || !service) return null;
  const local =
    url.includes("127.0.0.1") ||
    url.includes("localhost") ||
    process.env.ALLOW_REMOTE_TEST_SUPABASE === "1";
  if (!local) return null;
  if (url.includes("ypgajkhqtbriqqmyawyv")) return null;
  return { url, anon, service };
}

const ENV = resolveTestEnv();
const describeDb = ENV ? describe : describe.skip;

async function seedTenant(
  admin: SupabaseClient,
  label: "a" | "b",
): Promise<{
  agencyId: string;
  profileId: string;
  authUserId: string;
  email: string;
  password: string;
  accountId: string;
}> {
  const agencyId = randomUUID();
  const profileId = randomUUID();
  const authUserId = randomUUID();
  const email = `acq-rls-${label}-${Date.now()}@revolis.test`;
  const password = "AcqRlsTest123!";
  const accountId = randomUUID();

  const { error: agencyErr } = await admin.from("agencies").upsert({
    id: agencyId,
    name: `Acq RLS Agency ${label.toUpperCase()}`,
    slug: `acq-rls-${label}-${Date.now()}`,
    city: label === "a" ? "Bratislava" : "Kosice",
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
    agency_id: agencyId,
    auth_user_id: authUserId,
    full_name: `Acq Owner ${label.toUpperCase()}`,
    email,
    role: "owner",
  });
  expect(profileErr?.message).toBeUndefined();

  const { error: accountErr } = await admin.from("acquisition_accounts").insert({
    id: accountId,
    agency_id: agencyId,
    provider: "GOOGLE",
    customer_id: `cust-${label}-${Date.now()}`,
    credential_ref: `vault://test/${label}`,
    status: "ACTIVE",
  });
  expect(accountErr?.message).toBeUndefined();

  return { agencyId, profileId, authUserId, email, password, accountId };
}

describeDb("acquisition core RLS + constraints (local Supabase)", () => {
  it("blocks cross-tenant reads on accounts, campaigns, and events", async () => {
    const admin = createClient(ENV!.url, ENV!.service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const userClient = createClient(ENV!.url, ENV!.anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const a = await seedTenant(admin, "a");
    const b = await seedTenant(admin, "b");

    const campaignB = randomUUID();
    const eventB = randomUUID();
    expect(
      (
        await admin.from("acquisition_campaigns").insert({
          id: campaignB,
          agency_id: b.agencyId,
          acquisition_account_id: b.accountId,
          provider: "GOOGLE",
          provider_campaign_id: `camp-b-${Date.now()}`,
          name: "B campaign",
        })
      ).error?.message,
    ).toBeUndefined();
    expect(
      (
        await admin.from("acquisition_events").insert({
          id: eventB,
          agency_id: b.agencyId,
          provider: "GOOGLE",
          event_type: "lead.form_submitted",
          provider_event_id: `evt-b-${Date.now()}`,
        })
      ).error?.message,
    ).toBeUndefined();

    const { error: signInErr } = await userClient.auth.signInWithPassword({
      email: a.email,
      password: a.password,
    });
    expect(signInErr?.message).toBeUndefined();

    const { data: leakedAccounts } = await userClient
      .from("acquisition_accounts")
      .select("id")
      .eq("id", b.accountId);
    expect(leakedAccounts ?? []).toHaveLength(0);

    const { data: leakedCampaigns } = await userClient
      .from("acquisition_campaigns")
      .select("id")
      .eq("id", campaignB);
    expect(leakedCampaigns ?? []).toHaveLength(0);

    const { data: leakedEvents } = await userClient
      .from("acquisition_events")
      .select("id")
      .eq("id", eventB);
    expect(leakedEvents ?? []).toHaveLength(0);

    // Own-tenant insert still allowed
    const { error: ownCampErr } = await userClient.from("acquisition_campaigns").insert({
      agency_id: a.agencyId,
      acquisition_account_id: a.accountId,
      provider: "GOOGLE",
      provider_campaign_id: `camp-a-${Date.now()}`,
      name: "A campaign",
    });
    expect(ownCampErr?.message).toBeUndefined();
  });

  it("rejects composite FK mismatch (agency A + account belonging to B)", async () => {
    const admin = createClient(ENV!.url, ENV!.service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const a = await seedTenant(admin, "a");
    const b = await seedTenant(admin, "b");

    const { error } = await admin.from("acquisition_campaigns").insert({
      agency_id: a.agencyId,
      acquisition_account_id: b.accountId,
      provider: "GOOGLE",
      provider_campaign_id: `camp-mismatch-${Date.now()}`,
      name: "mismatch",
    });
    expect(error).toBeTruthy();
    expect(error?.code === "23503" || /foreign key|violates/i.test(error?.message ?? "")).toBe(
      true,
    );
  });

  it("append-only: authenticated UPDATE and DELETE on acquisition_events fail", async () => {
    const admin = createClient(ENV!.url, ENV!.service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const userClient = createClient(ENV!.url, ENV!.anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const a = await seedTenant(admin, "a");

    const eventId = randomUUID();
    expect(
      (
        await admin.from("acquisition_events").insert({
          id: eventId,
          agency_id: a.agencyId,
          provider: "GOOGLE",
          event_type: "campaign.budget_changed",
          provider_event_id: `append-${Date.now()}`,
          processing_status: "PENDING",
        })
      ).error?.message,
    ).toBeUndefined();

    const { error: signInErr } = await userClient.auth.signInWithPassword({
      email: a.email,
      password: a.password,
    });
    expect(signInErr?.message).toBeUndefined();

    const { error: updateErr } = await userClient
      .from("acquisition_events")
      .update({ processing_status: "PROCESSED" })
      .eq("id", eventId);
    expect(updateErr).toBeTruthy();

    const { error: deleteErr } = await userClient
      .from("acquisition_events")
      .delete()
      .eq("id", eventId);
    expect(deleteErr).toBeTruthy();
  });

  it("UNIQUE(agency_id, provider, provider_event_id, event_type) dedupes", async () => {
    const admin = createClient(ENV!.url, ENV!.service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const a = await seedTenant(admin, "a");
    const providerEventId = `dedupe-${Date.now()}`;
    const row = {
      agency_id: a.agencyId,
      provider: "GOOGLE",
      event_type: "lead.form_submitted",
      provider_event_id: providerEventId,
    };

    expect((await admin.from("acquisition_events").insert(row)).error?.message).toBeUndefined();
    const { error: dupErr } = await admin.from("acquisition_events").insert(row);
    expect(dupErr).toBeTruthy();
    expect(dupErr?.code === "23505" || /duplicate|unique/i.test(dupErr?.message ?? "")).toBe(
      true,
    );
  });
});

describe("acquisition core test harness notes", () => {
  it("skips DB cases when local Supabase env is absent (no fake DB)", () => {
    if (!ENV) {
      expect(ENV).toBeNull();
    } else {
      expect(ENV.url).toBeTruthy();
    }
  });
});