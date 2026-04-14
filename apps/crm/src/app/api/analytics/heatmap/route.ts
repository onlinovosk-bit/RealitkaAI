/**
 * GET /api/analytics/heatmap
 *
 * Vracia hodinovú distribúciu aktivít klientov (0–23).
 * Query params:
 *   agentId  – voliteľný (zatiaľ ignorovaný, RLS filtruje automaticky)
 *   days     – koľko dní dozadu (default 30)
 */

import { okResponse, errorResponse } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { buildActivityHeatmap } from "@/services/analytics/heatmap";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get("days") ?? "30", 10), 90);

  const supabase = await createClient();

  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data: activities, error } = await supabase
    .from("activities")
    .select("created_at")
    .gte("created_at", since);

  if (error) {
    return errorResponse(`Nepodarilo sa načítať aktivity: ${error.message}`, 500);
  }

  const events = (activities ?? []).map((a) => ({ occurredAt: a.created_at }));
  const result = buildActivityHeatmap(events);

  return okResponse({ days, ...result });
}
