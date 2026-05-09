import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";
import { Resend } from "resend";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const block = await checkAiRateLimit(user.id, "send-email", 20);
  if (block) return NextResponse.json(block, { status: 429 });

  try {
    const body = await request.json() as {
      letterId?:       string;
      recipientEmail?: string;
      letterHtml?:     string;
      ownerAddress?:   string;
      agentEmail?:     string;
    };

    if (!body.recipientEmail || !EMAIL_REGEX.test(body.recipientEmail)) {
      return NextResponse.json({ error: "Zadajte platný email príjemcu." }, { status: 400 });
    }

    if (!body.letterHtml?.trim()) {
      return NextResponse.json({ error: "Obsah listu chýba." }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey?.startsWith("re_")) {
      return NextResponse.json({ error: "Email service nie je nakonfigurovaný." }, { status: 503 });
    }

    const resend   = new Resend(resendKey);
    const fromEmail = process.env.OUTREACH_FROM_EMAIL?.includes("revolis.ai")
      ? `AI Asistent <noreply@revolis.ai>`
      : `AI Asistent <onboarding@resend.dev>`;

    const { data, error } = await resend.emails.send({
      from:    fromEmail,
      to:      body.recipientEmail,
      replyTo: body.agentEmail ?? undefined,
      subject: `Informácia k Vašej nehnuteľnosti: ${body.ownerAddress ?? "zmena na LV"}`,
      html: `
        <div style="font-family:Georgia,serif;max-width:620px;margin:0 auto;background:#ffffff;padding:0;">
          <div style="background:#050914;padding:24px 32px;border-radius:12px 12px 0 0;">
            <p style="color:#60A5FA;font-family:sans-serif;font-size:11px;font-weight:bold;letter-spacing:0.2em;text-transform:uppercase;margin:0">
              REVOLIS.AI · AI Ghostwriter
            </p>
          </div>
          <div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            ${body.letterHtml}
            <hr style="border:none;border-top:1px solid #f3f4f6;margin:32px 0"/>
            <p style="color:#9ca3af;font-size:11px;font-family:sans-serif">
              Tento list bol vygenerovaný systémom Revolis.AI ·
              <a href="https://app.revolis.ai" style="color:#3B82F6">app.revolis.ai</a>
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[ghostwriter/send-email] Resend error:", error);
      throw new Error((error as { message?: string }).message ?? "Email sa nepodarilo odoslať.");
    }

    if (body.letterId && !body.letterId.startsWith("tmp_")) {
      const admin = createAdminClient();

      // Resolve caller's profile_id once
      const { data: callerProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (callerProfile) {
        // Verify ownership before updating — only update if the letter belongs to this profile
        const { data: letter } = await admin
          .from("ghostwriter_letters")
          .select("profile_id")
          .eq("id", body.letterId)
          .maybeSingle();

        if (!letter || letter.profile_id === callerProfile.id) {
          // letter.profile_id is null (no ownership column yet) OR matches caller — safe to update
          await admin
            .from("ghostwriter_letters")
            .update({ email_sent_to: body.recipientEmail, sent_at: new Date().toISOString() })
            .eq("id", body.letterId);
        }
        // else: letter belongs to a different profile — skip silently
      }
    }

    return NextResponse.json({ ok: true, emailId: (data as { id?: string } | null)?.id });
  } catch (err) {
    console.error("[ghostwriter/send-email]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Neznáma chyba." },
      { status: 500 }
    );
  }
}
