import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";

const SEGMENT_THRESHOLDS = [
  { segment: "Horúci (80+)", min: 80 },
  { segment: "Teplý (50–79)", min: 50 },
  { segment: "Studený (<50)", min: 0 },
];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const block = await checkAiRateLimit(user.id, "monthly-forecast", 5);
  if (block) return NextResponse.json(block, { status: 429 });

  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", user.id).single();

  const { data: leads } = await supabase
    .from("leads")
    .select("score, budget")
    .eq("is_active", true)
    .eq("assigned_profile_id", profile?.id ?? "");

  const rows = (leads ?? []).map((l) => ({
    score: typeof l.score === "number" ? l.score : 50,
    budget: typeof l.budget === "number" ? l.budget : 0,
  }));

  const totalExpectedEur = rows.reduce((sum, l) => sum + l.budget * (l.score / 100), 0);

  const breakdown = SEGMENT_THRESHOLDS.map(({ segment, min }, i) => {
    const maxScore = SEGMENT_THRESHOLDS[i - 1]?.min ?? 101;
    const segLeads = rows.filter((l) => l.score >= min && l.score < maxScore);
    return {
      segment,
      count: segLeads.length,
      expectedEur: segLeads.reduce((s, l) => s + l.budget * (l.score / 100), 0),
    };
  });

  const monthLabel = new Date().toLocaleString("sk-SK", { month: "long", year: "numeric" });

  return NextResponse.json({
    ok: true,
    monthLabel,
    totalExpectedEur: Math.round(totalExpectedEur),
    breakdown,
    trend: null,
  });
}
