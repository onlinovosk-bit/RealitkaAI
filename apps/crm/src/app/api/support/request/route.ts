import { NextResponse } from "next/server";
import { dispatchInboundTicket, sendInboundEmail } from "@/lib/inbound-routing";

type SupportRequestPayload = {
  fullName?: string;
  email?: string;
  company?: string;
  priority?: string;
  subject?: string;
  message?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  let body: SupportRequestPayload = {};
  try {
    body = (await request.json()) as SupportRequestPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Neplatný JSON payload." }, { status: 400 });
  }

  const fullName = (body.fullName || "").trim();
  const email = (body.email || "").trim();
  const company = (body.company || "").trim();
  const subject = (body.subject || "").trim();
  const message = (body.message || "").trim();
  const priority = (body.priority || "P3").trim();

  if (!fullName || !email || !company || !subject || !message) {
    return NextResponse.json(
      { ok: false, error: "Meno, e-mail, firma, predmet a správa sú povinné." },
      { status: 400 },
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "E-mail nemá správny formát." }, { status: 400 });
  }

  const supportInbox = process.env.SUPPORT_INBOX || "support@revolis.ai";
  const supportFromEmail = process.env.SUPPORT_FROM_EMAIL || "Revolis Support <support@revolis.ai>";
  const requestId = `sup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date().toISOString();

  const plainText = [
    "Nová support žiadosť",
    `Request ID: ${requestId}`,
    `Meno: ${fullName}`,
    `Email: ${email}`,
    `Firma: ${company}`,
    `Priorita: ${priority}`,
    `Predmet: ${subject}`,
    `Správa: ${message}`,
    `Čas: ${createdAt}`,
  ].join("\n");

  let emailSent = false;
  let webhookSent = false;

  try {
    await sendInboundEmail({
      to: supportInbox,
      from: supportFromEmail,
      replyTo: email,
      subject: `[${priority}] Support request: ${subject}`,
      text: plainText,
    });
    emailSent = true;
  } catch (error) {
    console.error("[support:request] email dispatch failed", error);
  }

  try {
    await dispatchInboundTicket({
      channel: "support",
      title: subject,
      requestId,
      source: "web-form",
      createdAt,
      priority,
      fields: {
        fullName,
        email,
        company,
        subject,
        message,
      },
    });
    webhookSent = true;
  } catch (error) {
    console.error("[support:request] webhook dispatch failed", error);
  }

  if (!emailSent && !webhookSent) {
    return NextResponse.json(
      { ok: false, error: "Nepodarilo sa doručiť support ticket. Skúste to znova o chvíľu." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    requestId,
    message: emailSent
      ? "Support požiadavka prijatá. Ozveme sa čo najskôr."
      : "Support požiadavka prijatá v záložnom režime. Ozveme sa čo najskôr.",
    degradedDelivery: !emailSent,
  });
}
