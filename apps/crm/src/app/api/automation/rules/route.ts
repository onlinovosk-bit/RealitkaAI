import { NextResponse }  from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAssignmentRule, listAssignmentRules } from "@/lib/lead-automation-store";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const rules = await listAssignmentRules();
    return NextResponse.json({ ok: true, rules });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Nepodarilo sa načítať pravidlá." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const rule = await createAssignmentRule({
      name:       body.name,
      ruleType:   body.ruleType,
      profileIds: body.profileIds,
      criteria:   body.criteria,
    });
    return NextResponse.json({ ok: true, rule });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Nepodarilo sa vytvoriť pravidlo." }, { status: 400 });
  }
}
