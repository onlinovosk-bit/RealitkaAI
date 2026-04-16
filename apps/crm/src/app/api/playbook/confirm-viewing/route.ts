import { errorResponse, okResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { getLead } from "@/lib/leads-store";
import { sendMessage } from "@/lib/multi-channel-sender";
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

  const lead = await getLead(leadId);
  const demo = demoContact(playbookItemId);

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

  if (email) {
    const result = await sendMessage({
      leadId,
      channel: "email",
      to: email,
      subject,
      body: emailBody,
      meta: { source: "playbook_confirm_viewing" },
    });
    if (result.ok) {
      return okResponse({
        sent: true,
        channel: "email" as const,
        to: email,
      });
    }
  }

  if (phone) {
    const result = await sendMessage({
      leadId,
      channel: "sms",
      to: phone,
      body: smsBody,
      meta: { source: "playbook_confirm_viewing" },
    });
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
    "Pre tohto leada nie je zadaný email ani telefón a nebol nájdený demo kontakt k položke playbook.",
    400
  );
}
