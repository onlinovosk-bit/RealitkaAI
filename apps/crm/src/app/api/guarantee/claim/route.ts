import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      email?: string;
      agencyName?: string;
      plan?: string;
      claimReason?: string;
    };

    if (!body.email || !body.claimReason) {
      return NextResponse.json(
        { error: "Email a dôvod reklamácie sú povinné." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let profileId: string | null = null;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();
      profileId = profile?.id ?? null;
    }

    const { error } = await supabase.from("roi_guarantee_claims").insert({
      profile_id: profileId,
      email: body.email.toLowerCase().trim(),
      agency_name: body.agencyName ?? null,
      plan: body.plan ?? "pro",
      claim_reason: body.claimReason,
      status: "pending",
    });

    if (error) throw error;

    // Notifikácia na legal@revolis.ai
    await resend.emails.send({
      from: "Revolis.AI <support@revolis.ai>",
      to: "legal@revolis.ai",
      subject: `🔔 Nová ROI Guarantee reklamácia – ${body.email}`,
      text: `
Nová ROI Guarantee reklamácia:

Email: ${body.email}
Kancelária: ${body.agencyName ?? "neuvedené"}
Plán: ${body.plan ?? "neuvedené"}
Dôvod: ${body.claimReason}
Čas: ${new Date().toLocaleString("sk-SK")}

Riešiť do 5 pracovných dní.
      `,
    });

    // Potvrdenie zákazníkovi
    await resend.emails.send({
      from: "Revolis.AI <support@revolis.ai>",
      to: body.email,
      subject: "Revolis.AI – Prijali sme vašu žiadosť o vrátenie",
      text: `
Dobrý deň,

prijali sme vašu žiadosť o vrátenie platby v rámci 30-dňovej
ROI garancie.

Váš prípad preskúmame do 5 pracovných dní a odpíšeme na
tento email.

Ak máte otázky: legal@revolis.ai

Tím Revolis.AI
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[guarantee/claim] Error:", err);
    return NextResponse.json(
      { error: "Nepodarilo sa spracovať žiadosť." },
      { status: 500 }
    );
  }
}
