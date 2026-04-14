import { createClient as createAdminClient } from "@supabase/supabase-js";
import { AI_ASSISTANT_NAME } from "@/lib/ai-brand";

type AssistantResponse =
  | { ok: true; answer: string }
  | { ok: false; error: string; status: number };

export async function getAssistantAnswer(
  leadId: string,
  question: string
): Promise<AssistantResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "OpenAI kľúč chýba.", status: 400 };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { ok: false, error: "Supabase config chýba.", status: 500 };
  }

  const admin = createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: lead } = await admin
    .from("leads")
    .select("name,status,budget,location,property_type,rooms,financing,timeline,note,source,score,assigned_agent")
    .eq("id", leadId)
    .single();

  if (!lead) {
    return { ok: false, error: "Príležitosť neexistuje.", status: 404 };
  }

  const context = [
    `Meno: ${lead.name}`,
    `Status: ${lead.status}`,
    `Rozpočet: ${lead.budget}`,
    `Lokalita: ${lead.location}`,
    `Typ: ${lead.property_type}, ${lead.rooms}`,
    `Financovanie: ${lead.financing}`,
    `Horizont: ${lead.timeline}`,
    `AI skóre: ${lead.score}/100`,
    lead.note ? `Poznámka: ${lead.note}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content:
            `Si ${AI_ASSISTANT_NAME}, AI asistentka pre slovenských realitných maklérov. ` +
            "Odpovedaj výhradne v slovenčine. Buď konkrétna, praktická, max 3 vety. " +
            "Nikdy nehovor čo nevieš — ak informácia chýba, povedz čo by maklér mal zistiť.",
        },
        {
          role: "user",
          content: `Kontext príležitosti:\n${context}\n\nOtázka: ${question}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const payload = (await res.json()) as { error?: { message?: string } };
      detail = payload?.error?.message ? ` (${payload.error.message})` : "";
    } catch {
      // ignore parse errors and keep generic fallback
    }
    return {
      ok: false,
      error: `OpenAI API zlyhalo: ${res.status}${detail}`,
      status: 500,
    };
  }

  const data = await res.json();
  const answer = data.choices?.[0]?.message?.content?.trim() ?? "";
  return { ok: true, answer };
}
