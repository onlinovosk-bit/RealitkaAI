import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";
import { callOpenAI } from "@/lib/ai/openai";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";
import { logAiAction } from "@/lib/ai-action-audit";
import { estimateOpenAiCostEur } from "@/lib/ai/llm-usage-cost";
import { ADDRESS_PLACEHOLDER, NAME_PLACEHOLDER, cityOnly, restoreName } from "@/lib/privacy/minimize";

const EVENT_TYPE_LABELS: Record<string, string> = {
  dedičstvo:    "zápis dedičstva",
  plomba:       "katastrálnu plombu",
  zmena:        "zmenu vlastníka",
  hypotéka:     "zápis hypotéky",
  exekúcia:     "exekúčné konanie",
  výmaz:        "výmaz záložného práva",
};

export async function POST(request: Request) {
  const supabaseAuth = await createServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const block = await checkAiRateLimit(user.id, "ghostwriter", 20);
  if (block) return NextResponse.json(block, { status: 429 });

  try {
    const body = await request.json() as {
      ownerAddress?: string;
      eventType?: string;
      ownerName?: string;
      agentName?: string;
    };

    if (!body.ownerAddress || body.ownerAddress.trim().length < 5) {
      return NextResponse.json({ error: "Zadajte adresu nehnuteľnosti." }, { status: 400 });
    }

    const eventLabel = EVENT_TYPE_LABELS[body.eventType ?? "dedičstvo"] ?? "zmenu na liste vlastníctva";
    const agentName  = body.agentName ?? "AI Asistent Revolis";
    // BOD 9 (PII): meno majiteľa a presná adresa z katastra k poskytovateľovi
    // LLM neodchádzajú. Model píše zástupné znaky, dosadíme ich nižšie, lokálne.
    // Toto je cold outreach na človeka, ktorý o nás nevie — minimalizácia tu
    // nie je kozmetika.
    const ownerName  = body.ownerName ? `vážený ${NAME_PLACEHOLDER}` : "vážený majiteľ";

    const prompt = `Si expertný realitný poradca na slovenskom trhu. Napíš profesionálny, personalizovaný list majiteľovi nehnuteľnosti.

Situácia: Na liste vlastníctva sme identifikovali ${eventLabel} pre nehnuteľnosť na adrese: ${ADDRESS_PLACEHOLDER} (v lokalite ${cityOnly(body.ownerAddress) || 'neuvedená'})

Zástupné znaky ${NAME_PLACEHOLDER} a ${ADDRESS_PLACEHOLDER} opíš presne tak, ako sú — doplníme ich my.

Požiadavky na list:
- Oslovenie: "${ownerName}"
- Tón: profesionálny, empatický, nie agresívny predaj
- Dĺžka: 3–4 odseky
- Jazyk: slovenčina, formálny štýl
- Obsah: (1) predstavenie seba ako realitného experta, (2) zmienenie katastrálnej zmeny (bez pôsobenia sledovacím dojmom), (3) ponuka bezplatného trhového auditu/odhadu ceny, (4) CTA: telefonický alebo emailový kontakt
- Podpis: ${agentName}
- Pridaj P.S. s urgenciou (napr. zmeny na trhu)

Vráť IBA HTML obsah listu (bez <!DOCTYPE>, <html>, <head> tagov). Použi inline štýly pre profesionálny vzhľad.`;

    // Profil sa číta PRED volaním OpenAI — spotreba tokenov sa inak nedá
    // pripísať kancelárii a spadla by na systémového tenanta.
    const { data: profile } = await supabaseAuth
      .from("profiles")
      .select("agency_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const t0 = Date.now();
    const model = "gpt-4o";
    const { content: letterHtmlRaw, promptTokens, completionTokens } = await callOpenAI({
      model,
      max_tokens:  1200,
      temperature: 0.7,
      tag:         "ghostwriter",
      agencyId:    profile?.agency_id ?? undefined,
      messages: [
        { role: "system", content: "Si expert na slovenský realitný trh a profesionálnu komunikáciu." },
        { role: "user",   content: prompt },
      ],
    });

    await logAiAction({
      action: "ghostwriter",
      agencyId: profile?.agency_id ?? null,
      costEur: estimateOpenAiCostEur(model, promptTokens ?? 0, completionTokens ?? 0),
      model,
      latencyMs: Date.now() - t0,
    });

    // Dosadenie prebieha až tu, po odpovedi modelu.
    const letterHtml = restoreName(
      restoreName(letterHtmlRaw.trim(), body.ownerName, NAME_PLACEHOLDER),
      body.ownerAddress,
      ADDRESS_PLACEHOLDER,
    );
    const letterText = letterHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    // Ulož do Supabase
    const supabase = createAdminClient();
    const { data: saved, error: saveError } = await supabase
      .from("ghostwriter_letters")
      .insert({
        owner_address: body.ownerAddress,
        event_type:    body.eventType ?? "dedičstvo",
        letter_html:   letterHtml,
        letter_text:   letterText,
      })
      .select("id")
      .single();

    if (saveError) {
      console.warn("[ghostwriter/generate] Save to Supabase failed:", saveError.message);
    }

    return NextResponse.json({
      id:          saved?.id ?? `tmp_${Date.now()}`,
      ownerAddress: body.ownerAddress,
      eventType:    body.eventType ?? "dedičstvo",
      letterHtml,
      letterText,
      createdAt:   new Date().toISOString(),
    });
  } catch (err) {
    console.error("[ghostwriter/generate]", err);
    return NextResponse.json(
      { error: "Nepodarilo sa vygenerovať list. Skúste znova." },
      { status: 500 }
    );
  }
}
