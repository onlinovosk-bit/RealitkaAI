import { randomUUID } from "crypto";
import { Resend } from "resend";
import { autoErrorCapture } from "./auto-error-capture";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { logAiAction } from "@/lib/ai-action-audit";
import { authorizeSend, authorityMeta } from "@/lib/control-plane/authorize-send";
import { OUTREACH_PROMPT_VERSION, generateOutreachEmail } from "@/lib/ai-outreach";
import { estimateOpenAiCostFromTotalTokens } from "@/lib/ai/llm-usage-cost";
import { CREDIT_ACTION_COSTS } from "@/lib/program-tier-pricing";
import { createActivity } from "@/lib/activities-store";
import {
  fetchLeadAgencyId,
  getHoursSinceLastAiEmailToLead,
  outreachLeadCooldownHours,
  pickOutboundAbVariant,
} from "@/lib/outbound-orchestrator";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";
import { getLead, getLeadAsService, type Lead } from "@/lib/leads-store";
import { insertAgentDraft } from "@/lib/inbound/insert-agent-draft";
import { OUTREACH_AGENT_ID } from "@/lib/inbound/draft-view";
import type { SendMessageInput, SendMessageResult } from "@/lib/multi-channel-sender";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logAiRecommendation, hashRecommendationDedupePart } from "@/lib/moat-capture/log-ai-recommendation";

type OutreachConfig = {
  dailyLimit: number;
  allowedStatuses: string[];
};

export type OutreachAudit = {
  dailyLimit: number;
  sentToday: number;
  remainingToday: number;
  totalSent: number;
  totalAiSent: number;
  uniqueLeadsToday: number;
  allowedStatuses: string[];
  lastSentAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
};

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    autoErrorCapture("RESEND_API_KEY is missing", "getResendClient");
    return null;
  }

  if (!apiKey.startsWith("re_")) {
    autoErrorCapture("RESEND_API_KEY má neplatný formát.", "getResendClient");
    throw new Error("RESEND_API_KEY má neplatný formát. Očakáva sa kľúč začínajúci na re_.");
  }

  autoErrorCapture("Resend client initialized", "getResendClient");
  return new Resend(apiKey);
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createSupabaseClient(url, anonKey);
}

function getOutreachConfig(): OutreachConfig {
  const dailyLimitRaw = Number(process.env.OUTREACH_DAILY_LIMIT ?? "20");
  const dailyLimit = Number.isFinite(dailyLimitRaw) && dailyLimitRaw > 0 ? dailyLimitRaw : 20;

  const allowedStatusesRaw = process.env.OUTREACH_ALLOWED_STATUSES ?? "Ponuka,Záujem,Obhliadka";
  const allowedStatuses = allowedStatusesRaw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    dailyLimit,
    allowedStatuses,
  };
}

function startOfDayIso() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function isOutreachMessage(item: any) {
  return item?.direction === "outbound" && item?.channel === "email" && Boolean(item?.ai_generated);
}

async function getTodayOutreachCount() {
  const supabase = createServiceRoleClient() ?? getSupabaseClient();
  const startIso = startOfDayIso();

  if (!supabase) {
    return 0;
  }

  const { data, error } = await supabase
    .from("messages")
    .select("id,direction,channel,ai_generated,created_at")
    .gte("created_at", startIso);

  if (error || !data) {
    return 0;
  }

  return data.filter((item: any) => isOutreachMessage(item)).length;
}

export async function listOutreachMessages() {
  const supabase = createServiceRoleClient() ?? getSupabaseClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) {
    return [];
  }

  return data.map((item: any) => ({
    id: item.id,
    leadId: item.lead_id ?? null,
    direction: item.direction ?? "outbound",
    channel: item.channel ?? "email",
    senderName: item.sender_name ?? "",
    senderEmail: item.sender_email ?? "",
    content: item.content ?? "",
    aiGenerated: item.ai_generated ?? false,
    createdAt: item.created_at,
    conversationId: item.conversation_id ?? null,
  }));
}

/**
 * Resolve the outreach lead with an explicit client.
 *
 * Never fall back to `listLeads()` here: on a server route without a session it
 * resolves to the browser singleton, `resolveSessionAgencyId` returns null and
 * every lead lookup silently misses ("Lead nebol nájdený" for valid leads, and
 * a cron that loops over zero rows while reporting success).
 *
 * - user-triggered send → caller passes the request-scoped client (RLS applies)
 * - cron / background   → explicit service-role client, fail-closed when the
 *   service-role key is missing
 */
export async function resolveOutreachLead(
  leadId: string,
  scopedSupabase?: SupabaseClient | null,
): Promise<Lead | undefined> {
  if (scopedSupabase) {
    return getLead(leadId, scopedSupabase);
  }

  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    throw new Error(
      "Outreach bez používateľskej session vyžaduje SUPABASE_SERVICE_ROLE_KEY — bez neho by lead nikdy nebol nájdený.",
    );
  }

  return getLeadAsService(serviceClient, leadId);
}

export { OUTREACH_AGENT_ID };
export const OUTREACH_SEND_ACTION = "outreach.email.send";

/**
 * Legacy entry point of the automation script. Outreach is now two steps —
 * prepareOutreachDraft (the broker sees the exact text) and the shared approve
 * path (approve-draft.ts → sendApprovedOutreach) — so a caller that wants to
 * generate and send in one go is always refused, before any text is generated.
 * The refusal goes through the Control Contract so it is audited like any
 * other blocked send.
 */
export async function sendAiOutreachEmail(
  leadId: string,
  scopedSupabase?: SupabaseClient | null,
): Promise<never> {
  const correlationId = randomUUID();
  const lead = await resolveOutreachLead(leadId, scopedSupabase);
  if (!lead) throw new Error("Lead nebol nájdený.");
  const agencyId = (await fetchLeadAgencyId(lead.id)) ?? SYSTEM_USAGE_AGENCY_ID;

  const authz = authorizeSend({
    action: OUTREACH_SEND_ACTION,
    agentId: OUTREACH_AGENT_ID,
    tenantId: agencyId,
    approval: null,
  });
  const reason = authz.ok
    ? "Outreach sa odosiela len po schválení náhľadu maklérom."
    : authz.reason;
  await logAiAction({
    action: "outreach_send",
    agencyId,
    leadId: lead.id,
    actionKind: "send_failed",
    channel: "email",
    meta: { correlation_id: correlationId, agent_id: OUTREACH_AGENT_ID,
      action: OUTREACH_SEND_ACTION,
      blocked: true,
      ...(authz.ok ? {} : authorityMeta(authz.verdict)),
    },
  });
  throw new Error(reason);
}

type OutreachFail = { ok: false; status: number; error: string };

/**
 * Daily limit + per-lead cooldown. Checked when the draft is written and again
 * right before the approved send (another e-mail may have gone out meanwhile).
 */
async function checkOutreachQuota(
  leadId: string,
  agencyId: string,
  correlationId: string,
): Promise<OutreachFail | null> {
  const config = getOutreachConfig();
  const sentToday = await getTodayOutreachCount();
  if (sentToday >= config.dailyLimit) {
    return { ok: false, status: 429, error: `Denný limit outreach bol dosiahnutý (${config.dailyLimit}).` };
  }

  const cooldownH = outreachLeadCooldownHours();
  const sinceH = await getHoursSinceLastAiEmailToLead(leadId);
  if (sinceH != null && sinceH < cooldownH) {
    await logAiAction({
      action: "ai_email",
      agencyId,
      leadId,
      actionKind: "frequency_blocked",
      channel: "email",
      meta: { correlation_id: correlationId, agent_id: OUTREACH_AGENT_ID,
        hoursSinceLast: sinceH,
        cooldownHours: cooldownH,
      },
    });
    return {
      ok: false,
      status: 429,
      error: `Frekvenčný limit: posledný AI email pred ${sinceH.toFixed(1)} h. Min. odstup ${cooldownH} h.`,
    };
  }
  return null;
}

export type OutreachDraftResult =
  | {
      ok: true;
      activityId: string;
      correlationId: string;
      to: string;
      subject: string;
      body: string;
      /** For the caller's usage metric; not for the client. */
      usage: { agencyId: string; tokens: number };
    }
  | OutreachFail;

/**
 * Step 1 of outreach: generate the e-mail and store it as a draft the broker
 * reads before anything is sent. Nothing leaves the system here.
 *
 * `scopedSupabase` is the request-scoped client, so the lead is resolved under
 * the broker's tenant (RLS); `admin` writes the draft row.
 */
export async function prepareOutreachDraft(input: {
  leadId: string;
  scopedSupabase: SupabaseClient;
  admin: SupabaseClient;
  profileId?: string | null;
}): Promise<OutreachDraftResult> {
  if (!process.env.RESEND_API_KEY?.trim()) return { ok: false, status: 503, error: "Chýba RESEND_API_KEY." };
  if (!process.env.OUTREACH_FROM_EMAIL) return { ok: false, status: 503, error: "Chýba OUTREACH_FROM_EMAIL." };

  const lead = await resolveOutreachLead(input.leadId, input.scopedSupabase);
  if (!lead) return { ok: false, status: 404, error: "Lead nebol nájdený." };
  if (!lead.email) return { ok: false, status: 422, error: "Lead nemá email." };

  const config = getOutreachConfig();
  if (config.allowedStatuses.length > 0 && !config.allowedStatuses.includes(lead.status)) {
    return { ok: false, status: 422, error: `Lead má nepodporovaný stav pre outreach (${lead.status}).` };
  }

  const agencyId = (await fetchLeadAgencyId(lead.id)) ?? SYSTEM_USAGE_AGENCY_ID;
  const quota = await checkOutreachQuota(lead.id, agencyId, randomUUID());
  if (quota) return quota;

  const variant = pickOutboundAbVariant();
  const generated = await generateOutreachEmail(lead, { variant });

  logAiRecommendation({
    agencyId,
    leadId: lead.id,
    source: "ai_email",
    recommendation: generated.subject,
    reasoning: generated.body.slice(0, 2000),
    dedupeKey: `ai_email:${lead.id}:${hashRecommendationDedupePart(`${generated.subject}\n${generated.body}`)}`,
    modelVersion: generated.provider,
  });

  const model = generated.provider.replace(/^openai:/, "") || "gpt-4.1-mini";
  const draft = await insertAgentDraft({
    admin: input.admin,
    leadId: lead.id,
    agencyId,
    profileId: input.profileId ?? null,
    agentId: OUTREACH_AGENT_ID,
    promptVersion: OUTREACH_PROMPT_VERSION,
    channel: "email",
    subject: generated.subject,
    body: generated.body,
    recipient: lead.email,
    activity: {
      type: "Outreach",
      title: "AI email — návrh na schválenie",
      actorName: "AI systém",
      source: "outreach",
    },
    extraMeta: {
      provider: generated.provider,
      totalTokens: generated.totalTokens ?? null,
      variant,
    },
    auditAction: "ai_email",
    auditExtras: {
      variant,
      model,
      creditsSpent: CREDIT_ACTION_COSTS.aiEmail,
      costEur: estimateOpenAiCostFromTotalTokens(model, generated.totalTokens ?? 0),
    },
  });
  if (!draft.ok) return { ok: false, status: 500, error: "Návrh sa nepodarilo uložiť." };

  return {
    ok: true,
    activityId: draft.activityId,
    correlationId: draft.correlationId,
    to: lead.email,
    subject: generated.subject,
    body: generated.body,
    usage: { agencyId, tokens: Math.max(1, Math.floor(generated.totalTokens ?? 1)) },
  };
}

function describeResendError(resendMsg: string, from: string): string {
  const normalized = resendMsg.toLowerCase();
  if (normalized.includes("api key") || normalized.includes("invalid")) {
    return "Resend API kľúč je neplatný alebo zrušený. Vygeneruj nový kľúč na resend.com/api-keys a nastav ho ako RESEND_API_KEY.";
  }
  if (normalized.includes("domain") || normalized.includes("from") || normalized.includes("sender")) {
    return `Neplatná odosielacia adresa (${from}). Resend vyžaduje overenú doménu.`;
  }
  return `Resend chyba: ${resendMsg || "Email sa nepodarilo odoslať."}`;
}

/**
 * Step 2 of outreach: the sender approve-draft.ts uses for REVOLIS-OUTREACH
 * drafts. It runs only after the broker approved the stored text and the
 * Control Contract allowed the send; it sends exactly `subject` / `body`.
 * The ai_suggested / human_approved / sent audit rows are approve-draft's job.
 */
export async function sendApprovedOutreach(input: SendMessageInput): Promise<SendMessageResult> {
  const fail = (error: string): SendMessageResult => ({ ok: false, channel: "email", to: input.to, error });
  if (input.channel !== "email") return fail("Outreach posiela len email.");

  const from = process.env.OUTREACH_FROM_EMAIL;
  if (!from) return fail("Chýba OUTREACH_FROM_EMAIL.");
  const resend = getResendClient();
  if (!resend) return fail("Chýba RESEND_API_KEY.");

  const correlationId = String(input.meta?.correlation_id ?? randomUUID());
  const agencyId = (await fetchLeadAgencyId(input.leadId)) ?? SYSTEM_USAGE_AGENCY_ID;
  const quota = await checkOutreachQuota(input.leadId, agencyId, correlationId);
  if (quota) return fail(quota.error);

  const subject = input.subject ?? "";
  const sendResult = await resend.emails.send({
    from,
    to: input.to,
    subject,
    text: input.body,
    tags: [{ name: "lead_id", value: input.leadId }],
  });
  const resendError = (sendResult as { error?: { message?: string } | null }).error;
  if (resendError) {
    const message = describeResendError(resendError.message ?? "", from);
    await createActivity({
      leadId: input.leadId,
      type: "Outreach",
      title: "AI email sa nepodarilo odoslať",
      text: `Odoslanie schváleného AI emailu na ${input.to} zlyhalo: ${message}`,
      entityType: "lead",
      entityId: input.leadId,
      actorName: "AI systém",
      source: "outreach",
      severity: "error",
      meta: { correlation_id: correlationId, agent_id: OUTREACH_AGENT_ID, errorMessage: message },
    }).catch((e) => console.error("[sendApprovedOutreach] error activity:", e));
    return fail(message);
  }

  // The conversation log feeds the daily limit and the per-lead cooldown.
  const supabase = createServiceRoleClient() ?? getSupabaseClient();
  if (supabase) {
    const conversationInsert = await supabase
      .from("conversations")
      .insert({ lead_id: input.leadId, channel: "email", subject, status: "open" })
      .select("id")
      .single();
    const conversationId = !conversationInsert.error && conversationInsert.data ? conversationInsert.data.id : null;

    const { error: msgErr } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      lead_id: input.leadId,
      direction: "outbound",
      channel: "email",
      sender_name: "Realitka AI",
      sender_email: from,
      content: input.body,
      ai_generated: true,
    });
    if (msgErr) console.error("[sendApprovedOutreach] messages insert:", msgErr.message);
  }

  const messageId = (sendResult as { data?: { id?: string } | null }).data?.id;
  return { ok: true, channel: "email", to: input.to, ...(messageId ? { messageId } : {}) };
}

export async function getOutreachAudit(): Promise<OutreachAudit> {
  const config = getOutreachConfig();
  const messages = await listOutreachMessages();
  const startIso = startOfDayIso();

  const outreachRows = messages.filter(
    (item) => item.direction === "outbound" && item.channel === "email" && item.aiGenerated
  );
  const sentTodayRows = outreachRows.filter((item) => (item.createdAt ?? "") >= startIso);

  const sentToday = sentTodayRows.length;
  const remainingToday = Math.max(0, config.dailyLimit - sentToday);
  const uniqueLeadsToday = new Set(sentTodayRows.map((item) => item.leadId).filter(Boolean)).size;
  const lastSentAt = outreachRows[0]?.createdAt ?? null;

  const supabase = createServiceRoleClient() ?? getSupabaseClient();
  let lastErrorAt: string | null = null;
  let lastErrorMessage: string | null = null;

  if (supabase) {
    const { data } = await supabase
      .from("activities")
      .select("created_at,text")
      .eq("source", "outreach")
      .eq("severity", "error")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      lastErrorAt = data.created_at ?? null;
      lastErrorMessage = data.text ?? null;
    }
  }

  return {
    dailyLimit: config.dailyLimit,
    sentToday,
    remainingToday,
    totalSent: outreachRows.length,
    totalAiSent: outreachRows.length,
    uniqueLeadsToday,
    allowedStatuses: config.allowedStatuses,
    lastSentAt,
    lastErrorAt,
    lastErrorMessage,
  };
}
