// Resend webhook endpoint for inbound email replies
import { NextRequest, NextResponse } from "next/server";
import { storeReply } from "@/lib/email-tracking";

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Resend webhook payload: https://resend.com/docs/webhooks
  // Example: { to: "lead+123@yourdomain.com", text: "...", date: "..." }
  const to = body.to as string;
  const content = body.text as string;
  const receivedAt = body.date as string;
  // Extract leadId from email alias (e.g. lead+123@...)
  const match = to.match(/lead\+(\w+)@/);
  const leadId = match ? match[1] : null;
  if (leadId && content) {
    await storeReply({ leadId, content, receivedAt });
  }
  return NextResponse.json({ ok: true });
}