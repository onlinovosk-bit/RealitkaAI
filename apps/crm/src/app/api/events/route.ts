/**
 * POST /api/events — signály → skóre → Socket.IO + platform_events + uloženie leadu.
 */
export const runtime = "nodejs";

import { calculateLeadScore } from "@/lib/ai/scoring-engine";
import { ensureLearningDataLoaded } from "@/lib/ai/bootstrap-learning";
import { storeOutcome } from "@/lib/ai/learning-store";
import { getCurrentProfile } from "@/lib/auth";
import { okResponse, errorResponse } from "@/lib/api-response";
import { getLead, isSupabaseConfigured, updateLead } from "@/lib/leads-store";
import { emitLeadUpdate, getIOOptional } from "@/lib/realtime/server";
import { emitPlatformEventServer } from "@/lib/platform-events-server";

type Body = {
  leadId: string;
  signals: Record<string, number>;
  /** Voliteľne zaznamenaj výsledok pre auto-tune (bez ML). */
  converted?: boolean;
  /** Meta pre audit. */
  action?: string;
};

export async function POST(request: Request) {
  try {
    ensureLearningDataLoaded();

    const profile = await getCurrentProfile();
    if (isSupabaseConfigured() && !profile) {
      return errorResponse("Neautorizovaný prístup.", 401);
    }

    const body = (await request.json()) as Body;
    const leadId = String(body.leadId || "").trim();
    const signals = body.signals && typeof body.signals === "object" ? body.signals : null;

    if (!leadId || !signals) {
      return errorResponse("Chýba leadId alebo signals.", 400);
    }

    const existing = await getLead(leadId);
    if (!existing) {
      return errorResponse("Lead sa nenašiel.", 404);
    }

    const score = calculateLeadScore(signals);

    if (typeof body.converted === "boolean") {
      storeOutcome({ signals, converted: body.converted });
    }

    const lead = await updateLead(leadId, { score });

    const at = new Date().toISOString();
    const payload = {
      leadId,
      score,
      action: body.action ?? "signals",
      signals,
      at,
    };

    emitLeadUpdate({ leadId, score, source: "api/events", at });

    void emitPlatformEventServer({
      agencyId: profile?.agency_id ?? null,
      eventType: "lead:update",
      payload,
    });

    return okResponse({
      success: true,
      leadId,
      score,
      realtime: Boolean(getIOOptional()),
      lead,
    });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Chyba spracovania udalosti.", 400);
  }
}
