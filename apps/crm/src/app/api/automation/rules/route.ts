import { NextResponse }  from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAssignmentRule, listAssignmentRules } from "@/lib/lead-automation-store";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";

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

    const rateLimitBlock = await checkAiRateLimit(user.id, "automation:create", 20);
    if (rateLimitBlock) return NextResponse.json(rateLimitBlock, { status: 429 });

    const body = await request.json();
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ ok: false, error: "name je povinné pole." }, { status: 400 });
    }
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
