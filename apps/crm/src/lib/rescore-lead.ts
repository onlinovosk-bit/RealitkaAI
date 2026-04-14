/**
 * rescoreLead — fire-and-forget after status change or new activity.
 * 1. Runs heuristic scoring (always)
 * 2. If OPENAI_API_KEY present → asks GPT-4o-mini for a one-liner AI insight
 * 3. Writes score + ai_insight (and legacy sofia_insight) back to leads table
 */

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { calculateLeadAiScore } from "@/lib/ai-scoring";
import { AI_ASSISTANT_NAME } from "@/lib/ai-brand";

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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 80,
        messages: [
          {
            role: "system",
            content:
              `Si ${AI_ASSISTANT_NAME}, AI asistentka pre slovenských realitných maklérov. ` +
              "Odpovedaj výhradne v slovenčine. Buď konkrétna a stručná (max 1 veta).",
          },
          {
            role: "user",
            content:
              `Lead: ${lead.name}, status: ${lead.status}, rozpočet: ${lead.budget}, ` +
              `lokalita: ${lead.location}, financovanie: ${lead.financing}, ` +
              `horizont: ${lead.timeline}, AI skóre: ${score}/100. ` +
              "Napíš jeden konkrétny next step pre makléra.",
          },
        ],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? null;
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
      .select("id,name,status,budget,location,property_type,rooms,financing,timeline,note,source,assigned_agent")
      .eq("id", leadId)
      .single();

    if (!row) return;

    const lead = {
      id: row.id,
      name: row.name ?? "",
      status: row.status ?? "Nový",
      budget: row.budget ?? "",
      location: row.location ?? "",
      propertyType: row.property_type ?? "",
      rooms: row.rooms ?? "",
      financing: row.financing ?? "",
      timeline: row.timeline ?? "",
      note: row.note ?? "",
      source: row.source ?? "",
      assignedAgent: row.assigned_agent ?? "",
    };

    const { score } = calculateLeadAiScore({
      lead,
      matches: [],
      recommendations: [],
      tasks: [],
      messages: [],
    });

    const aiInsight = await getOpenAiInsight(row, score);

    // Dual-write during migration window (no downtime).
    // If legacy sofia_insight column does not exist, retry with ai_insight only.
    if (aiInsight) {
      const { error } = await admin
        .from("leads")
        .update({ score, ai_insight: aiInsight, sofia_insight: aiInsight })
        .eq("id", leadId);
      if (error?.message?.includes("sofia_insight")) {
        const { error: aiOnlyError } = await admin
          .from("leads")
          .update({ score, ai_insight: aiInsight })
          .eq("id", leadId);
        if (aiOnlyError) {
          await admin.from("leads").update({ score }).eq("id", leadId);
        }
      } else if (error) {
        await admin.from("leads").update({ score, ai_insight: aiInsight }).eq("id", leadId);
      }
    } else {
      await admin.from("leads").update({ score }).eq("id", leadId);
    }
  } catch {
    // fire-and-forget — never throw
  }
}
