/**
 * GET /api/events/stream
 * SSE: poll platform_events (DB) namiesto slepého TICKu – vyžaduje prihlásenie.
 */

export const runtime = "nodejs";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const agencyId = profile?.agency_id ?? null;

  let cursor = new Date().toISOString();
  let intervalRef: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "CONNECTED",
            mode: "platform_events_poll",
            at: new Date().toISOString(),
          })}\n\n`
        )
      );

      const poll = async () => {
        try {
          let q = supabase
            .from("platform_events")
            .select("id,event_type,payload,created_at,agency_id")
            .gt("created_at", cursor)
            .order("created_at", { ascending: true })
            .limit(50);

          if (agencyId) {
            q = q.or(`agency_id.eq.${agencyId},agency_id.is.null`);
          } else {
            q = q.is("agency_id", null);
          }

          const { data, error } = await q;

          if (error) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "POLL_ERROR",
                  message: error.message,
                  at: new Date().toISOString(),
                })}\n\n`
              )
            );
            return;
          }

          for (const row of data ?? []) {
            cursor = row.created_at;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: row.event_type,
                  id: row.id,
                  payload: row.payload,
                  agencyId: row.agency_id,
                  at: row.created_at,
                })}\n\n`
              )
            );
          }
        } catch {
          /* ignore */
        }
      };

      intervalRef = setInterval(() => void poll(), 2500);
      void poll();
    },
    cancel() {
      if (intervalRef) {
        clearInterval(intervalRef);
        intervalRef = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
