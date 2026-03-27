import { NextResponse } from "next/server";
import { createProfile, listProfiles } from "@/lib/team-store";
import { sendOnboardingEmail } from "@/lib/send-onboarding-email";
import { createActivity } from "@/lib/activities-store";

export async function GET() {
  try {
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
    const body = await request.json();


    const profile = await createProfile({
      agencyId: body.agencyId,
      teamId: body.teamId || null,
      fullName: body.fullName,
      email: body.email,
      role: body.role,
      phone: body.phone,
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
