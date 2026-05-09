import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { callOpenAI } from "@/lib/ai/openai";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const supabaseAuth = await createServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const block = await checkAiRateLimit(user.id, "stealth-outreach", 15);
  if (block) return NextResponse.json(block, { status: 429 });

  try {
    const body = await request.json() as {
      prospectId?: string;
      address?: string;
      daysListed?: number;
      originalPrice?: number;
      currentPrice?: number;
      platform?: string;
      agentName?: string;
      recipientEmail?: string;
      action?: "generate" | "send";
    };

    if (!body.address) {
      return NextResponse.json({ error: "Adresa nehnuteľnosti chýba." }, { status: 400 });
    }

    const priceDrop = body.originalPrice && body.currentPrice
      ? Math.round((body.originalPrice - body.currentPrice) / body.originalPrice * 100)
      : 0;

    const platformLabel: Record<string, string> = {
      bazos:          "Bazoš.sk",
      nehnutelnosti:  "Nehnuteľnosti.sk",
      reality:        "Reality.sk",
      facebook:       "Facebook Marketplace",
      other:          "portáli",
    };

    const agentName = body.agentName ?? "AI Asistent Revolis";

    // ─── Generuj outreach script cez AI ─────────────────────────────────
    const prompt = `Si top realitný maklér na Slovensku. Napíš personalizovanú správu pre samopredajcu nehnuteľnosti.

Situácia:
- Adresa: ${body.address}
- Inzeruje na: ${platformLabel[body.platform ?? "other"] ?? "portáli"}
- Počet dní v inzeráte: ${body.daysListed ?? "neznámo"}
- Pôvodná cena: ${body.originalPrice?.toLocaleString("sk-SK") ?? "neznáma"} €
- Aktuálna cena: ${body.currentPrice?.toLocaleString("sk-SK") ?? "neznáma"} €
- Zníženie ceny: ${priceDrop}%

Napíš krátku, priateľskú správu (SMS/email štýl, max 5 viet):
1. Empathia s frustráciou dlhého predaja
2. Konkrétny insight (zníženie ceny signalizuje problém s marketingom, nie s nehnuteľnosťou)
3. Bezplatná ponuka: profesionálny audit + realistická cena do 24h
4. Jednoduché CTA: odpísať alebo zavolať
5. Podpis: ${agentName}

Vráť IBA text správy (bez uvodzoviek). Tón: ľudský, nie korporátny.`;

    const { content: outreachText } = await callOpenAI({
      model:       "gpt-4o",
      max_tokens:  400,
      temperature: 0.75,
      tag:         "stealth-outreach",
      messages: [
        { role: "system", content: "Si slovenský realitný expert. Píš prirodzene, bez floskúl." },
        { role: "user",   content: prompt },
      ],
    });

    // Ulož outreach do DB
    const supabase = createAdminClient();
    if (body.prospectId) {
      try {
        await supabase
          .from("stealth_recruiter_prospects")
          .update({ ai_outreach: outreachText, status: "outreached" })
          .eq("id", body.prospectId);
      } catch { /* ignore */ }
    }

    // ─── Odoslať email ak action=send ────────────────────────────────────
    if (body.action === "send" && body.recipientEmail && EMAIL_REGEX.test(body.recipientEmail)) {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey?.startsWith("re_")) {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from:    "AI Asistent <noreply@revolis.ai>",
          to:      body.recipientEmail,
          subject: `Informácia k inzerátu: ${body.address}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#fafafa;border-radius:12px;">
              <pre style="white-space:pre-wrap;font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#1e293b;">${outreachText}</pre>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
              <p style="color:#9ca3af;font-size:11px">Odoslané cez Revolis.AI Stealth Recruiter</p>
            </div>
          `,
        }).catch(console.warn);
      }
    }

    return NextResponse.json({
      ok:           true,
      outreachText,
      prospectId:   body.prospectId,
    });
  } catch (err) {
    console.error("[stealth-recruiter/outreach]", err);
    return NextResponse.json(
      { error: "Generovanie outreachu zlyhalo." },
      { status: 500 }
    );
  }
}
