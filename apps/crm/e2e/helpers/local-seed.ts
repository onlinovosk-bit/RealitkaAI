import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleKey } from "./env-guard";

/** Stage 0 visible contract for tenant A. */
export const TENANT_A = {
  agencyId: "e28a0001-0001-4001-8001-000000000001",
  teamId: "e28a0001-0001-4001-8001-000000000011",
  profileId: "e28a0001-0001-4001-8001-000000000021",
  accountId: "e28a0001-0001-4001-8001-000000000031",
  email: "acq-e2e-a@revolis.test",
  customerId: "7024414113",
  campaigns: [
    {
      id: "e28a0001-0001-4001-8001-000000000041",
      providerCampaignId: "24134657673",
      name: "RKA-test-byty",
    },
    {
      id: "e28a0001-0001-4001-8001-000000000042",
      providerCampaignId: "24134894838",
      name: "RKB-test-domy",
    },
  ],
  events: [
    { id: "e28a0001-0001-4001-8001-000000000051", providerEventId: "e2e-logged-test-1" },
    { id: "e28a0001-0001-4001-8001-000000000052", providerEventId: "e2e-logged-test-2" },
    { id: "e28a0001-0001-4001-8001-000000000053", providerEventId: "e2e-logged-test-3" },
  ],
} as const;

/** Other tenant ? must not see TENANT_A rows. */
export const TENANT_B = {
  agencyId: "e28b0002-0002-4002-8002-000000000002",
  teamId: "e28b0002-0002-4002-8002-000000000012",
  profileId: "e28b0002-0002-4002-8002-000000000022",
  accountId: "e28b0002-0002-4002-8002-000000000032",
  email: "acq-e2e-b@revolis.test",
  customerId: "1999999999",
  campaign: {
    id: "e28b0002-0002-4002-8002-000000000043",
    providerCampaignId: "19999999991",
    name: "OTHER-tenant-campaign",
  },
  event: {
    id: "e28b0002-0002-4002-8002-000000000054",
    providerEventId: "e2e-other-tenant-event",
  },
} as const;

export type SeededTenants = {
  passwordA: string;
  passwordB: string;
};

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getServiceRoleKey();
  if (!url || !key) {
    throw new Error("adminClient requires NEXT_PUBLIC_SUPABASE_URL and a non-prod service role key");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function upsert(
  admin: SupabaseClient,
  table: string,
  row: Record<string, unknown>,
  onConflict?: string,
): Promise<void> {
  const { error } = await admin.from(table).upsert(row, onConflict ? { onConflict } : undefined);
  if (error) throw new Error(`seed ${table}: ${error.message}`);
}

async function ensureAuthUser(
  admin: SupabaseClient,
  email: string,
  password: string,
): Promise<string> {
  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existing = listed?.users?.find((user) => user.email === email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`updateUser ${email}: ${error.message}`);
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
  return data.user.id;
}

function localPassword(): string {
  return `e2e-local-${randomBytes(12).toString("base64url")}`;
}

/**
 * Throws if a globally-unique Google id already belongs to another agency.
 * Never steals Demo / production rows.
 */
async function assertUniqueOwnedByAgency(
  admin: SupabaseClient,
  table: "acquisition_accounts" | "acquisition_campaigns",
  column: "customer_id" | "provider_campaign_id",
  value: string,
  agencyId: string,
): Promise<void> {
  const { data, error } = await admin
    .from(table)
    .select(`id, agency_id, ${column}`)
    .eq("provider", "GOOGLE")
    .eq(column, value)
    .maybeSingle();
  if (error) throw new Error(`lookup ${table}.${column}=${value}: ${error.message}`);
  if (data && data.agency_id !== agencyId) {
    throw new Error(
      `BLOCKER: GOOGLE ${column} ${value} already belongs to agency ${data.agency_id}. ` +
        "Refusing to reassign. Use an empty local/CI DB or delete the colliding test row.",
    );
  }
}

export async function seedAcquisitionTenants(): Promise<SeededTenants> {
  const admin = adminClient();
  await assertUniqueOwnedByAgency(
    admin,
    "acquisition_accounts",
    "customer_id",
    TENANT_A.customerId,
    TENANT_A.agencyId,
  );
  await assertUniqueOwnedByAgency(
    admin,
    "acquisition_accounts",
    "customer_id",
    TENANT_B.customerId,
    TENANT_B.agencyId,
  );
  for (const campaign of TENANT_A.campaigns) {
    await assertUniqueOwnedByAgency(
      admin,
      "acquisition_campaigns",
      "provider_campaign_id",
      campaign.providerCampaignId,
      TENANT_A.agencyId,
    );
  }
  await assertUniqueOwnedByAgency(
    admin,
    "acquisition_campaigns",
    "provider_campaign_id",
    TENANT_B.campaign.providerCampaignId,
    TENANT_B.agencyId,
  );

  const passwordA = localPassword();
  const passwordB = localPassword();
  const authA = await ensureAuthUser(admin, TENANT_A.email, passwordA);
  const authB = await ensureAuthUser(admin, TENANT_B.email, passwordB);

  await upsert(admin, "agencies", {
    id: TENANT_A.agencyId,
    name: "Acquisition E2E Agency A",
    slug: "acq-e2e-a",
  });
  await upsert(admin, "agencies", {
    id: TENANT_B.agencyId,
    name: "Acquisition E2E Agency B",
    slug: "acq-e2e-b",
  });
  await upsert(admin, "teams", { id: TENANT_A.teamId, agency_id: TENANT_A.agencyId, name: "E2E Team A" });
  await upsert(admin, "teams", { id: TENANT_B.teamId, agency_id: TENANT_B.agencyId, name: "E2E Team B" });

  await upsert(admin, "profiles", {
    id: TENANT_A.profileId,
    agency_id: TENANT_A.agencyId,
    team_id: TENANT_A.teamId,
    auth_user_id: authA,
    full_name: "Acquisition E2E A",
    email: TENANT_A.email,
    role: "owner",
    is_active: true,
  });
  await upsert(admin, "profiles", {
    id: TENANT_B.profileId,
    agency_id: TENANT_B.agencyId,
    team_id: TENANT_B.teamId,
    auth_user_id: authB,
    full_name: "Acquisition E2E B",
    email: TENANT_B.email,
    role: "owner",
    is_active: true,
  });

  await upsert(admin, "acquisition_accounts", {
    id: TENANT_A.accountId,
    agency_id: TENANT_A.agencyId,
    provider: "GOOGLE",
    customer_id: TENANT_A.customerId,
    manager_customer_id: TENANT_A.customerId,
    status: "PENDING",
    credential_ref: "e2e:local-mock",
    credential_type: "SERVICE_ACCOUNT",
    billing_owner: "CLIENT",
    last_sync_at: "2026-08-15T12:00:00.000Z",
  });
  await upsert(admin, "acquisition_accounts", {
    id: TENANT_B.accountId,
    agency_id: TENANT_B.agencyId,
    provider: "GOOGLE",
    customer_id: TENANT_B.customerId,
    manager_customer_id: TENANT_B.customerId,
    status: "PENDING",
    credential_ref: "e2e:local-mock",
    credential_type: "SERVICE_ACCOUNT",
    billing_owner: "CLIENT",
  });

  for (const campaign of TENANT_A.campaigns) {
    await upsert(admin, "acquisition_campaigns", {
      id: campaign.id,
      agency_id: TENANT_A.agencyId,
      acquisition_account_id: TENANT_A.accountId,
      provider: "GOOGLE",
      provider_campaign_id: campaign.providerCampaignId,
      name: campaign.name,
      status: "PAUSED",
      last_synced_at: "2026-08-15T12:00:00.000Z",
    });
  }
  await upsert(admin, "acquisition_campaigns", {
    id: TENANT_B.campaign.id,
    agency_id: TENANT_B.agencyId,
    acquisition_account_id: TENANT_B.accountId,
    provider: "GOOGLE",
    provider_campaign_id: TENANT_B.campaign.providerCampaignId,
    name: TENANT_B.campaign.name,
    status: "ENABLED",
    last_synced_at: "2026-08-15T12:00:00.000Z",
  });

  for (const event of TENANT_A.events) {
    await upsert(admin, "acquisition_events", {
      id: event.id,
      agency_id: TENANT_A.agencyId,
      provider: "GOOGLE",
      event_type: "lead.form_submitted",
      provider_event_id: event.providerEventId,
      lead_id: null,
      processing_status: "LOGGED_TEST",
      received_at: "2026-08-15T16:38:02.000Z",
    });
  }
  await upsert(admin, "acquisition_events", {
    id: TENANT_B.event.id,
    agency_id: TENANT_B.agencyId,
    provider: "GOOGLE",
    event_type: "lead.form_submitted",
    provider_event_id: TENANT_B.event.providerEventId,
    lead_id: null,
    processing_status: "LOGGED_STAGE0",
    received_at: "2026-08-15T16:40:00.000Z",
  });

  return { passwordA, passwordB };
}
