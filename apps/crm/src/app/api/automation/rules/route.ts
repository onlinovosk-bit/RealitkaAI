import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAssignmentRule, listAssignmentRules } from "@/lib/lead-automation-store";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";

async function requireCallerAgency() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.agency_id) {
    return { ok: false as const, status: 403, error: "Chýba agency_id na profile." };
  }

  return { ok: true as const, supabase, agencyId: profile.agency_id as string, user };
}

export async function GET() {
  try {
    const auth = await requireCallerAgency();
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const rules = await listAssignmentRules(auth.agencyId, auth.supabase);
    return NextResponse.json({ ok: true, rules });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Nepodarilo sa načítať pravidlá." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireCallerAgency();
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const rateLimitBlock = await checkAiRateLimit(auth.user.id, "automation:create", 20);
    if (rateLimitBlock) return NextResponse.json(rateLimitBlock, { status: 429 });

    const body = await request.json();
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ ok: false, error: "name je povinné pole." }, { status: 400 });
    }
    const rule = await createAssignmentRule(
      {
        agencyId: auth.agencyId,
        name: body.name,
        ruleType: body.ruleType,
        profileIds: body.profileIds,
        criteria: body.criteria,
      },
      auth.supabase,
    );
    return NextResponse.json({ ok: true, rule });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Nepodarilo sa vytvoriť pravidlo." },
      { status: 400 },
    );
  }
}
