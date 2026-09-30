// Resend webhooks: inbound replies + email.opened / email.clicked (lead_id tag)
//
// ENGAGEMENT-EMAIL-01 — dve zmeny oproti pôvodnej verzii:
//
// 1. Otvorenie a klik končia v `events`, nie v `Map`-e v pamäti procesu.
//    Pôvodné `recordEmailOpen` / `recordEmailClick` zapisovali do modulovej
//    premennej, ktorá na serverless zmizne s inštanciou — a `getEmailEngagement`
//    nemal v repe ani jedného volajúceho. Signál sa prijímal a zahadzoval.
//
// 2. Podpis sa overuje vždy. Pôvodné `if (webhookSecret)` znamenalo, že pri
//    chýbajúcej premennej sa kontrola preskočila a endpoint prijal čokoľvek.
//    Tá istá trieda chyby, akú repo už raz zavrelo pod GO
//    FIX-CRON-SECRET-FAIL-CLOSED a potom pri Concierge (#717): chýbajúca
//    premenná je chyba konfigurácie, nie povolenie. Teraz vracia 503.
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { recordEmailEngagement } from "@/lib/events/email-engagement";
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
  if (!webhookSecret) {
    // Fail-closed: bez tajomstva sa podpis overiť nedá, takže endpoint nesmie
    // nič prijať. Do `events` sa cezeň zapisuje — otvorený by znamenal, že
    // ktokoľvek vie vyrobiť engagement signál pre ľubovoľný lead.
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET nie je nastavený");
    return NextResponse.json(
      { ok: false, error: "Webhook nie je nakonfigurovaný." },
      { status: 503 },
    );
  }

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

  const body = JSON.parse(rawBody) as Record<string, unknown>;
  const type = typeof body.type === "string" ? body.type : "";
  const createdAt =
    typeof body.created_at === "string" ? body.created_at : new Date().toISOString();
  const data = body.data as Record<string, unknown> | undefined;

  if (type === "email.opened" || type === "email.clicked") {
    const leadId = leadIdFromTags(data?.tags);
    if (!leadId) {
      // E-mail bez tagu sa k leadu priradiť nedá. Nie je to chyba volajúceho,
      // ale bez `handled` by sa to tvárilo, že sa niečo zapísalo.
      return NextResponse.json({ ok: true, handled: type, recorded: false, reason: "bez lead_id tagu" });
    }

    // Webhook nemá session — service-role, inak RLS insert odmietne
    // (EVENTS-WRITE-PATH-01).
    const result = await recordEmailEngagement(createAdminClient(), {
      leadId,
      kind:       type === "email.opened" ? "opened" : "clicked",
      occurredAt: createdAt,
    });

    return NextResponse.json({
      ok: true,
      handled:  type,
      recorded: result.recorded,
      reason:   result.reason,
    });
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
