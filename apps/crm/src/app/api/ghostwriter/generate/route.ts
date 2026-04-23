import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

function getOpenAI() { return new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" }); }

const EVENT_TYPE_LABELS: Record<string, string> = {
  dedičstvo:    "zápis dedičstva",
  plomba:       "katastrálnu plombu",
  zmena:        "zmenu vlastníka",
  hypotéka:     "zápis hypotéky",
  exekúcia:     "exekúčné konanie",
  výmaz:        "výmaz záložného práva",
};

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: Request) {
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
    const ownerName  = body.ownerName ? `vážený ${body.ownerName}` : "vážený majiteľ";

    const prompt = `Si expertný realitný poradca na slovenskom trhu. Napíš profesionálny, personalizovaný list majiteľovi nehnuteľnosti.

Situácia: Na liste vlastníctva sme identifikovali ${eventLabel} pre nehnuteľnosť na adrese: ${body.ownerAddress}

Požiadavky na list:
- Oslovenie: "${ownerName}"
- Tón: profesionálny, empatický, nie agresívny predaj
- Dĺžka: 3–4 odseky
- Jazyk: slovenčina, formálny štýl
- Obsah: (1) predstavenie seba ako realitného experta, (2) zmienenie katastrálnej zmeny (bez pôsobenia sledovacím dojmom), (3) ponuka bezplatného trhového auditu/odhadu ceny, (4) CTA: telefonický alebo emailový kontakt
- Podpis: ${agentName}
- Pridaj P.S. s urgenciou (napr. zmeny na trhu)

Vráť IBA HTML obsah listu (bez <!DOCTYPE>, <html>, <head> tagov). Použi inline štýly pre profesionálny vzhľad.`;

    const completion = await getOpenAI().chat.completions.create({
      model:       "gpt-4o",
      max_tokens:  1200,
      temperature: 0.7,
      messages: [
        { role: "system", content: "Si expert na slovenský realitný trh a profesionálnu komunikáciu." },
        { role: "user",   content: prompt },
      ],
    });

    const letterHtml = completion.choices[0]?.message?.content?.trim() ?? "";
    const letterText = letterHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    // Ulož do Supabase
    const supabase = getServiceClient();
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
