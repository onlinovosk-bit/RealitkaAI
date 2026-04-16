import { NextResponse } from "next/server";
import { dispatchInboundTicket, sendInboundEmail } from "@/lib/inbound-routing";

type DpaRequestPayload = {
  fullName?: string;
  email?: string;
  company?: string;
  country?: string;
  notes?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  let body: DpaRequestPayload = {};
  try {
    body = (await request.json()) as DpaRequestPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Neplatný JSON payload." }, { status: 400 });
  }

  const fullName = (body.fullName || "").trim();
  const email = (body.email || "").trim();
  const company = (body.company || "").trim();
  const country = (body.country || "").trim();
  const notes = (body.notes || "").trim();

  if (!fullName || !email || !company) {
    return NextResponse.json({ ok: false, error: "Meno, e-mail a firma sú povinné." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "E-mail nemá správny formát." }, { status: 400 });
  }

  const legalInbox = process.env.LEGAL_INBOX || "legal@revolis.ai";
  const fromEmail = process.env.LEGAL_FROM_EMAIL || "Revolis Legal <legal@revolis.ai>";
  const requestId = `dpa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date().toISOString();

  const plainText = [
    "Nová žiadosť o DPA template",
    `Meno: ${fullName}`,
    `Email: ${email}`,
    `Firma: ${company}`,
    `Krajina: ${country || "-"}`,
    `Poznámka: ${notes || "-"}`,
    `Čas: ${new Date().toISOString()}`,
  ].join("\n");

  let emailSent = false;
  let webhookSent = false;

  try {
    await sendInboundEmail({
      to: legalInbox,
      from: fromEmail,
      replyTo: email,
      subject: `DPA request: ${company} (${fullName})`,
      text: plainText,
    });
    emailSent = true;
  } catch (error) {
    console.error("[legal:dpa-request] email dispatch failed", error);
  }

  try {
    await dispatchInboundTicket({
      channel: "legal",
      title: `DPA request: ${company}`,
      requestId,
      source: "web-form",
      createdAt,
      priority: "normal",
      fields: {
        fullName,
        email,
        company,
        country: country || "-",
        notes: notes || "-",
      },
    });
    webhookSent = true;
  } catch (error) {
    console.error("[legal:dpa-request] webhook dispatch failed", error);
  }

  if (!emailSent && !webhookSent) {
    return NextResponse.json(
      { ok: false, error: "Nepodarilo sa doručiť žiadosť. Skúste to znova o chvíľu." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    requestId,
    message: emailSent
      ? "Žiadosť prijatá. Legal tím vás bude kontaktovať."
      : "Žiadosť prijatá v záložnom režime. Legal tím vás bude kontaktovať.",
    degradedDelivery: !emailSent,
  });
}
