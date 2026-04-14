/**
 * POST /api/call-script
 *
 * Vygeneruje telefonický skript pre makléra pomocou OpenAI.
 * Tok:
 *   1. Načítaj lead + jeho aktivity z Supabase
 *   2. Vypočítaj BRI pomocou computeBuyerReadiness()
 *   3. Zostav systémový prompt cez buildCallScriptPrompt()
 *   4. Pošli do OpenAI GPT-4o-mini → vráť skript
 *
 * Body: { leadId: string, propertyTitle?: string, officeName?: string, locale?: string }
 */

import { okResponse, errorResponse } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { computeBuyerReadiness } from "@/domain/buyer-readiness/engine";
import { buildCallScriptPrompt } from "@/ai/prompts/call-scripts";
import type { BuyerReadinessDto } from "@/services/playbook/types";

const OPENAI_MODEL = "gpt-4o-mini" as const;

function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY nie je nastavený");
  return key;
}

export async function POST(req: Request) {
  let body: {
    leadId?: string;
    propertyTitle?: string;
    officeName?: string;
    locale?: "sk-SK" | "cs-CZ" | "en-US";
  };

  try {
    body = await req.json();
  } catch {
    return errorResponse("Neplatné JSON telo požiadavky", 400);
  }

  const { leadId, propertyTitle, officeName, locale = "sk-SK" } = body;

  if (!leadId) {
    return errorResponse("Chýba leadId", 400);
  }

  const supabase = await createClient();

  // ── 1. Načítaj lead ───────────────────────────────────────
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select(
      "id, name, status, score, budget, property_type, rooms, last_contact_at, created_at"
    )
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    return errorResponse("Lead sa nenašiel", 404);
  }

  // ── 2. Načítaj aktivity leadu ─────────────────────────────
  const { data: activities } = await supabase
    .from("activities")
    .select("id, type, source, severity, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });

  const briActivities = (activities ?? []).map((a) => ({
    id: a.id,
    type: a.type ?? "Poznámka",
    source: a.source ?? undefined,
    severity: a.severity ?? undefined,
    createdAt: a.created_at,
  }));

  // ── 3. Vypočítaj BRI ──────────────────────────────────────
  const bri = computeBuyerReadiness(
    briActivities,
    {
      status: lead.status ?? "Nový",
      score: lead.score ?? 50,
      budget: lead.budget ?? undefined,
      propertyType: lead.property_type ?? undefined,
      rooms: lead.rooms ?? undefined,
      lastContactAt: lead.last_contact_at ?? undefined,
      createdAt: lead.created_at ?? undefined,
    },
    {
      firstSeenAt: lead.created_at ?? undefined,
      lastActiveAt: lead.last_contact_at ?? undefined,
    }
  );

  const buyerDto: BuyerReadinessDto = {
    buyerId: lead.id,
    buyerName: lead.name ?? "Klient",
    ...bri,
  };

  // ── 4. Zostav prompt ──────────────────────────────────────
  const prompt = buildCallScriptPrompt({
    buyer: buyerDto,
    propertyTitle,
    officeName,
    locale,
  });

  // ── 5. Zavolaj OpenAI ─────────────────────────────────────
  let script: string;

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getOpenAIKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.7,
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      return errorResponse(`OpenAI API error: ${err}`, 502);
    }

    const openaiData = (await openaiRes.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    script = openaiData.choices[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    console.error("[call-script] OpenAI zlyhalo:", err);
    return errorResponse("Nepodarilo sa vygenerovať skript", 502);
  }

  return okResponse({ script, prompt, bri: buyerDto });
}
