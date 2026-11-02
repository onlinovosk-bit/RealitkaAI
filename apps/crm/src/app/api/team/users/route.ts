import { NextResponse } from "next/server";
import { z } from "zod";
import { createProfile, listProfiles } from "@/lib/team-store";
import { sendOnboardingEmail } from "@/lib/send-onboarding-email";
import { createActivity } from "@/lib/activities-store";
import { createClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";
import { DB_ROLES, type DbRole } from "@/lib/role-config";

// Same allowlist as /api/invite — body.role must not mint founder/admin/senior.
const CREATABLE_ROLES: readonly DbRole[] = [
  DB_ROLES.OWNER,
  DB_ROLES.MANAGER,
  DB_ROLES.AGENT,
];

const CreateUserBody = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email().max(254),
  role: z.enum([DB_ROLES.OWNER, DB_ROLES.MANAGER, DB_ROLES.AGENT]),
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

    const rateLimitBlock = await checkAiRateLimit(user.id, "team:create-user", 10);
    if (rateLimitBlock) return NextResponse.json(rateLimitBlock, { status: 429 });

    const rawBody = await request.json();
    const parsed = CreateUserBody.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 });
    }
    const body = parsed.data;

    // Owner/founder only — an agent must not mint owner/manager rows that
    // `linkProfileToAuthUser` later attaches on login (privilege escalation).
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role, agency_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (callerProfile?.role !== "owner" && callerProfile?.role !== "founder") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    if (!callerProfile.agency_id) {
      return NextResponse.json(
        { ok: false, error: "Váš profil nemá priradenú agentúru." },
        { status: 403 },
      );
    }
    // Agency comes only from the caller profile — never from the request body.
    const agencyId = callerProfile.agency_id;

    if (!CREATABLE_ROLES.includes(body.role)) {
      return NextResponse.json({ ok: false, error: "Neplatná rola." }, { status: 400 });
    }

    const profile = await createProfile({
      agencyId,
      teamId: body.teamId ?? null,
      fullName: body.fullName,
      email: body.email,
      role: body.role,
      phone: body.phone ?? "",
    }, supabase);

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
    }, supabase);

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
