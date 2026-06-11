import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

/** Deterministic IDs for reproducible RLS isolation tests */
export const RLS_FIXTURE = {
  agencyA: "a0000001-0001-4001-8001-000000000001",
  agencyB: "a0000002-0002-4002-8002-000000000002",
  teamA: "b0000001-0001-4001-8001-000000000001",
  teamB: "b0000002-0002-4002-8002-000000000002",
  ownerA: "c0000001-0001-4001-8001-000000000001",
  ownerB: "c0000002-0002-4002-8002-000000000002",
  brokerA: "c0000003-0003-4003-8003-000000000003",
  brokerB: "c0000004-0004-4004-8004-000000000004",
  leadA: "rls-lead-a-0001",
  leadB: "rls-lead-b-0001",
  propertyA: "rls-prop-a-0001",
  propertyB: "rls-prop-b-0001",
  emails: {
    ownerA: "rls-a-owner@revolis.test",
    ownerB: "rls-b-owner@revolis.test",
    brokerA: "rls-a-broker@revolis.test",
    brokerB: "rls-b-broker@revolis.test",
  },
  password: "RlsIsolationTest123!",
} as const;

export type FixtureRowMap = Record<string, { id: string; [key: string]: unknown }>;

export interface RlsFixtureContext {
  admin: SupabaseClient;
  rows: FixtureRowMap;
  authUserIds: {
    ownerA: string;
    ownerB: string;
    brokerA: string;
    brokerB: string;
  };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} for RLS fixture seed`);
  return v;
}

export function createServiceClient(): SupabaseClient {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SERVICE_ROLE_KEY ??
    process.env.SECRET_KEY;
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for RLS fixture seed");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function ensureAuthUser(
  admin: SupabaseClient,
  email: string,
  password: string,
): Promise<string> {
  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existing = listed?.users?.find((u) => u.email === email);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
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

async function upsertRow(
  admin: SupabaseClient,
  table: string,
  row: Record<string, unknown>,
  onConflict?: string,
): Promise<void> {
  const q = admin.from(table).upsert(row, onConflict ? { onConflict } : undefined);
  const { error } = await q;
  if (error) throw new Error(`seed ${table}: ${error.message}`);
}

export async function seedRlsFixtures(admin: SupabaseClient): Promise<RlsFixtureContext> {
  const f = RLS_FIXTURE;
  const authUserIds = {
    ownerA: await ensureAuthUser(admin, f.emails.ownerA, f.password),
    ownerB: await ensureAuthUser(admin, f.emails.ownerB, f.password),
    brokerA: await ensureAuthUser(admin, f.emails.brokerA, f.password),
    brokerB: await ensureAuthUser(admin, f.emails.brokerB, f.password),
  };

  const rows: FixtureRowMap = {};

  await upsertRow(admin, "agencies", {
    id: f.agencyA,
    name: "RLS Test Agency A",
    slug: "rls-test-a",
    city: "Bratislava",
    plan: "Team",
  });
  await upsertRow(admin, "agencies", {
    id: f.agencyB,
    name: "RLS Test Agency B",
    slug: "rls-test-b",
    city: "Košice",
    plan: "Team",
  });
  rows.agencies_a = { id: f.agencyA };
  rows.agencies_b = { id: f.agencyB };

  await upsertRow(admin, "teams", { id: f.teamA, agency_id: f.agencyA, name: "Team A" });
  await upsertRow(admin, "teams", { id: f.teamB, agency_id: f.agencyB, name: "Team B" });
  rows.teams_a = { id: f.teamA, agency_id: f.agencyA };
  rows.teams_b = { id: f.teamB, agency_id: f.agencyB };

  const profileRows = [
    {
      id: f.ownerA,
      agency_id: f.agencyA,
      team_id: f.teamA,
      auth_user_id: authUserIds.ownerA,
      full_name: "Owner A",
      email: f.emails.ownerA,
      role: "owner",
    },
    {
      id: f.brokerA,
      agency_id: f.agencyA,
      team_id: f.teamA,
      auth_user_id: authUserIds.brokerA,
      full_name: "Broker A",
      email: f.emails.brokerA,
      role: "agent",
    },
    {
      id: f.ownerB,
      agency_id: f.agencyB,
      team_id: f.teamB,
      auth_user_id: authUserIds.ownerB,
      full_name: "Owner B",
      email: f.emails.ownerB,
      role: "owner",
    },
    {
      id: f.brokerB,
      agency_id: f.agencyB,
      team_id: f.teamB,
      auth_user_id: authUserIds.brokerB,
      full_name: "Broker B",
      email: f.emails.brokerB,
      role: "agent",
    },
  ];
  for (const p of profileRows) {
    await upsertRow(admin, "profiles", p);
  }
  rows.profiles_a = { id: f.ownerA, agency_id: f.agencyA };
  rows.profiles_b = { id: f.ownerB, agency_id: f.agencyB };

  await upsertRow(admin, "leads", {
    id: f.leadA,
    name: "Lead A",
    email: "lead-a@rls.test",
    agency_id: f.agencyA,
    team_id: f.teamA,
    assigned_profile_id: f.brokerA,
    status: "Nový",
  });
  await upsertRow(admin, "leads", {
    id: f.leadB,
    name: "Lead B",
    email: "lead-b@rls.test",
    agency_id: f.agencyB,
    team_id: f.teamB,
    assigned_profile_id: f.brokerB,
    status: "Nový",
  });
  rows.leads_a = { id: f.leadA, agency_id: f.agencyA };
  rows.leads_b = { id: f.leadB, agency_id: f.agencyB };

  await upsertRow(admin, "properties", {
    id: f.propertyA,
    title: "Property A",
    location: "BA",
    price: 200000,
    agency_id: f.agencyA,
  });
  await upsertRow(admin, "properties", {
    id: f.propertyB,
    title: "Property B",
    location: "KE",
    price: 150000,
    agency_id: f.agencyB,
  });
  rows.properties_a = { id: f.propertyA, agency_id: f.agencyA };
  rows.properties_b = { id: f.propertyB, agency_id: f.agencyB };

  const activityA = randomUUID();
  const activityB = randomUUID();
  await upsertRow(admin, "activities", {
    id: activityA,
    lead_id: f.leadA,
    type: "Hovor",
    text: "RLS test activity A",
    profile_id: f.brokerA,
  });
  await upsertRow(admin, "activities", {
    id: activityB,
    lead_id: f.leadB,
    type: "Hovor",
    text: "RLS test activity B",
    profile_id: f.brokerB,
  });
  rows.activities_a = { id: activityA, lead_id: f.leadA };
  rows.activities_b = { id: activityB, lead_id: f.leadB };

  const taskA = randomUUID();
  const taskB = randomUUID();
  await upsertRow(admin, "tasks", {
    id: taskA,
    lead_id: f.leadA,
    assigned_profile_id: f.brokerA,
    title: "Task A",
  });
  await upsertRow(admin, "tasks", {
    id: taskB,
    lead_id: f.leadB,
    assigned_profile_id: f.brokerB,
    title: "Task B",
  });
  rows.tasks_a = { id: taskA, lead_id: f.leadA };
  rows.tasks_b = { id: taskB, lead_id: f.leadB };

  const recA = randomUUID();
  const recB = randomUUID();
  await upsertRow(admin, "ai_recommendations", {
    id: recA,
    lead_id: f.leadA,
    title: "Rec A",
  });
  await upsertRow(admin, "ai_recommendations", {
    id: recB,
    lead_id: f.leadB,
    title: "Rec B",
  });
  rows.ai_recommendations_a = { id: recA, lead_id: f.leadA };
  rows.ai_recommendations_b = { id: recB, lead_id: f.leadB };

  const matchA = randomUUID();
  const matchB = randomUUID();
  await upsertRow(admin, "lead_property_matches", {
    id: matchA,
    lead_id: f.leadA,
    property_id: f.propertyA,
    property_title: "Property A",
    score: 80,
  });
  await upsertRow(admin, "lead_property_matches", {
    id: matchB,
    lead_id: f.leadB,
    property_id: f.propertyB,
    property_title: "Property B",
    score: 75,
  });
  rows.lead_property_matches_a = { id: matchA, lead_id: f.leadA };
  rows.lead_property_matches_b = { id: matchB, lead_id: f.leadB };

  await seedAgencyScopedTable(admin, rows, "lead_events", f.agencyA, f.agencyB, f.leadA, f.leadB, {
    type: "status_change",
    value: "Nový",
  });
  await seedAgencyScopedTable(admin, rows, "lead_scores", f.agencyA, f.agencyB, f.leadA, f.leadB, {
    score: 70,
    risk_score: 10,
  });
  await seedAgencyScopedTable(admin, rows, "client_dna", f.agencyA, f.agencyB, f.leadA, f.leadB, {
    type: "buyer",
    price_sensitivity: 50,
    decision_speed: 50,
  });
  await seedAgencyScopedTable(admin, rows, "deal_risk", f.agencyA, f.agencyB, f.leadA, f.leadB, {
    risk_level: 20,
    reason: "rls_test",
  });
  await seedAgencyScopedTable(admin, rows, "deal_moments", f.agencyA, f.agencyB, f.leadA, f.leadB, {
    is_hot: false,
    trigger: "viewing",
  });
  await seedAgencyScopedTable(admin, rows, "ai_actions", f.agencyA, f.agencyB, f.leadA, f.leadB, {
    action: "call",
    reason: "rls_test",
  });
  await seedAgencyScopedTable(admin, rows, "lead_action_scores", f.agencyA, f.agencyB, f.leadA, f.leadB, {
    who: "broker",
    what: "call",
    when: "today",
  });
  await seedAgencyScopedTable(admin, rows, "lead_closing_windows", f.agencyA, f.agencyB, f.leadA, f.leadB, {
    min_days: 7,
    max_days: 14,
    confidence: 0.5,
  });
  await seedAgencyScopedTable(admin, rows, "lead_rescue_runs", f.agencyA, f.agencyB, f.leadA, f.leadB, {
    trigger_type: "risk",
    status: "pending",
  });
  await seedAgencyScopedTable(admin, rows, "lead_micro_actions", f.agencyA, f.agencyB, f.leadA, f.leadB, {
    action_type: "sms",
    status: "scheduled",
  });
  await seedAgencyScopedTable(admin, rows, "ai_action_audit", f.agencyA, f.agencyB, f.leadA, f.leadB, {
    action_kind: "draft",
    channel: "email",
    profile_id: f.brokerA,
  });
  await seedAgencyScopedTable(admin, rows, "ai_sourced_deals", f.agencyA, f.agencyB, f.leadA, f.leadB, {
    status: "open",
    ai_attribution_score: 0.8,
  });

  const schedA = randomUUID();
  const schedB = randomUUID();
  const now = new Date();
  const later = new Date(now.getTime() + 3600000);
  await upsertRow(admin, "scheduled_events", {
    id: schedA,
    agency_id: f.agencyA,
    profile_id: f.brokerA,
    lead_id: f.leadA,
    title: "Viewing A",
    starts_at: now.toISOString(),
    ends_at: later.toISOString(),
  });
  await upsertRow(admin, "scheduled_events", {
    id: schedB,
    agency_id: f.agencyB,
    profile_id: f.brokerB,
    lead_id: f.leadB,
    title: "Viewing B",
    starts_at: now.toISOString(),
    ends_at: later.toISOString(),
  });
  rows.scheduled_events_a = { id: schedA, agency_id: f.agencyA };
  rows.scheduled_events_b = { id: schedB, agency_id: f.agencyB };

  const notifA = randomUUID();
  const notifB = randomUUID();
  await upsertRow(admin, "routine_notifications", {
    id: notifA,
    agency_id: f.agencyA,
    profile_id: f.brokerA,
    type: "seller_rescue",
    title: "Notif A",
  });
  await upsertRow(admin, "routine_notifications", {
    id: notifB,
    agency_id: f.agencyB,
    profile_id: f.brokerB,
    type: "seller_rescue",
    title: "Notif B",
  });
  rows.routine_notifications_a = { id: notifA, agency_id: f.agencyA };
  rows.routine_notifications_b = { id: notifB, agency_id: f.agencyB };

  const ledgerA = randomUUID();
  const ledgerB = randomUUID();
  await upsertRow(admin, "credit_ledger", {
    id: ledgerA,
    agency_id: f.agencyA,
    delta: 100,
    reason: "rls_test_grant",
    idempotency_key: `rls-test-a-${ledgerA}`,
    source: "grant",
  });
  await upsertRow(admin, "credit_ledger", {
    id: ledgerB,
    agency_id: f.agencyB,
    delta: 100,
    reason: "rls_test_grant",
    idempotency_key: `rls-test-b-${ledgerB}`,
    source: "grant",
  });
  rows.credit_ledger_a = { id: ledgerA, agency_id: f.agencyA };
  rows.credit_ledger_b = { id: ledgerB, agency_id: f.agencyB };

  await upsertRow(admin, "dashboard_insights_cache", {
    agency_id: f.agencyA,
    payload: { rls: "a" },
    generated_at: now.toISOString(),
  });
  await upsertRow(admin, "dashboard_insights_cache", {
    agency_id: f.agencyB,
    payload: { rls: "b" },
    generated_at: now.toISOString(),
  });
  rows.dashboard_insights_cache_a = { id: f.agencyA, agency_id: f.agencyA };
  rows.dashboard_insights_cache_b = { id: f.agencyB, agency_id: f.agencyB };

  const jobA = randomUUID();
  const jobB = randomUUID();
  await upsertRow(admin, "import_jobs", {
    id: jobA,
    agency_id: f.agencyA,
    source_system: "generic_csv",
    status: "done",
    file_name: "a.csv",
  });
  await upsertRow(admin, "import_jobs", {
    id: jobB,
    agency_id: f.agencyB,
    source_system: "generic_csv",
    status: "done",
    file_name: "b.csv",
  });
  rows.import_jobs_a = { id: jobA, agency_id: f.agencyA };
  rows.import_jobs_b = { id: jobB, agency_id: f.agencyB };

  const rowA = randomUUID();
  const rowB = randomUUID();
  await upsertRow(admin, "import_rows", {
    id: rowA,
    agency_id: f.agencyA,
    job_id: jobA,
    row_number: 1,
    raw_data: {},
    status: "imported",
  });
  await upsertRow(admin, "import_rows", {
    id: rowB,
    agency_id: f.agencyB,
    job_id: jobB,
    row_number: 1,
    raw_data: {},
    status: "imported",
  });
  rows.import_rows_a = { id: rowA, agency_id: f.agencyA };
  rows.import_rows_b = { id: rowB, agency_id: f.agencyB };

  await seedProfileScoped(admin, rows, "morning_brief_settings", f.brokerA, f.brokerB, {
    enabled: true,
    send_hour: 7,
  });
  await seedProfileScoped(admin, rows, "morning_briefs", f.brokerA, f.brokerB, {
    brief_text: "RLS test brief",
  });
  await seedProfileScoped(admin, rows, "profile_integrations", f.brokerA, f.brokerB, {
    provider: "google",
    status: "active",
  });
  await seedProfileScoped(admin, rows, "outreach_campaigns", f.brokerA, f.brokerB, {
    name: "Campaign",
    status: "draft",
  });
  await seedProfileScoped(admin, rows, "outreach_segments", f.brokerA, f.brokerB, {
    name: "Segment",
    filters: {},
  });
  await seedProfileScoped(admin, rows, "outreach_templates", f.brokerA, f.brokerB, {
    name: "Template",
    subject: "Subj",
    body: "Body",
  });
  await seedProfileScoped(admin, rows, "events", f.brokerA, f.brokerB, {
    entity_type: "lead",
    event_type: "lead.created",
    payload: {},
  });
  await seedProfileScoped(admin, rows, "integrity_alerts", f.brokerA, f.brokerB, {
    alert_type: "mass_view",
    threshold_hit: 1,
  });
  await seedProfileScoped(admin, rows, "bri_score_history", f.brokerA, f.brokerB, {
    lead_id: f.leadA,
    score: 50,
    trigger_event: "rls_test",
  });
  await seedProfileScoped(admin, rows, "bri_config", f.brokerA, f.brokerB, {});
  await seedUserScoped(admin, rows, "lead_conversions", authUserIds.brokerA, authUserIds.brokerB, {
    stage_name: "qualified",
    conversion_rate: 10,
    sample_size: 5,
  });
  await seedUserScoped(admin, rows, "broker_performance_stats", authUserIds.brokerA, authUserIds.brokerB, {
    week_number: 10,
    follow_up_consistency: 0.8,
    avg_deal_velocity_days: 14,
  });
  await seedProfileScoped(admin, rows, "watched_parcels", f.brokerA, f.brokerB, {
    parcel_id: "parcel-rls-a",
    watch_label: "Parcel A",
  });
  await seedProfileScoped(admin, rows, "property_price_trail", f.brokerA, f.brokerB, {
    property_id: f.propertyA,
    price: 200000,
  });
  await seedProfileScoped(admin, rows, "seller_motivation", f.brokerA, f.brokerB, {
    property_id: f.propertyA,
    motivation_score: 50,
  });
  await seedProfileScoped(admin, rows, "price_alerts", f.brokerA, f.brokerB, {
    property_id: f.propertyA,
    watch_type: "any_drop",
  });
  await seedProfileScoped(admin, rows, "arbitrage_config", f.brokerA, f.brokerB, {
    enabled: false,
    config: {},
  });
  await seedProfileScoped(admin, rows, "arbitrage_matches", f.brokerA, f.brokerB, {
    status: "new",
    score: 0.5,
  });

  const outreachA = randomUUID();
  const outreachB = randomUUID();
  await upsertRow(admin, "outreach_logs", {
    id: outreachA,
    lead_id: f.leadA,
    channel: "email",
    status: "sent",
  });
  await upsertRow(admin, "outreach_logs", {
    id: outreachB,
    lead_id: f.leadB,
    channel: "email",
    status: "sent",
  });
  rows.outreach_logs_a = { id: outreachA, lead_id: f.leadA };
  rows.outreach_logs_b = { id: outreachB, lead_id: f.leadB };

  const notA = randomUUID();
  const notB = randomUUID();
  await upsertRow(admin, "notifications", {
    id: notA,
    user_id: authUserIds.brokerA,
    type: "coaching",
    content: "Notification A",
  });
  await upsertRow(admin, "notifications", {
    id: notB,
    user_id: authUserIds.brokerB,
    type: "coaching",
    content: "Notification B",
  });
  rows.notifications_a = { id: notA, user_id: authUserIds.brokerA };
  rows.notifications_b = { id: notB, user_id: authUserIds.brokerB };

  const pushA = randomUUID();
  const pushB = randomUUID();
  await upsertRow(admin, "push_subscriptions", {
    id: pushA,
    user_id: authUserIds.brokerA,
    endpoint: `https://push.test/a/${pushA}`,
    p256dh: "key-a",
    auth: "auth-a",
  });
  await upsertRow(admin, "push_subscriptions", {
    id: pushB,
    user_id: authUserIds.brokerB,
    endpoint: `https://push.test/b/${pushB}`,
    p256dh: "key-b",
    auth: "auth-b",
  });
  rows.push_subscriptions_a = { id: pushA, user_id: authUserIds.brokerA };
  rows.push_subscriptions_b = { id: pushB, user_id: authUserIds.brokerB };

  const brokerProfA = randomUUID();
  const brokerProfB = randomUUID();
  await upsertRow(admin, "broker_profiles", {
    id: brokerProfA,
    user_id: authUserIds.brokerA,
    profile_id: f.brokerA,
    slug: `rls-broker-a-${brokerProfA.slice(0, 8)}`,
    display_name: "Broker A Public",
    is_public: false,
  });
  await upsertRow(admin, "broker_profiles", {
    id: brokerProfB,
    user_id: authUserIds.brokerB,
    profile_id: f.brokerB,
    slug: `rls-broker-b-${brokerProfB.slice(0, 8)}`,
    display_name: "Broker B Public",
    is_public: false,
  });
  rows.broker_profiles_a = { id: brokerProfA, user_id: authUserIds.brokerA };
  rows.broker_profiles_b = { id: brokerProfB, user_id: authUserIds.brokerB };

  const brokerEvA = randomUUID();
  const brokerEvB = randomUUID();
  await upsertRow(admin, "broker_events", {
    id: brokerEvA,
    user_id: authUserIds.brokerA,
    profile_id: f.brokerA,
    event_type: "message_received",
    lead_id: f.leadA,
  });
  await upsertRow(admin, "broker_events", {
    id: brokerEvB,
    user_id: authUserIds.brokerB,
    profile_id: f.brokerB,
    event_type: "message_received",
    lead_id: f.leadB,
  });
  rows.broker_events_a = { id: brokerEvA, user_id: authUserIds.brokerA };
  rows.broker_events_b = { id: brokerEvB, user_id: authUserIds.brokerB };

  await seedProfileScoped(admin, rows, "demand_signals", f.brokerA, f.brokerB, {
    lat: 48.1486,
    lng: 17.1077,
    city: "Bratislava",
  });
  await seedCompetitorActivityLogs(admin, rows, f.brokerA, f.brokerB);
  await seedProfileScoped(admin, rows, "strategic_alerts", f.brokerA, f.brokerB, {
    title: "Strategic alert",
    description: "RLS test alert",
    type: "competitor",
  });

  const stealthA = randomUUID();
  const stealthB = randomUUID();
  await upsertRow(admin, "stealth_recruiter_prospects", {
    id: stealthA,
    agency_id: f.agencyA,
    address: "RLS Stealth Address A",
  });
  await upsertRow(admin, "stealth_recruiter_prospects", {
    id: stealthB,
    agency_id: f.agencyB,
    address: "RLS Stealth Address B",
  });
  rows.stealth_recruiter_prospects_a = { id: stealthA, agency_id: f.agencyA };
  rows.stealth_recruiter_prospects_b = { id: stealthB, agency_id: f.agencyB };

  await upsertRow(admin, "profile_google_calendar", {
    profile_id: f.brokerA,
    refresh_token: "rls-test-refresh-a",
  });
  await upsertRow(admin, "profile_google_calendar", {
    profile_id: f.brokerB,
    refresh_token: "rls-test-refresh-b",
  });
  rows.profile_google_calendar_a = { id: f.brokerA, profile_id: f.brokerA };
  rows.profile_google_calendar_b = { id: f.brokerB, profile_id: f.brokerB };

  return { admin, rows, authUserIds };
}

async function seedUserScoped(
  admin: SupabaseClient,
  rows: FixtureRowMap,
  table: string,
  userA: string,
  userB: string,
  extra: Record<string, unknown>,
): Promise<void> {
  const idA = randomUUID();
  const idB = randomUUID();
  const userColumn = table === "lead_conversions" || table === "broker_performance_stats" ? "broker_id" : "user_id";
  try {
    await upsertRow(admin, table, { id: idA, [userColumn]: userA, ...extra });
    await upsertRow(admin, table, { id: idB, [userColumn]: userB, ...extra });
    rows[`${table}_a`] = { id: idA, [userColumn]: userA };
    rows[`${table}_b`] = { id: idB, [userColumn]: userB };
  } catch (e) {
    rows[`${table}_a`] = { id: idA, [userColumn]: userA, _seedError: String(e) };
    rows[`${table}_b`] = { id: idB, [userColumn]: userB, _seedError: String(e) };
  }
}

async function seedCompetitorActivityLogs(
  admin: SupabaseClient,
  rows: FixtureRowMap,
  profileA: string,
  profileB: string,
): Promise<void> {
  const compA = randomUUID();
  const compB = randomUUID();
  const logA = randomUUID();
  const logB = randomUUID();
  try {
    await upsertRow(admin, "competitor_monitoring", {
      id: compA,
      profile_id: profileA,
      target_rk_name: "Monitor A",
      base_inventory_count: 5,
    });
    await upsertRow(admin, "competitor_monitoring", {
      id: compB,
      profile_id: profileB,
      target_rk_name: "Monitor B",
      base_inventory_count: 5,
    });
    await upsertRow(admin, "competitor_activity_logs", {
      id: logA,
      competitor_id: compA,
      activity_type: "listing",
    });
    await upsertRow(admin, "competitor_activity_logs", {
      id: logB,
      competitor_id: compB,
      activity_type: "listing",
    });
    rows.competitor_activity_logs_a = { id: logA, competitor_id: compA };
    rows.competitor_activity_logs_b = { id: logB, competitor_id: compB };
    rows.competitor_monitoring_a = { id: compA, profile_id: profileA };
    rows.competitor_monitoring_b = { id: compB, profile_id: profileB };
  } catch (e) {
    rows.competitor_activity_logs_a = { id: logA, competitor_id: compA, _seedError: String(e) };
    rows.competitor_activity_logs_b = { id: logB, competitor_id: compB, _seedError: String(e) };
  }
}

async function seedAgencyScopedTable(
  admin: SupabaseClient,
  rows: FixtureRowMap,
  table: string,
  agencyA: string,
  agencyB: string,
  leadA: string,
  leadB: string,
  extra: Record<string, unknown>,
): Promise<void> {
  const idA = randomUUID();
  const idB = randomUUID();
  const baseA: Record<string, unknown> = { id: idA, agency_id: agencyA, ...extra };
  const baseB: Record<string, unknown> = { id: idB, agency_id: agencyB, ...extra };
  if ("lead_id" in extra || table.includes("lead")) {
    baseA.lead_id = leadA;
    baseB.lead_id = leadB;
  }
  try {
    await upsertRow(admin, table, baseA);
    await upsertRow(admin, table, baseB);
    rows[`${table}_a`] = { id: idA, agency_id: agencyA };
    rows[`${table}_b`] = { id: idB, agency_id: agencyB };
  } catch (e) {
    // Table may have extra required columns — logged in test skip
    rows[`${table}_a`] = { id: idA, agency_id: agencyA, _seedError: String(e) };
    rows[`${table}_b`] = { id: idB, agency_id: agencyB, _seedError: String(e) };
  }
}

async function seedProfileScoped(
  admin: SupabaseClient,
  rows: FixtureRowMap,
  table: string,
  profileA: string,
  profileB: string,
  extra: Record<string, unknown>,
): Promise<void> {
  const idA = randomUUID();
  const idB = randomUUID();
  try {
    await upsertRow(admin, table, { id: idA, profile_id: profileA, ...extra });
    await upsertRow(admin, table, { id: idB, profile_id: profileB, ...extra });
    rows[`${table}_a`] = { id: idA, profile_id: profileA };
    rows[`${table}_b`] = { id: idB, profile_id: profileB };
  } catch (e) {
    rows[`${table}_a`] = { id: idA, profile_id: profileA, _seedError: String(e) };
    rows[`${table}_b`] = { id: idB, profile_id: profileB, _seedError: String(e) };
  }
}
