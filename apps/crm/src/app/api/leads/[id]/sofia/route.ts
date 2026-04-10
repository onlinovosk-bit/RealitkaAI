export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { question } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "OpenAI kľúč chýba." }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ ok: false, error: "Supabase config chýba." }, { status: 500 });
    }

    const admin = createAdminClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: lead } = await admin
      .from("leads")
      .select("name,status,budget,location,property_type,rooms,financing,timeline,note,source,score,assigned_agent")
      .eq("id", id)
      .single();

    if (!lead) {
      return NextResponse.json({ ok: false, error: "Lead neexistuje." }, { status: 404 });
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
    ].filter(Boolean).join("\n");

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
              "Si Sofia, AI asistentka pre slovenských realitných maklérov. " +
              "Odpovedaj výhradne v slovenčine. Buď konkrétna, praktická, max 3 vety. " +
              "Nikdy nehovor čo nevieš — ak informácia chýba, povedz čo by maklér mal zistiť.",
          },
          {
            role: "user",
            content: `Kontext leadu:\n${context}\n\nOtázka: ${question}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "OpenAI API zlyhalo." }, { status: 500 });
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({ ok: true, answer });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Chyba" },
      { status: 500 }
    );
  }
}
