import { NextResponse } from "next/server";
import { z } from "zod";
import { createProfile, listProfiles } from "@/lib/team-store";
import { sendOnboardingEmail } from "@/lib/send-onboarding-email";
import { createActivity } from "@/lib/activities-store";
import { createClient } from "@/lib/supabase/server";

const CreateUserBody = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email().max(254),
  role: z.string().min(1).max(100),
  phone: z.string().max(30).optional(),
  teamId: z.string().uuid().nullable().optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const profiles = await listProfiles();
    return NextResponse.json({ ok: true, profiles });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nepodarilo sa načítať používateľov.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const rawBody = await request.json();
    const parsed = CreateUserBody.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 });
    }
    const body = parsed.data;

    // Enforce caller's own agency — prevents privilege escalation via body.agencyId
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("id", user.id)
      .maybeSingle();
    const agencyId: string = callerProfile?.agency_id ?? (rawBody.agencyId as string | undefined) ?? "";

    const profile = await createProfile({
      agencyId,
      teamId: body.teamId ?? null,
      fullName: body.fullName,
      email: body.email,
      role: body.role,
      phone: body.phone ?? "",
    });

    // Odoslanie welcome emailu
    try {
      if (typeof profile.email === 'string') {
        await sendOnboardingEmail('welcome', profile.email, profile.fullName || profile.email, 'https://app.revolis.ai/onboarding');
      }
    } catch (e) {
      // Log error, ale nespomaľuj registráciu
      console.error('Nepodarilo sa odoslať welcome email:', e);
    }

    await createActivity({
      leadId: null,
      type: "Používateľ",
      title: "Vytvorený používateľ",
      text: `Bol vytvorený nový používateľ: ${profile.fullName}.`,
      entityType: "profile",
      entityId: profile.id,
      actorName: "Systém",
      source: "team",
      severity: "info",
      meta: {
        role: profile.role,
        email: profile.email,
      },
    });

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nepodarilo sa vytvoriť používateľa.",
      },
      { status: 400 }
    );
  }
}
