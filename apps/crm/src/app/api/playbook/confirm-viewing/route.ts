import { errorResponse, okResponse } from "@/lib/api-response";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { logAiAction } from "@/lib/ai-action-audit";
import { authorizeSend, authorityMeta } from "@/lib/control-plane/authorize-send";
import { readDemoModeFromCookie } from "@/lib/demo-mode-cookie";
import { getLead } from "@/lib/leads-store";
import { sendMessage } from "@/lib/multi-channel-sender";
import { createClient } from "@/lib/supabase/server";
import { mockBusyDay } from "@/services/playbook/mock";

function normalizeSkE164(raw: string): string | null {
  const d = raw.replace(/\s/g, "");
  if (d.startsWith("+421") && /^\+421[1-9]\d{8}$/.test(d)) return d;
  if (/^0[1-9]\d{8}$/.test(d)) return `+421${d.slice(1)}`;
  if (/^[1-9]\d{8}$/.test(d)) return `+421${d}`;
  return null;
}

function buildMessages(input: { buyerName?: string; subtitle: string }) {
  const first = (input.buyerName || "klient").split(/\s+/)[0] || "klient";
  const emailBody = `Ahoj ${first},

potvrdzujeme tvoju obhliadku:
${input.subtitle}

Tešíme sa na stretnutie.
Váš tím`;

  const smsBody = `Ahoj, potvrdzujeme obhliadku: ${input.subtitle}. Tešíme sa na stretnutie.`;

  return { emailBody, smsBody, subject: "Potvrdenie obhliadky" };
}

function demoContact(playbookItemId: string) {
  return mockBusyDay.find((i) => i.id === playbookItemId)?.meta?.viewingConfirmationContact;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse("Neautorizovaný prístup.", 401);
  }

  let body: {
    leadId?: string;
    playbookItemId?: string;
    title?: string;
    subtitle?: string;
    buyerName?: string;
  };

  try {
    body = await request.json();
  } catch {
    return errorResponse("Neplatné JSON telo.", 400);
  }

  const leadId = typeof body.leadId === "string" ? body.leadId : "";
  const playbookItemId = typeof body.playbookItemId === "string" ? body.playbookItemId : "";
  const subtitle = typeof body.subtitle === "string" ? body.subtitle : "";

  if (!leadId || !subtitle) {
    return errorResponse("Chýba leadId alebo subtitle.", 400);
  }

  // Pass the request-scoped client. Without it `getLead` resolves through the
  // browser singleton, the select fails on the server and the lead used to fall
  // back to a fixture — so a real viewing confirmation went to the demo contact.
  const supabase = await createClient();
  const lead = await getLead(leadId, supabase);
  const demoMode = await readDemoModeFromCookie();

  if (!lead && !demoMode) {
    return errorResponse(
      "Lead nebol nájdený alebo nepatrí do vašej agentúry.",
      404,
    );
  }

  // The playbook fixture contact exists for the demo tour only. It must never
  // stand in for a real buyer's missing email or phone.
  const demo = demoMode ? demoContact(playbookItemId) : undefined;

  const email =
    (lead?.email && lead.email.trim()) ||
    demo?.email?.trim() ||
    undefined;

  const phoneRaw = lead?.phone || demo?.phone || "";
  const phone = phoneRaw ? normalizeSkE164(phoneRaw) : null;

  const { emailBody, smsBody, subject } = buildMessages({
    buyerName: body.buyerName || lead?.name,
    subtitle,
  });

  const mailtoHref = email
    ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`
    : undefined;
  const smsHref = phone
    ? `sms:${phone}?body=${encodeURIComponent(smsBody)}`
    : undefined;

  // Control Contract gate: the click of a logged-in broker of the lead's agency
  // is the human approval; the kill switch (AGENT_KILL_SWITCH) refuses it
  // regardless. A real (non-demo) send needs a tenant; demo mode has none.
  const profile = await getCurrentProfile();
  if (!demoMode && !profile?.agency_id) {
    return errorResponse("Profil nemá priradenú kanceláriu.", 403);
  }
  const tenantId = profile?.agency_id ?? "demo";
  const approver = profile?.email ?? user.email ?? user.id;
  const approvalId = `confirm-viewing:${leadId}:${playbookItemId || "n/a"}`;

  /** Authorizes + audits one send. Returns a blocked response, or the send result. */
  const guardedSend = async (
    channel: "email" | "sms",
    to: string,
    messageSubject: string | undefined,
    messageBody: string,
  ) => {
    const action = channel === "email" ? "followup.email.send" : "followup.sms.send";
    const agentId = "REVOLIS-VIEWING-CONFIRM";
    const auditBase = {
      action: "viewing_confirm_send",
      agencyId: profile?.agency_id ?? null,
      leadId,
      profileId: profile?.id ?? null,
      channel,
      subjectPreview: messageSubject ?? null,
      bodyText: messageBody,
    };
    const authz = authorizeSend({
      action,
      agentId,
      tenantId,
      approval: { approvalId, approvedBy: approver, approvedAt: new Date().toISOString() },
    });
    if (!authz.ok) {
      await logAiAction({
        ...auditBase,
        actionKind: "send_failed",
        meta: { agent_id: agentId, action, blocked: true, ...authorityMeta(authz.verdict) },
      }).catch((e) => console.error("[confirm-viewing] audit blocked:", e));
      return { blocked: errorResponse(authz.reason, authz.status) };
    }
    const auditMeta = {
      agent_id: agentId,
      action,
      approved_by: approver,
      playbook_item_id: playbookItemId || null,
      ...authorityMeta(authz.verdict),
    };
    await logAiAction({ ...auditBase, actionKind: "human_approved", meta: auditMeta })
      .catch((e) => console.error("[confirm-viewing] audit human_approved:", e));
    const result = await sendMessage({
      leadId,
      channel,
      to,
      ...(messageSubject ? { subject: messageSubject } : {}),
      body: messageBody,
      meta: { source: "playbook_confirm_viewing" },
    });
    await logAiAction({
      ...auditBase,
      actionKind: result.ok ? "sent" : "send_failed",
      meta: { ...auditMeta, ...(result.ok ? {} : { error: result.error ?? "send failed" }) },
    }).catch((e) => console.error("[confirm-viewing] audit result:", e));
    return { result };
  };

  if (email) {
    const sent = await guardedSend("email", email, subject, emailBody);
    if ("blocked" in sent) return sent.blocked;
    const result = sent.result;
    if (result.ok) {
      return okResponse({
        sent: true,
        channel: "email" as const,
        to: email,
      });
    }
  }

  if (phone) {
    const sent = await guardedSend("sms", phone, undefined, smsBody);
    if ("blocked" in sent) return sent.blocked;
    const result = sent.result;
    if (result.ok) {
      return okResponse({
        sent: true,
        channel: "sms" as const,
        to: phone,
      });
    }
  }

  if (mailtoHref || smsHref) {
    return okResponse({
      sent: false,
      channel: email ? ("email" as const) : ("sms" as const),
      fallback: { mailtoHref, smsHref, emailBody, smsBody },
      message:
        "Server neodoslal správu (chýbajúce alebo neplatné API kľúče). Otvorte email alebo SMS cez odkaz.",
    });
  }

  return errorResponse(
    "Pre tohto leada nie je zadaný email ani telefón. Doplňte kontakt v CRM — potvrdenie sa neodosiela na náhradný kontakt.",
    400
  );
}
