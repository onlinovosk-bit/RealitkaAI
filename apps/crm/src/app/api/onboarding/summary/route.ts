import { okResponse, errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/onboarding/summary
 * Súhrn pre dokončenie onboardingu: leady, fázy (stavy), priemerné skóre.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return okResponse({
      authenticated: false,
      leadCount: 0,
      activePhases: 0,
      averageScore: null as number | null,
    });
  }

  try {
    const supabase = await createClient();
    const { data: rows, error } = await supabase.from("leads").select("status, score");

    if (error) {
      return okResponse({
        authenticated: true,
        leadCount: 0,
        activePhases: 0,
        averageScore: null as number | null,
        queryError: true,
      });
    }

    const list = rows ?? [];
    const leadCount = list.length;

    const statuses = new Set(
      list
        .map((r: { status: string | null }) => r.status)
        .filter((s): s is string => Boolean(s && String(s).trim()))
    );

    const scores = list
      .map((r: { score: unknown }) => Number(r.score))
      .filter((n) => !Number.isNaN(n));

    const averageScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;

    return okResponse({
      authenticated: true,
      leadCount,
      activePhases: statuses.size,
      averageScore,
    });
  } catch {
    return errorResponse("Nepodarilo sa načítať súhrn.", 500);
  }
}
