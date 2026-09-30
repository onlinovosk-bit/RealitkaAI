import { emitPlatformEventServer } from "@/lib/platform-events-server";
import { AI_CALL_FAILED_EVENT } from "@/lib/platform-events-visibility";
import type { AiFailure } from "./ai-failure";

export { AI_CALL_FAILED_EVENT };

/**
 * Trvalý záznam zlyhaného AI kroku na leade — prežije aj retenciu Vercel logov (~1 h),
 * takže sa dôvod dá prečítať aj o hodiny neskôr:
 *
 *   select created_at, payload from platform_events
 *   where event_type = 'ai.call_failed' order by created_at desc;
 *
 * Payload nesie iba kód dôvodu, HTTP status, typ chyby, request-id, názov funkcie a ID
 * leadu — nikdy text chyby ani obsah správy (viď ai-failure.ts). `platform_events` číta
 * aj tenant (RLS), preto sem nepatrí nič, čo by klient nemal vidieť. SSE stream tenanta
 * tento typ udalosti nevysiela (viď platform-events-visibility.ts).
 *
 * Best-effort: nikdy nehádže. Stratený záznam je len horšia diagnostika; stratený lead nie.
 */
export async function recordAiFailureEvent(input: {
  agencyId: string | null;
  leadId?: string | null;
  feature: string;
  failure: AiFailure;
}): Promise<void> {
  try {
    await emitPlatformEventServer({
      agencyId: input.agencyId,
      eventType: AI_CALL_FAILED_EVENT,
      payload: {
        feature: input.feature,
        lead_id: input.leadId ?? null,
        reason: input.failure.reason,
        http_status: input.failure.httpStatus,
        error_type: input.failure.errorType,
        error_name: input.failure.errorName,
        request_id: input.failure.requestId,
      },
    });
  } catch (e) {
    console.warn("[ai-failure] record failed:", e instanceof Error ? e.message : String(e));
  }
}
