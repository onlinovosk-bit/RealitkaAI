import { Resend } from "resend";
import { autoErrorCapture } from "./auto-error-capture";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { logAiActionAudit } from "@/lib/ai-action-audit";
import { generateOutreachEmail } from "@/lib/ai-outreach";
import { createActivity } from "@/lib/activities-store";
import {
  fetchLeadAgencyId,
  getHoursSinceLastAiEmailToLead,
  outreachLeadCooldownHours,
  pickOutboundAbVariant,
} from "@/lib/outbound-orchestrator";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { incrementUsageMetric, SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";
import { listLeads } from "@/lib/leads-store";

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

export async function sendAiOutreachEmail(leadId: string) {
  const resend = getResendClient();
  const supabase = createServiceRoleClient() ?? getSupabaseClient();
  const from = process.env.OUTREACH_FROM_EMAIL;
  const config = getOutreachConfig();

  let leadForError: { id: string; name: string; email: string } | null = null;

  try {
    if (!resend) {
      throw new Error("Chýba RESEND_API_KEY.");
    }

    if (!from) {
      throw new Error("Chýba OUTREACH_FROM_EMAIL.");
    }

    const leads = await listLeads();
    const lead = leads.find((item) => item.id === leadId);

    if (!lead) {
      throw new Error("Lead nebol nájdený.");
    }

    leadForError = {
      id: lead.id,
      name: lead.name,
      email: lead.email,
    };

    if (!lead.email) {
      throw new Error("Lead nemá email.");
    }

    if (config.allowedStatuses.length > 0 && !config.allowedStatuses.includes(lead.status)) {
      throw new Error(`Lead má nepodporovaný stav pre outreach (${lead.status}).`);
    }

    const sentToday = await getTodayOutreachCount();
    if (sentToday >= config.dailyLimit) {
      throw new Error(`Denný limit outreach bol dosiahnutý (${config.dailyLimit}).`);
    }

    const agencyId =
      (await fetchLeadAgencyId(lead.id)) ?? SYSTEM_USAGE_AGENCY_ID;

    const cooldownH = outreachLeadCooldownHours();
    const sinceH = await getHoursSinceLastAiEmailToLead(lead.id);
    if (sinceH != null && sinceH < cooldownH) {
      await logAiActionAudit({
        agencyId,
        leadId: lead.id,
        actionKind: "frequency_blocked",
        channel: "email",
        meta: {
          hoursSinceLast: sinceH,
          cooldownHours: cooldownH,
        },
      });
      throw new Error(
        `Frekvenčný limit: posledný AI email pred ${sinceH.toFixed(1)} h. Min. odstup ${cooldownH} h.`
      );
    }

    const variant = pickOutboundAbVariant();
    const generated = await generateOutreachEmail(lead, { variant });

    await logAiActionAudit({
      agencyId,
      leadId: lead.id,
      actionKind: "ai_suggested",
      channel: "email",
      variant,
      subjectPreview: generated.subject,
      bodyText: generated.body,
      meta: {
        provider: generated.provider,
        totalTokens: generated.totalTokens ?? null,
      },
    });

    const sendResult = await resend.emails.send({
      from,
      to: lead.email,
      subject: generated.subject,
      text: generated.body,
      tags: [{ name: "lead_id", value: lead.id }],
    });

    if ((sendResult as any).error) {
      const resendMsg: string = (sendResult as any).error.message || "";
      const normalized = resendMsg.toLowerCase();

      await logAiActionAudit({
        agencyId,
        leadId: lead.id,
        actionKind: "send_failed",
        channel: "email",
        variant,
        subjectPreview: generated.subject,
        bodyText: generated.body,
        meta: { provider: "resend", error: resendMsg },
      });

      if (normalized.includes("api key") || normalized.includes("invalid")) {
        throw new Error(
          "Resend API kľúč je neplatný alebo zrušený. Vygeneruj nový kľúč na resend.com/api-keys a nastav ho ako RESEND_API_KEY v .env.local."
        );
      }

      if (normalized.includes("domain") || normalized.includes("from") || normalized.includes("sender")) {
        throw new Error(
          `Neplatná odosielacia adresa (${from}). Resend vyžaduje overenú doménu. Na testovanie použi onboarding@resend.dev.`
        );
      }

      throw new Error(
        `Resend chyba: ${resendMsg || "Email sa nepodarilo odoslať."}`
      );
    }

    let conversationId: string | null = null;

    if (supabase) {
      const conversationInsert = await supabase
        .from("conversations")
        .insert({
          lead_id: lead.id,
          channel: "email",
          subject: generated.subject,
          status: "open",
        })
        .select("*")
        .single();

      if (!conversationInsert.error && conversationInsert.data) {
        conversationId = conversationInsert.data.id;
      }

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        lead_id: lead.id,
        direction: "outbound",
        channel: "email",
        sender_name: "Realitka AI",
        sender_email: from,
        content: generated.body,
        ai_generated: true,
      });
    }

    await createActivity({
      leadId: lead.id,
      type: "Outreach",
      title: "AI email bol automaticky odoslaný",
      text: `Leadovi ${lead.name} bol odoslaný AI email na adresu ${lead.email}.`,
      entityType: "lead",
      entityId: lead.id,
      actorName: "AI systém",
      source: "outreach",
      severity: "success",
      meta: {
        channel: "email",
        subject: generated.subject,
        provider: generated.provider,
        conversationId,
        variant,
        stage: "sent",
      },
    });

    await logAiActionAudit({
      agencyId,
      leadId: lead.id,
      actionKind: "sent",
      channel: "email",
      variant,
      subjectPreview: generated.subject,
      bodyText: generated.body,
      meta: {
        provider: generated.provider,
        conversationId,
        resendOk: true,
      },
    });

    const tokenDelta = Math.max(1, Math.floor(generated.totalTokens ?? 1));
    await incrementUsageMetric({
      agencyId,
      metric: "ai_openai_tokens",
      delta: tokenDelta,
    });
    await incrementUsageMetric({
      agencyId,
      metric: "outreach_send",
      delta: 1,
    });

    return {
      ok: true,
      leadId: lead.id,
      to: lead.email,
      subject: generated.subject,
      body: generated.body,
      provider: generated.provider,
      conversationId,
      variant,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nepodarilo sa odoslať AI email.";

    await createActivity({
      leadId: leadForError?.id ?? null,
      type: "Outreach",
      title: "AI email sa nepodarilo odoslať",
      text: leadForError
        ? `Pre lead ${leadForError.name} (${leadForError.email || "bez emailu"}) zlyhalo odoslanie: ${message}`
        : `Odoslanie AI emailu zlyhalo: ${message}`,
      entityType: "lead",
      entityId: leadForError?.id ?? null,
      actorName: "AI systém",
      source: "outreach",
      severity: "error",
      meta: {
        leadId,
        errorMessage: message,
      },
    });

    throw error;
  }
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
