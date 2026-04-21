/**
 * L99 Engine adapter — tenká fasáda nad existujúcim src/lib/l99/ enginom.
 * Exportuje jednoduchý `L99Result` interface kompatibilný s L99PredictiveCard.
 *
 * Váhy BRI (definované v src/lib/l99/types.ts):
 *   35 % sofiaEngagementVelocity (AI Asistent interaction velocity)
 *   25 % sentimentScore
 *   20 % crossPropertyIntent
 *   20 % marketScarcityFactor
 */
import { createClient } from "@/lib/supabase/server";
import { checkEnterpriseAccess } from "@/lib/l99/entitlements";
import { calculateBriScore, getBriAlertLevel } from "@/lib/l99/bri-engine";

export interface L99Result {
  status: "ACTIVE" | "LOCKED";
  bri: number | null;
  isShadowMatch: boolean;
  insights: string[];
}

export async function calculateL99Intelligence(
  leadId: string
): Promise<L99Result> {
  const access = await checkEnterpriseAccess();

  if (!access.allowed) {
    return { status: "LOCKED", bri: null, isShadowMatch: false, insights: [] };
  }

  const supabase = await createClient();

  // Načítanie posledných BRI komponentov z bri_history
  const { data: history } = await supabase
    .from("bri_history")
    .select(
      "bri_score, sofia_engagement_velocity, sentiment_score, cross_property_intent, market_scarcity_factor, reasoning_string"
    )
    .eq("lead_id", leadId)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .single();

  if (history) {
    const alertLevel = getBriAlertLevel(history.bri_score);
    const isShadowMatch = alertLevel === "critical" || alertLevel === "high";

    return {
      status: "ACTIVE",
      bri: history.bri_score,
      isShadowMatch,
      insights: history.reasoning_string
        ? [history.reasoning_string]
        : buildInsights(
            history.sofia_engagement_velocity,
            history.sentiment_score,
            history.cross_property_intent,
            history.market_scarcity_factor
          ),
    };
  }

  // Fallback: vypočítaj z lead scoring
  const { data: lead } = await supabase
    .from("leads")
    .select("score, status")
    .eq("id", leadId)
    .single();

  if (!lead) {
    return { status: "ACTIVE", bri: null, isShadowMatch: false, insights: [] };
  }

  const syntheticComponents = {
    sofiaEngagementVelocity: lead.score ?? 50,
    sentimentScore: lead.score ?? 50,
    crossPropertyIntent: 50,
    marketScarcityFactor: 50,
  };

  const bri = calculateBriScore(syntheticComponents);
  const alertLevel = getBriAlertLevel(bri);

  return {
    status: "ACTIVE",
    bri,
    isShadowMatch: alertLevel === "critical" || alertLevel === "high",
    insights: buildInsights(
      syntheticComponents.sofiaEngagementVelocity,
      syntheticComponents.sentimentScore,
      syntheticComponents.crossPropertyIntent,
      syntheticComponents.marketScarcityFactor
    ),
  };
}

function buildInsights(
  engagementVelocity: number,
  sentimentScore: number,
  crossPropertyIntent: number,
  marketScarcityFactor: number
): string[] {
  const factors: string[] = [];
  if (engagementVelocity >= 70)
    factors.push(`Vysoká frekvencia interakcií cez AI Asistenta (${engagementVelocity}/100)`);
  if (sentimentScore >= 70)
    factors.push(`Pozitívny sentiment v komunikácii (${sentimentScore}/100)`);
  if (crossPropertyIntent >= 70)
    factors.push(`Záujem o viacero nehnuteľností (${crossPropertyIntent}/100)`);
  if (marketScarcityFactor >= 70)
    factors.push(`Urgencia na lokálnom trhu (${marketScarcityFactor}/100)`);
  return factors.length > 0 ? factors : ["AI Asistent analyzuje dostupné signály"];
}
