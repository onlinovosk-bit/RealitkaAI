import { errorResponse, okResponse } from "@/lib/api-response";
import { createServiceRoleClient } from "@/lib/supabase/admin";

function plusDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function POST(request: Request) {
  const supabase = createServiceRoleClient();
  if (!supabase) return errorResponse("Service role nie je nakonfigurovaný.", 500);

  const body = (await request.json()) as { progressId?: string; startAt?: string };
  const progressId = (body.progressId ?? "").trim();
  if (!progressId) return errorResponse("progressId je povinné.", 400);

  const base = body.startAt ? new Date(body.startAt) : new Date();
  const schedule = [
    { message_day: "d1", scheduled_for: plusDays(base, 1) },
    { message_day: "d3", scheduled_for: plusDays(base, 3) },
    { message_day: "d7", scheduled_for: plusDays(base, 7) },
  ];

  const payload = schedule.map((row) => ({ ...row, progress_id: progressId }));
  const { data, error } = await supabase
    .from("client_onboarding_messages")
    .upsert(payload, { onConflict: "progress_id,message_day" })
    .select("*");

  if (error) return errorResponse(error.message, 500);
  return okResponse({ scheduled: data?.length ?? 0, messages: data ?? [] });
}

