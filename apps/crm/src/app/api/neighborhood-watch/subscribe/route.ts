import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; area?: string; address?: string };

    if (!body.email || !EMAIL_REGEX.test(body.email)) {
      return NextResponse.json({ error: "Zadajte platný email." }, { status: 400 });
    }

    const area = (body.area ?? body.address ?? "presov")
      .toLowerCase()
      .replace(/[^a-záäčďéíľňóôŕšťúýž\s]/g, "")
      .trim()
      .slice(0, 100);

    const supabase = getServiceClient();

    const { error } = await supabase.from("neighborhood_subscriptions").upsert(
      { email: body.email.toLowerCase().trim(), area },
      { onConflict: "email,area" }
    );

    if (error && error.code !== "23505") {
      console.warn("[neighborhood-watch/subscribe] Supabase upsert:", error.message);
      // Pokračuj — môže chýbať tabuľka, ale email potvrdíme aj tak
    }

    // Potvrdzovacie email cez Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey?.startsWith("re_")) {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: "AI Asistent <noreply@revolis.ai>",
          to: body.email,
          subject: `Sledovanie lokality aktivované: ${area}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#050914;color:#f0f9ff;padding:32px;border-radius:16px;">
              <h2 style="color:#60A5FA;margin-top:0">Neighborhood Watch Aktívny</h2>
              <p>Sledovanie lokality <strong>${area}</strong> bolo aktivované.</p>
              <p style="color:#64748b">Budete upozornení na každý pohyb cien, nové ponuky a predaje vo vašej lokalite.</p>
              <div style="background:rgba(99,102,241,0.10);border:1px solid rgba(99,102,241,0.20);border-radius:12px;padding:16px;margin:24px 0">
                <p style="margin:0;font-size:13px;color:#94a3b8">Chcete vidieť všetky trendy v reálnom čase?</p>
                <a href="https://app.revolis.ai/register" style="display:inline-block;margin-top:12px;background:#3B82F6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Aktivovať dashboard</a>
              </div>
              <p style="color:#334155;font-size:12px">Revolis.AI · Zrušiť odber: reply na tento email</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.warn("[neighborhood-watch/subscribe] Resend error:", emailErr);
      }
    }

    return NextResponse.json({ ok: true, area });
  } catch (err) {
    console.error("[neighborhood-watch/subscribe]", err);
    return NextResponse.json({ error: "Interná chyba." }, { status: 500 });
  }
}
