import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { callOpenAI } from "@/lib/ai/openai";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Statické demo kandidáti — simulujú reálne scenáre
const DEMO_CANDIDATES = [
  {
    id: "arb_1",
    name: "Ing. Marián Kováč",
    email: "kovac@example.sk",
    interestedAddress: "Sabinovská 12, Prešov",
    ownedAddress: "Sekčov 45, Prešov",
    arbitrageScore: 87,
    reasoning: "Klient sa aktívne zaujíma o kúpu 3-izbového bytu, no vlastní 2-izbový byt v Sekčove, ktorý ešte nepredal. Klasická exit-strategy príležitosť.",
    recommendedAction: "Navrhnúť simultánny predaj a kúpu. Pripratiť odhad Sekčova ešte pred dnešnou obhliadkou.",
  },
  {
    id: "arb_2",
    name: "Jana Horváthová",
    email: "horvath@example.sk",
    interestedAddress: "Hlavná 33, Prešov",
    ownedAddress: undefined,
    arbitrageScore: 52,
    reasoning: "Klientka hľadá väčší byt, v poznámkach zmienila 'predaj rodinného domu v Raslaviciach'. Menej istá príležitosť — overenie potrebné.",
    recommendedAction: "Položiť otázku priamo: 'Máte nehnuteľnosť, ktorú plánujete predať?' Môže ísť o sekundárny mandát.",
  },
  {
    id: "arb_3",
    name: "Mgr. Peter Šimko",
    email: "simko@example.sk",
    interestedAddress: "Exnárova 8, Prešov",
    ownedAddress: "Tatranská 12, Prešov",
    arbitrageScore: 93,
    reasoning: "Vo VINE CRM evidovaný ako kupujúci. Identická adresa trvalého pobytu figuruje v katastrálnom registri ako vlastník 4-izbového bytu. Vysoká istota arbitráže.",
    recommendedAction: "PRIORITA: Kontaktovať dnes. Navrhnúť exkluzívny mandát na Tatranskú + nájsť match pre Exnárovu do 48h.",
  },
];

export async function POST(request: Request) {
  const supabaseAuth = await createServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const block = await checkAiRateLimit(user.id, "arbitrage-analyze", 20);
  if (block) return NextResponse.json(block, { status: 429 });

  try {
    const body = await request.json() as { leadId?: string; useLive?: boolean };

    // Živé dáta z CRM ak useLive=true a leadId zadaný
    if (body.useLive && body.leadId) {
      const { data: profile } = await supabaseAuth
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      const supabase = getServiceClient();

      const { data: lead } = await supabase
        .from("leads")
        .select("id, name, email, phone, notes, address, status")
        .eq("id", body.leadId)
        .eq("assigned_profile_id", profile?.id ?? "")
        .single();

      if (!lead) {
        return NextResponse.json({ error: "Lead nenájdený." }, { status: 404 });
      }

      // AI analýza poznámok pre arbitráž
      const analysisPrompt = `Analyzuj tento CRM lead a urči, či ide o arbitrážnu príležitosť (kupujúci, ktorý má aj nehnuteľnosť na predaj).

Lead:
- Meno: ${lead.name ?? "Neznámy"}
- Adresa záujmu: ${lead.address ?? "neuvedená"}
- Poznámky: ${lead.notes ?? "žiadne"}
- Status: ${lead.status ?? "new"}

Odpovedz v JSON formáte:
{
  "arbitrageScore": <0-100>,
  "ownedAddress": "<adresa ak nájdeš, inak null>",
  "reasoning": "<1-2 vety slovensky>",
  "recommendedAction": "<konkrétna akcia slovensky>"
}`;

      const { content: rawAnalysis } = await callOpenAI({
        model:           "gpt-4o-mini",
        max_tokens:      300,
        temperature:     0.3,
        tag:             "arbitrage-analyze",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Si expert na analýzu realitných leadov. Odpovedaj VŽDY validným JSON." },
          { role: "user",   content: analysisPrompt },
        ],
      });

      const analysis = JSON.parse(rawAnalysis || "{}") as {
        arbitrageScore?: number;
        ownedAddress?: string;
        reasoning?: string;
        recommendedAction?: string;
      };

      return NextResponse.json({
        candidates: [{
          id:                lead.id,
          name:              lead.name ?? "Neznámy",
          email:             lead.email ?? undefined,
          phone:             lead.phone ?? undefined,
          interestedAddress: lead.address ?? "neuvedená",
          ownedAddress:      analysis.ownedAddress ?? undefined,
          arbitrageScore:    analysis.arbitrageScore ?? 0,
          reasoning:         analysis.reasoning ?? "",
          recommendedAction: analysis.recommendedAction ?? "",
        }],
        source: "live",
      });
    }

    // Demo mode — vráť realistické príklady
    return NextResponse.json({
      candidates: DEMO_CANDIDATES,
      source: "demo",
    });
  } catch (err) {
    console.error("[arbitrage/analyze]", err);
    return NextResponse.json(
      { error: "Analýza arbitráže zlyhala." },
      { status: 500 }
    );
  }
}
