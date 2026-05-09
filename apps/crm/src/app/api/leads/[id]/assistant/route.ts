export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAssistantAnswer } from "@/lib/assistant-chat";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    const { data: callerProfile } = await supabase
      .from("profiles").select("agency_id").eq("id", user.id).maybeSingle();

    const { data: lead } = await supabase
      .from("leads").select("agency_id").eq("id", id).maybeSingle();

    if (callerProfile?.agency_id && lead?.agency_id !== callerProfile.agency_id) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { question } = await request.json();
    const result = await getAssistantAnswer(id, question);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, answer: result.answer });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Chyba" },
      { status: 500 }
    );
  }
}
