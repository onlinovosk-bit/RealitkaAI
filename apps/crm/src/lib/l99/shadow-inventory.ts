import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { requireEnterprise } from "./entitlements";
import type { ShadowInventorySignal } from "./types";

function getOpenAI() { return new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" }); }

export async function scanDormantLeads(agencyId: string): Promise<ShadowInventorySignal[]> {
  await requireEnterprise();
  const supabase = await createClient();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: dormantLeads } = await supabase
    .from("leads")
    .select("id, name, last_contact_at, score, status")
    .lt("last_contact_at", sixMonthsAgo.toISOString())
    .neq("status", "Uzatvorený")
    .eq("agency_id", agencyId);

  if (!dormantLeads?.length) return [];

  const signals: ShadowInventorySignal[] = [];

  for (const lead of dormantLeads) {
    const reasoning = await generateDormantReasoning(lead);
    const confidenceScore = calculateDormantConfidence(lead);

    const { data: signal } = await supabase
      .from("shadow_inventory")
      .insert({
        agency_id: agencyId,
        lead_id: lead.id,
        signal_type: "dormant_revival",
        confidence_score: confidenceScore,
        ai_reasoning: reasoning,
        status: "pending",
      })
      .select()
      .single();

    if (signal) {
      signals.push({
        id: signal.id,
        leadId: signal.lead_id,
        propertyId: null,
        signalType: "dormant_revival",
        confidenceScore: signal.confidence_score,
        lifeStageTrigger: null,
        aiReasoning: reasoning,
        status: "pending",
        createdAt: signal.created_at,
      });
    }
  }

  return signals;
}

function calculateDormantConfidence(lead: { score: number; last_contact_at: string }): number {
  const monthsInactive = Math.floor(
    (Date.now() - new Date(lead.last_contact_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  const baseScore = lead.score * 0.6;
  const recencyBonus = Math.max(0, 40 - monthsInactive * 3);
  return Math.min(100, Math.round(baseScore + recencyBonus));
}

async function generateDormantReasoning(lead: {
  name: string;
  score: number;
  last_contact_at: string;
}): Promise<string> {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: `Vygeneruj 1 krátku vetu (slovensky) prečo sa oplatí znovu kontaktovať
príležitosť "${lead.name}" (AI skóre: ${lead.score}, neaktívna od: ${lead.last_contact_at}).
Buď konkrétny a motivujúci pre makléra.`,
      }],
      max_tokens: 80,
      temperature: 0.3,
    });
    return response.choices[0]?.message?.content?.trim() ??
      `Príležitosť s históriou záujmu – vhodný čas na opätovný kontakt.`;
  } catch {
    return `Príležitosť s históriou záujmu – vhodný čas na opätovný kontakt.`;
  }
}
