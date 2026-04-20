import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDealStrategy } from "@/lib/ai/deal-strategy";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).single();
  if (!lead) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const strategy = await generateDealStrategy(lead as Record<string, unknown>);
  return NextResponse.json({ ok: true, strategy });
}
