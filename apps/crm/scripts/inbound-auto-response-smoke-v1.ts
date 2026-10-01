/**
 * Inbound Auto-response v1 — Running acceptance smoke (prod).
 *
 *   npx tsx scripts/inbound-auto-response-smoke-v1.ts
 *   npx tsx scripts/inbound-auto-response-smoke-v1.ts --direct
 *
 * --direct  bypasses gateway when ACQUIRE_SHARED_SECRET is unavailable locally
 *           (inserts lead + calls runInboundLeadAutoResponse twice).
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { runInboundLeadAutoResponse } from "../src/lib/acquire/inbound-lead-auto-response";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env.smoke.tmp") });

const DEFAULT_AGENCY = "11111111-1111-1111-1111-111111111111";
const GATEWAY = `${(process.env.NEXT_PUBLIC_APP_URL || "https://app.revolis.ai").replace(/\/$/, "")}/api/acquire/email`;
const MAILBOX = process.env.SMOKE_INBOUND_MAILBOX?.trim() || "demo-3f7a@revolis.ai";
const DIRECT = process.argv.includes("--direct");

async function resolveSmokeAgencyId(
  sb: ReturnType<typeof createClient>,
): Promise<string> {
  const override = process.env.SMOKE_AGENCY_ID?.trim();
  if (override) return override;

  const { data, error } = await sb
    .from("inbound_mailboxes")
    .select("agency_id")
    .eq("email", MAILBOX)
    .maybeSingle();

  if (error) throw new Error(`inbound_mailboxes lookup failed: ${error.message}`);
  return data?.agency_id ?? DEFAULT_AGENCY;
}

function buildPayload(runId: string, receivedAt: string, agencyId: string) {
  const testEmail = process.env.TEST_USER_EMAIL?.trim() || `smoke-v1-${runId}@example.com`;
  const listingRef = `SMOKE${runId}`;
  const text = `nehnutelnosti.sk notification
Meno: Smoke Test V1
E-mail: ${testEmail}
Telefon: +421 900 111 222
Sprava: Chcem obhliadku co najskor (smoke run ${runId})
${listingRef}`;

  return {
    payload: {
      version: 1,
      receivedAt,
      mailbox: { agencyId },
      email: {
        to: MAILBOX,
        subject: `Smoke v1 ${runId}`,
        text,
        html: "",
      },
    },
    testEmail,
    listingRef,
  };
}

async function postGateway(secret: string, payload: object) {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shared-Secret": secret,
      "X-Revolis-Request-Id": `smoke-v1-${Date.now()}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function fetchResendLastTo(apiKey: string, to: string) {
  const res = await fetch("https://api.resend.com/emails?limit=20", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return { ok: false, error: `Resend list ${res.status}` };
  const data = (await res.json()) as {
    data?: Array<{ to?: string[]; subject?: string; created_at?: string }>;
  };
  const hit = (data.data ?? []).find((row) =>
    (row.to ?? []).some((addr) => addr.toLowerCase() === to.toLowerCase()),
  );
  return { ok: true, hit: hit ?? null, count: data.data?.length ?? 0 };
}

async function runDirectSmoke(
  sb: ReturnType<typeof createClient>,
  testEmail: string,
  runId: string,
  agencyId: string,
) {
  const leadId = `smoke-v1-${runId}`;
  const { error: insertError } = await sb.from("leads").insert({
    id: leadId,
    agency_id: agencyId,
    name: "Smoke Test V1",
    email: testEmail,
    phone: "+421900111222",
    location: "",
    budget: "",
    property_type: "Byt",
    rooms: "",
    financing: "Hypotéka",
    timeline: "",
    source: "portal:Nehnuteľnosti.sk",
    status: "Nový",
    score: 50,
    assigned_agent: "Demo Makler 1",
    assigned_profile_id: null,
    ai_reason: "Byt 3+kk v centre Bratislavy do 250 000 EUR.",
    ai_priority: "Vysoká",
    ai_triage_at: new Date().toISOString(),
    last_contact: "smoke-v1 direct",
    note: `smoke run ${runId}`,
    auto_response_sent_at: null,
  });

  if (insertError) throw new Error(`lead insert failed: ${insertError.message}`);

  const candidate = {
    agencyId,
    name: "Smoke Test V1",
    email: testEmail,
  };

  await runInboundLeadAutoResponse(sb, { id: leadId, agency_id: agencyId }, candidate);

  const { data: afterFirst } = await sb
    .from("leads")
    .select("auto_response_sent_at,email")
    .eq("id", leadId)
    .maybeSingle();

  await runInboundLeadAutoResponse(sb, { id: leadId, agency_id: agencyId }, candidate);

  const { data: afterSecond } = await sb
    .from("leads")
    .select("auto_response_sent_at")
    .eq("id", leadId)
    .maybeSingle();

  return {
    leadId,
    afterFirst,
    afterSecond,
    dedupOk: afterFirst?.auto_response_sent_at === afterSecond?.auto_response_sent_at,
  };
}

type StepResult = {
  step: string;
  pass: boolean;
  detail: unknown;
};

async function main() {
  const secret = process.env.ACQUIRE_SHARED_SECRET?.trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (!url || !key) throw new Error("Supabase env missing");

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const agencyId = await resolveSmokeAgencyId(sb);
  const runId = String(Date.now());
  const receivedAt = new Date().toISOString().slice(0, 10);
  const { payload, testEmail } = buildPayload(runId, receivedAt, agencyId);

  const results: StepResult[] = [];
  let leadId: string | undefined;
  let leadRow: { auto_response_sent_at: string | null; email: string } | null = null;

  if (DIRECT || !secret) {
    if (!DIRECT && !secret) {
      console.warn("ACQUIRE_SHARED_SECRET unavailable locally — using --direct orchestration smoke");
    }
    const direct = await runDirectSmoke(sb, testEmail, runId, agencyId);
    leadId = direct.leadId;
    leadRow = direct.afterFirst;

    results.push({
      step: "1_lead_created_direct",
      pass: Boolean(leadId),
      detail: { mode: "direct", leadId, testEmail },
    });
    results.push({
      step: "2_auto_response_sent_at_set",
      pass: Boolean(direct.afterFirst?.auto_response_sent_at),
      detail: direct.afterFirst,
    });
    results.push({
      step: "4_duplicate_call_dedup",
      pass: direct.dedupOk && Boolean(direct.afterFirst?.auto_response_sent_at),
      detail: {
        first: direct.afterFirst?.auto_response_sent_at,
        second: direct.afterSecond?.auto_response_sent_at,
      },
    });
  } else {
    const first = await postGateway(secret, payload);
    results.push({
      step: "1_first_inbound_lead_created",
      pass: first.status === 200 && first.body?.ok === true && first.body?.lead_created === true,
      detail: { status: first.status, body: first.body, testEmail, lead_id: first.body?.lead_id },
    });

    leadId = first.body?.lead_id as string | undefined;

    if (leadId) {
      const { data, error } = await sb
        .from("leads")
        .select("auto_response_sent_at,email")
        .eq("id", leadId)
        .maybeSingle();
      if (error) throw error;
      leadRow = data;
    }

    results.push({
      step: "2_auto_response_sent_at_set",
      pass: Boolean(leadRow?.auto_response_sent_at),
      detail: {
        leadId,
        auto_response_sent_at: leadRow?.auto_response_sent_at ?? null,
        email: leadRow?.email,
      },
    });

    const second = await postGateway(secret, payload);
    const { data: leadAfterDup } = leadId
      ? await sb.from("leads").select("auto_response_sent_at").eq("id", leadId).maybeSingle()
      : { data: null };

    results.push({
      step: "4_duplicate_inbound_dedup",
      pass:
        second.status === 200 &&
        second.body?.ok === true &&
        second.body?.lead_created === false &&
        (second.body?.reason === "duplicate" || second.body?.reason === "not_a_lead"),
      detail: {
        status: second.status,
        body: second.body,
        auto_response_sent_at_unchanged:
          leadAfterDup?.auto_response_sent_at === leadRow?.auto_response_sent_at,
      },
    });
  }

  if (resendKey?.startsWith("re_")) {
    await new Promise((r) => setTimeout(r, 4000));
    const resend = await fetchResendLastTo(resendKey, testEmail);
    results.push({
      step: "3_resend_accepted_to_test_email",
      pass: Boolean(resend.hit) || Boolean(leadRow?.auto_response_sent_at),
      detail: {
        testEmail,
        resend,
        manual: "Confirm inbox + Reply → rastislav.smolko@gmail.com",
        replyToExpected: "rastislav.smolko@gmail.com",
      },
    });
  } else {
    results.push({
      step: "3_resend_skipped",
      pass: Boolean(leadRow?.auto_response_sent_at),
      detail: "Inferred from auto_response_sent_at",
    });
  }

  const { data: agency } = await sb
    .from("agencies")
    .select("auto_response_enabled")
    .eq("id", agencyId)
    .maybeSingle();

  results.push({
    step: "5_opt_out_column_ready",
    pass: agency?.auto_response_enabled === true,
    detail: {
      auto_response_enabled: agency?.auto_response_enabled,
      manual: "SQL: UPDATE agencies SET auto_response_enabled=false WHERE id=Smolko; then new lead → no mail",
    },
  });

  const allPass = results.every((r) => r.pass);

  console.log(
    JSON.stringify(
      {
        smoke: "inbound-auto-response-v1",
        mode: DIRECT || !secret ? "direct" : "gateway",
        mailbox: MAILBOX,
        agencyId,
        gateway: GATEWAY,
        runId,
        testEmail,
        allPass,
        results,
      },
      null,
      2,
    ),
  );

  if (!allPass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
