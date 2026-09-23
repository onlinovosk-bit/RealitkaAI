export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateAssignmentRule, deleteAssignmentRule } from "@/lib/lead-automation-store";

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

  return { ok: true as const, supabase, agencyId: profile.agency_id as string };
}

/**
 * Fail-closed ownership: rule must exist in caller's agency.
 * Legacy path selected non-existent agency_id and treated missing row as ok (demo),
 * which with open RLS allowed cross-tenant PATCH/DELETE.
 */
async function assertRuleOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ruleId: string,
  agencyId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data: rule, error } = await supabase
    .from("lead_assignment_rules")
    .select("id, agency_id")
    .eq("id", ruleId)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }
  if (!rule) {
    return { ok: false, status: 404, error: "Pravidlo sa nenašlo." };
  }
  if (rule.agency_id !== agencyId) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await requireCallerAgency();
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const ownership = await assertRuleOwned(auth.supabase, id, auth.agencyId);
    if (!ownership.ok) {
      return NextResponse.json({ ok: false, error: ownership.error }, { status: ownership.status });
    }

    const body = await request.json();
    const rule = await updateAssignmentRule(
      id,
      auth.agencyId,
      {
        name: body.name,
        profileIds: body.profileIds,
        criteria: body.criteria,
        active: body.active,
      },
      auth.supabase,
    );

    return NextResponse.json({ ok: true, rule });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Nepodarilo sa aktualizovať pravidlo.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await requireCallerAgency();
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const ownership = await assertRuleOwned(auth.supabase, id, auth.agencyId);
    if (!ownership.ok) {
      return NextResponse.json({ ok: false, error: ownership.error }, { status: ownership.status });
    }

    await deleteAssignmentRule(id, auth.agencyId, auth.supabase);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Nepodarilo sa vymazať pravidlo.",
      },
      { status: 400 },
    );
  }
}
