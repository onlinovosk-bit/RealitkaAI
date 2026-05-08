/**
 * rescoreLead — po zmene leadu / aktivity.
 * 1) CRM heuristika + AI Sales Brain v2 (plný kontext)
 * 2) Zápis score podľa LEAD_SCORE_SOURCE (crm | combined)
 * 3) JSON ai_engine (ak existuje stĺpec)
 * 4) Voliteľný OpenAI insight
 */

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { computeBrainRescorePayload } from "@/lib/ai/brain-rescore";
import { AI_ASSISTANT_NAME } from "@/lib/ai-brand";
import { callOpenAI } from "@/lib/ai/openai";

type LeadRow = {
  id: string;
  name: string;
  status: string;
  budget: string;
  location: string;
  property_type: string;
  rooms: string;
  financing: string;
  timeline: string;
  note: string;
  source: string;
  assigned_agent: string;
  last_contact?: string | null;
};

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getOpenAiInsight(lead: LeadRow, score: number): Promise<string | null> {
  try {
    const { content } = await callOpenAI({
      model:      "gpt-4o-mini",
      max_tokens: 80,
      tag:        "rescore-insight",
      messages: [
        {
          role:    "system",
          content:
            `Si ${AI_ASSISTANT_NAME}, AI asistentka pre slovenských realitných maklérov. ` +
            "Odpovedaj výhradne v slovenčine. Buď konkrétna a stručná (max 1 veta).",
        },
        {
          role:    "user",
          content:
            `Lead: ${lead.name}, status: ${lead.status}, rozpočet: ${lead.budget}, ` +
            `lokalita: ${lead.location}, financovanie: ${lead.financing}, ` +
            `horizont: ${lead.timeline}, AI skóre: ${score}/100. ` +
            "Napíš jeden konkrétny next step pre makléra.",
        },
      ],
    });
    return content.trim() || null;
  } catch {
    return null;
  }
}

export async function rescoreLead(leadId: string): Promise<void> {
  const admin = getAdmin();
  if (!admin) return;

  try {
    const { data: row } = await admin
      .from("leads")
      .select(
        "id,name,status,budget,location,property_type,rooms,financing,timeline,note,source,assigned_agent,last_contact"
      )
      .eq("id", leadId)
      .single();

    if (!row) return;

    const r = row as LeadRow;

    const leadForBrain = {
      id: r.id,
      name: r.name ?? "",
      status: r.status ?? "Nový",
      budget: r.budget ?? "",
      location: r.location ?? "",
      propertyType: r.property_type ?? "",
      rooms: r.rooms ?? "",
      financing: r.financing ?? "",
      timeline: r.timeline ?? "",
      note: r.note ?? "",
      source: r.source ?? "",
      assignedAgent: r.assigned_agent ?? "",
      lastContact: r.last_contact ?? undefined,
    };

    const { legacy, aiEngine } = await computeBrainRescorePayload(leadForBrain);

    const scoreSource = (process.env.LEAD_SCORE_SOURCE ?? "crm").toLowerCase();
    const scoreValue =
      scoreSource === "combined" ? aiEngine.combinedScore : legacy.score;

    const aiInsight = await getOpenAiInsight(r, scoreValue);

    let payload: Record<string, unknown> = {
      score: scoreValue,
      ai_engine: aiEngine,
    };
    if (aiInsight) {
      payload.ai_insight = aiInsight;
      payload.sofia_insight = aiInsight;
    }

    let { error } = await admin.from("leads").update(payload).eq("id", leadId);

    if (error?.message?.toLowerCase().includes("ai_engine")) {
      const { ai_engine: _a, ...withoutEngine } = payload;
      payload = withoutEngine;
      ({ error } = await admin.from("leads").update(payload).eq("id", leadId));
    }

    if (error?.message?.includes("sofia_insight")) {
      const { sofia_insight: _s, ...noSofia } = payload;
      ({ error } = await admin.from("leads").update(noSofia).eq("id", leadId));
      if (error && aiInsight) {
        await admin.from("leads").update({ score: scoreValue, ai_insight: aiInsight }).eq("id", leadId);
      }
    } else if (error && aiInsight) {
      await admin.from("leads").update({ score: scoreValue, ai_insight: aiInsight }).eq("id", leadId);
    } else if (error) {
      await admin.from("leads").update({ score: scoreValue }).eq("id", leadId);
    }
  } catch {
    /* fire-and-forget */
  }
}
