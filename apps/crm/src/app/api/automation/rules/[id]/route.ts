export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateAssignmentRule, deleteAssignmentRule } from "@/lib/lead-automation-store";

async function resolveOwnership(ruleId: string): Promise<{
  ok: boolean;
  agencyId?: string | null;
  status?: number;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };

  // Fetch the rule's agency_id alongside the user's own agency_id in one round-trip
  const [{ data: rule }, { data: profile }] = await Promise.all([
    supabase.from("lead_assignment_rules").select("agency_id").eq("id", ruleId).maybeSingle(),
    supabase.from("profiles").select("agency_id").eq("id", user.id).maybeSingle(),
  ]);

  // If table/row doesn't exist yet (graceful for demo mode), allow
  if (!rule) return { ok: true, agencyId: null };

  if (rule.agency_id && profile?.agency_id && rule.agency_id !== profile.agency_id) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, agencyId: profile?.agency_id ?? null };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ownership = await resolveOwnership(id);
    if (!ownership.ok) {
      return NextResponse.json({ ok: false, error: ownership.error }, { status: ownership.status });
    }

    const body = await request.json();
    const rule = await updateAssignmentRule(id, {
      name:       body.name,
      profileIds: body.profileIds,
      criteria:   body.criteria,
      active:     body.active,
    });

    return NextResponse.json({ ok: true, rule });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Nepodarilo sa aktualizovať pravidlo." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ownership = await resolveOwnership(id);
    if (!ownership.ok) {
      return NextResponse.json({ ok: false, error: ownership.error }, { status: ownership.status });
    }

    await deleteAssignmentRule(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Nepodarilo sa vymazať pravidlo." },
      { status: 400 }
    );
  }
}
