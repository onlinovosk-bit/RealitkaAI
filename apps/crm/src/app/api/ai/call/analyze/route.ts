import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { analyzeCall } from "@/lib/ai/call-analysis";
import { persistCallAnalysisToCrm } from "@/lib/workflows/call-analysis-persist";
import { UUIDSchema } from "@/lib/api-validate";
import { sameAgency } from "@/lib/tenant-scope";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { transcript?: string; lead_id?: string; persist_to_crm?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const { transcript, lead_id, persist_to_crm } = body;
  if (!transcript) return NextResponse.json({ ok: false, error: "transcript required" }, { status: 400 });

  const result = await analyzeCall(transcript);

  let persisted: { activity_id?: string; task_id?: string } | undefined;

  if (persist_to_crm && lead_id) {
    const idValidation = UUIDSchema.safeParse(lead_id);
    if (!idValidation.success) {
      return NextResponse.json({ ok: false, error: "Invalid lead ID" }, { status: 400 });
    }

    const { data: callerProfile } = await supabase.from("profiles").select("agency_id").eq("auth_user_id", user.id).maybeSingle();

    const { data: leadRow } = await supabase.from("leads").select("agency_id").eq("id", lead_id).maybeSingle();
    // Fail closed — same shape as the HubSpot sync gate. `callerProfile?.agency_id &&`
    // short-circuits to "allowed" for a profile with no agency, which then wrote
    // activity and tasks against an arbitrary lead through the admin path.
    if (!callerProfile?.agency_id || leadRow?.agency_id !== callerProfile.agency_id) {
    // Fail closed pred admin zápisom: persist ide cez service-role klienta,
    // ktorý obchádza RLS, takže profil bez agentúry sa sem nesmie dostať.
    if (!sameAgency(callerProfile?.agency_id, leadRow?.agency_id)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    try {
      const admin = createAdminClient();
      const ids = await persistCallAnalysisToCrm(admin, lead_id, result);
      persisted = { activity_id: ids.activityId, task_id: ids.taskId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ ok: false, error: msg, analyze: result }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, ...result, persisted });
}
