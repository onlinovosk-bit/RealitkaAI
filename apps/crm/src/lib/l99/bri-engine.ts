import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { requireEnterprise } from "./entitlements";
import { dispatchPriorityAlert } from "./alert-dispatch";
import {
  BRI_WEIGHTS,
  type BriComponents,
  type BriResult,
  type BriAlertLevel,
  type ReasoningFactor,
} from "./types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function calculateBriScore(components: BriComponents): number {
  return Math.round(
    components.sofiaEngagementVelocity * BRI_WEIGHTS.SOFIA_ENGAGEMENT_VELOCITY +
    components.sentimentScore          * BRI_WEIGHTS.SENTIMENT_SCORE +
    components.crossPropertyIntent     * BRI_WEIGHTS.CROSS_PROPERTY_INTENT +
    components.marketScarcityFactor    * BRI_WEIGHTS.MARKET_SCARCITY_FACTOR
  );
}

export function getBriAlertLevel(score: number): BriAlertLevel {
  if (score >= 90) return "critical";
  if (score >= 88) return "high";
  if (score >= 70) return "medium";
  return "low";
}

function buildReasoningFactors(components: BriComponents): ReasoningFactor[] {
  return [
    {
      factor: "Zapojenie cez AI Asistenta",
      value: components.sofiaEngagementVelocity,
      weight: BRI_WEIGHTS.SOFIA_ENGAGEMENT_VELOCITY,
      contribution: Math.round(components.sofiaEngagementVelocity * BRI_WEIGHTS.SOFIA_ENGAGEMENT_VELOCITY),
      explanation: `Frekvencia a rýchlosť odpovedí cez AI Asistenta (${components.sofiaEngagementVelocity}/100)`,
    },
    {
      factor: "Skóre sentimentu",
      value: components.sentimentScore,
      weight: BRI_WEIGHTS.SENTIMENT_SCORE,
      contribution: Math.round(components.sentimentScore * BRI_WEIGHTS.SENTIMENT_SCORE),
      explanation: `NLP analýza verbálneho zámeru v komunikácii (${components.sentimentScore}/100)`,
    },
    {
      factor: "Záujem o viacero nehnuteľností",
      value: components.crossPropertyIntent,
      weight: BRI_WEIGHTS.CROSS_PROPERTY_INTENT,
      contribution: Math.round(components.crossPropertyIntent * BRI_WEIGHTS.CROSS_PROPERTY_INTENT),
      explanation: `Správanie naprieč rôznymi inzerátmi (${components.crossPropertyIntent}/100)`,
    },
    {
      factor: "Faktor nedostatku na trhu",
      value: components.marketScarcityFactor,
      weight: BRI_WEIGHTS.MARKET_SCARCITY_FACTOR,
      contribution: Math.round(components.marketScarcityFactor * BRI_WEIGHTS.MARKET_SCARCITY_FACTOR),
      explanation: `Kontextová urgencia na základe rýchlosti lokálneho trhu (${components.marketScarcityFactor}/100)`,
    },
  ];
}

async function generateReasoningString(
  components: BriComponents,
  score: number,
  leadContext: { name: string; lastActivity: string }
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: `Vygeneruj stručný, transparentný vysvetľovací text (max 2 vety, slovensky) prečo
príležitosť "${leadContext.name}" dostala Buyer Readiness Index skóre ${score}/100.

Komponenty:
- Zapojenie cez AI Asistenta: ${components.sofiaEngagementVelocity}/100
- Skóre sentimentu: ${components.sentimentScore}/100
- Záujem o viacero nehnuteľností: ${components.crossPropertyIntent}/100
- Faktor nedostatku na trhu: ${components.marketScarcityFactor}/100
- Posledná aktivita: ${leadContext.lastActivity}

Formát: "Príležitosť označená ako [úroveň] (${score}) z dôvodu [hlavný faktor] a [vedľajší faktor]."
Buď konkrétny a merateľný. Žiadne generické frázy.`,
      }],
      max_tokens: 150,
      temperature: 0.2,
    });
    return response.choices[0]?.message?.content?.trim() ??
      `Príležitosť hodnotená na ${score}/100 na základe AI analýzy správania.`;
  } catch {
    return `Príležitosť hodnotená na ${score}/100 na základe AI analýzy správania.`;
  }
}

export async function computeEnterpriseBri(
  leadId: string,
  components: BriComponents,
  leadContext: { name: string; lastActivity: string }
): Promise<BriResult> {
  await requireEnterprise();

  const score = calculateBriScore(components);
  const alertLevel = getBriAlertLevel(score);
  const reasoningFactors = buildReasoningFactors(components);
  const reasoningString = await generateReasoningString(components, score, leadContext);

  const result: BriResult = {
    score,
    components,
    reasoningString,
    reasoningFactors,
    alertLevel,
    calculatedAt: new Date().toISOString(),
  };

  const supabase = await createClient();
  await supabase.from("bri_history").insert({
    lead_id: leadId,
    bri_score: score,
    sofia_engagement_velocity: components.sofiaEngagementVelocity,
    sentiment_score: components.sentimentScore,
    cross_property_intent: components.crossPropertyIntent,
    market_scarcity_factor: components.marketScarcityFactor,
    reasoning_string: reasoningString,
    reasoning_factors: reasoningFactors,
  });

  if (alertLevel === "high" || alertLevel === "critical") {
    await dispatchPriorityAlert(leadId, score, reasoningString);
  }

  return result;
}
