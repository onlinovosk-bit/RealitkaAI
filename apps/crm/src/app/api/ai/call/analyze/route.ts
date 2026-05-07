import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeCall } from "@/lib/ai/call-analysis";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { transcript?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }
  const { transcript } = body;
  if (!transcript) return NextResponse.json({ ok: false, error: "transcript required" }, { status: 400 });

  const result = await analyzeCall(transcript);
  return NextResponse.json({ ok: true, ...result });
}
