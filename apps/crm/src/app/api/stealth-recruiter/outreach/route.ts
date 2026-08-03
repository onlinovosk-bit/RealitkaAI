import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { callOpenAI } from "@/lib/ai/openai";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";
import { checkCapabilityAccess } from "@/lib/license/access";
import { updateStealthProspectStatus } from "@/lib/stealth-recruiter/store";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function capabilityErrorResponse(access: Awaited<ReturnType<typeof checkCapabilityAccess>>) {
  if (access.reason === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (access.reason === "no_profile") {
    return NextResponse.json({ error: "Profil nebol nájdený." }, { status: 404 });
  }
  if (access.reason === "no_agency") {
    return NextResponse.json(
      { error: "Chýba agency_id v profile — tenant scope nie je nastavený." },
      { status: 400 },
    );
  }
  return NextResponse.json(
    {
      error: "Tichý Náborár vyžaduje program Reality Monopol (Protocol Authority).",
      currentTier: access.tier,
      upgradeUrl: "/billing",
    },
    { status: 403 },
  );
}

async function logOutreachSendBestEffort(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  profileId: string;
  prospectId?: string;
  address: string;
  recipientEmail: string;
  agentName: string;
}) {
  try {
    await input.supabase.from("activities").insert({
      profile_id: input.profileId,
      type: "Stealth Recruiter",
      title: "Outreach odoslaný",
      text: `Stealth Recruiter → ${input.recipientEmail} (${input.address})`,
      entity_type: "stealth_recruiter_prospect",
      entity_id: input.prospectId ?? null,
      actor_name: input.agentName,
      source: "stealth_recruiter",
      severity: "info",
      meta: {
        address: input.address,
        recipientEmail: input.recipientEmail,
        annexH: "stealth_recruiter_outreach_send",
      },
    });
  } catch (err) {
    console.warn("[stealth-recruiter/outreach] audit log failed:", err);
  }
}

/**
 * ZAKÁZANÁ AKCIA (brain/identity/FOUNDER.md).
 *
 * Stealth Recruiter je natrvalo vypnutý dvoma pravidlami zo ZAKÁZANÝCH AKCIÍ:
 *   1) „Žiadne obnovenie stealth recruitera"
 *   2) „Žiadne automatické odosielanie emailov prospektom bez ľudského
 *      schválenia (drafty áno, send nikdy)"
 *
 * Route posielala studené e-maily majiteľom nehnuteľností z domény
 * noreply@revolis.ai bez opt-out vety. Rovnaká doména doručuje notifikácie
 * platiacim zákazníkom — sťažnosť by poškodila doručovanie celého produktu.
 *
 * Kód sa ponecháva pre históriu, ale handler končí na 410 Gone PRED
 * akoukoľvek autentifikáciou, volaním OpenAI alebo odoslaním e-mailu.
 * Zapnutie vyžaduje výslovné rozhodnutie foundera zapísané v memory/decisions.md.
 *
 * Audit: docs/audit/2026-08-02-profit-leak-audit.md · nález C1
 */
const STEALTH_RECRUITER_DISABLED = {
  error: "Stealth Recruiter je natrvalo vypnutý (ZAKÁZANÁ AKCIA).",
  reference: "brain/identity/FOUNDER.md — ZAKÁZANÉ AKCIE",
} as const;

export async function POST(request: Request) {
  return NextResponse.json(STEALTH_RECRUITER_DISABLED, { status: 410 });
  // eslint-disable-next-line no-unreachable
  const access = await checkCapabilityAccess("canUseStealthRecruiter");
  if (!access.allowed) {
    return capabilityErrorResponse(access);
  }

  const block = await checkAiRateLimit(access.userId!, "stealth-outreach", 15);
  if (block) return NextResponse.json(block, { status: 429 });

  try {
    const body = (await request.json()) as {
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

    const priceDrop =
      body.originalPrice && body.currentPrice
        ? Math.round(((body.originalPrice - body.currentPrice) / body.originalPrice) * 100)
        : 0;

    const platformLabel: Record<string, string> = {
      bazos: "Bazoš.sk",
      nehnutelnosti: "Nehnuteľnosti.sk",
      reality: "Reality.sk",
      facebook: "Facebook Marketplace",
      other: "portáli",
    };

    const agentName = body.agentName ?? "AI Asistent Revolis";
    const supabase = await createClient();
    const agencyId = access.agencyId!;

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
      model: "gpt-4o",
      max_tokens: 400,
      temperature: 0.75,
      tag: "stealth-outreach",
      messages: [
        { role: "system", content: "Si slovenský realitný expert. Píš prirodzene, bez floskúl." },
        { role: "user", content: prompt },
      ],
    });

    if (body.prospectId) {
      await updateStealthProspectStatus(
        agencyId,
        body.prospectId,
        {
          outreachMessage: outreachText,
          status: "outreached",
        },
        supabase,
      );
    }

    if (body.action === "send" && body.recipientEmail && EMAIL_REGEX.test(body.recipientEmail)) {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey?.startsWith("re_")) {
        const resend = new Resend(resendKey);
        await resend.emails
          .send({
            from: "AI Asistent <noreply@revolis.ai>",
            to: body.recipientEmail,
            subject: `Informácia k inzerátu: ${body.address}`,
            html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#fafafa;border-radius:12px;">
              <pre style="white-space:pre-wrap;font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#1e293b;">${outreachText}</pre>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
              <p style="color:#9ca3af;font-size:11px">Odoslané cez Revolis.AI Stealth Recruiter</p>
            </div>
          `,
          })
          .catch(console.warn);
      }

      if (access.profileId) {
        await logOutreachSendBestEffort({
          supabase,
          profileId: access.profileId,
          prospectId: body.prospectId,
          address: body.address,
          recipientEmail: body.recipientEmail,
          agentName,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      outreachText,
      prospectId: body.prospectId,
    });
  } catch (err) {
    console.error("[stealth-recruiter/outreach]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generovanie outreachu zlyhalo." },
      { status: 500 },
    );
  }
}
