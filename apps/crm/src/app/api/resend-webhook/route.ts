// Resend webhooks: inbound replies + email.opened / email.clicked (lead_id tag)
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { recordEmailClick, recordEmailOpen } from "@/lib/ai/email-engagement-store";
import { storeReply } from "@/lib/email-tracking";

export const runtime = "nodejs";

function leadIdFromTags(tags: unknown): string | null {
  if (!tags || typeof tags !== "object") return null;
  const t = tags as Record<string, string>;
  const raw = t.lead_id ?? t.leadId;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = req.headers.get("svix-signature") ?? "";
    const hmac = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    let sigValid = false;
    try {
      sigValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hmac));
    } catch {
      // length mismatch — treated as invalid
    }
    if (!sigValid) {
      return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
    }
  }

  const body = JSON.parse(rawBody) as Record<string, unknown>;
  const type = typeof body.type === "string" ? body.type : "";
  const createdAt =
    typeof body.created_at === "string" ? body.created_at : new Date().toISOString();
  const data = body.data as Record<string, unknown> | undefined;

  if (type === "email.opened" || type === "email.clicked") {
    const leadId = leadIdFromTags(data?.tags);
    if (leadId) {
      if (type === "email.opened") recordEmailOpen(leadId, createdAt);
      else recordEmailClick(leadId, createdAt);
    }
    return NextResponse.json({ ok: true, handled: type });
  }

  // Legacy / custom payload: { to, text, date }
  const to = body.to as string | undefined;
  const content = body.text as string | undefined;
  const receivedAt = (body.date as string) || createdAt;
  const match = to?.match(/lead\+([\w-]+)@/);
  const legacyLeadId = match ? match[1] : null;
  if (legacyLeadId && content) {
    await storeReply({ leadId: legacyLeadId, content, receivedAt });
  }

  return NextResponse.json({ ok: true });
}
