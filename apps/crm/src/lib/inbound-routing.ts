import nodemailer from "nodemailer";

type InboundChannel = "legal" | "support";
type EmailProvider = "RESEND" | "BREVO" | "SMTP";

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  from?: string;
};

type TicketPayload = {
  channel: InboundChannel;
  title: string;
  requestId: string;
  source: string;
  createdAt: string;
  priority?: string;
  fields: Record<string, string>;
};

function getWebhookUrl(channel: InboundChannel) {
  if (channel === "legal") return process.env.LEGAL_WEBHOOK_URL || process.env.OPERATIONS_WEBHOOK_URL;
  return process.env.SUPPORT_WEBHOOK_URL || process.env.OPERATIONS_WEBHOOK_URL;
}

function getEmailProvider(): EmailProvider {
  const configured = (process.env.EMAIL_PROVIDER || "RESEND").toUpperCase();
  if (configured === "BREVO" || configured === "SMTP" || configured === "RESEND") {
    return configured;
  }
  return "RESEND";
}

function parseFromAddress(fromHeader: string) {
  const match = fromHeader.match(/^(.*)<([^>]+)>$/);
  if (!match) {
    return { name: "Revolis", email: fromHeader.trim() };
  }
  return {
    name: match[1]?.trim().replace(/^"|"$/g, "") || "Revolis",
    email: match[2]?.trim(),
  };
}

async function sendViaResend(payload: EmailPayload) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY missing");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: payload.from || process.env.LEGAL_FROM_EMAIL || "Revolis Legal <legal@revolis.ai>",
      to: [payload.to],
      reply_to: payload.replyTo,
      subject: payload.subject,
      text: payload.text,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Resend failed: ${response.status}`);
  }

  return { ok: true as const, skipped: false as const };
}

async function sendViaBrevo(payload: EmailPayload) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    throw new Error("BREVO_API_KEY missing");
  }
  const from = parseFromAddress(payload.from || process.env.LEGAL_FROM_EMAIL || "Revolis Legal <legal@revolis.ai>");

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": brevoApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: from.name, email: from.email },
      to: [{ email: payload.to }],
      replyTo: payload.replyTo ? { email: payload.replyTo } : undefined,
      subject: payload.subject,
      textContent: payload.text,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Brevo failed: ${response.status}`);
  }

  return { ok: true as const, skipped: false as const };
}

async function sendViaSmtp(payload: EmailPayload) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || "587");
  const secure = (process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const from = payload.from || process.env.SMTP_FROM_EMAIL || process.env.LEGAL_FROM_EMAIL || "Revolis <noreply@revolis.ai>";

  if (!host || !user || !pass) {
    throw new Error("SMTP credentials missing (SMTP_HOST/SMTP_USER/SMTP_PASS)");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: payload.to,
    replyTo: payload.replyTo,
    subject: payload.subject,
    text: payload.text,
  });

  return { ok: true as const, skipped: false as const };
}

export async function sendInboundEmail(payload: EmailPayload) {
  const provider = getEmailProvider();
  if (provider === "BREVO") return sendViaBrevo(payload);
  if (provider === "SMTP") return sendViaSmtp(payload);
  return sendViaResend(payload);
}

export async function dispatchInboundTicket(payload: TicketPayload) {
  const webhookUrl = getWebhookUrl(payload.channel);
  if (!webhookUrl) {
    return { ok: true as const, skipped: true as const, reason: "webhook not configured" };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Webhook failed: ${response.status}`);
  }

  return { ok: true as const, skipped: false as const };
}
