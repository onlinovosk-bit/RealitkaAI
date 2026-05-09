import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";
import { callOpenAI } from "@/lib/ai/openai";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";

// Realistické demo dáta — simulujú Bazos.sk / Nehnutelnosti.sk samopredajcov
const DEMO_PROSPECTS = [
  {
    id: "sr_1",
    address: "Sabinovská 18, Prešov",
    platform: "bazos" as const,
    daysListed: 87,
    originalPrice: 145000,
    currentPrice: 128000,
    priceDropPercent: 11.7,
    score: 91,
    status: "identified" as const,
  },
  {
    id: "sr_2",
    address: "Levočská 4, Prešov",
    platform: "nehnutelnosti" as const,
    daysListed: 134,
    originalPrice: 89000,
    currentPrice: 79500,
    priceDropPercent: 10.7,
    score: 88,
    status: "identified" as const,
  },
  {
    id: "sr_3",
    address: "Metodova 7, Košice",
    platform: "bazos" as const,
    daysListed: 212,
    originalPrice: 175000,
    currentPrice: 149000,
    priceDropPercent: 14.9,
    score: 95,
    status: "identified" as const,
  },
  {
    id: "sr_4",
    address: "Nálepkova 33, Prešov",
    platform: "reality" as const,
    daysListed: 56,
    originalPrice: 112000,
    currentPrice: 108000,
    priceDropPercent: 3.6,
    score: 64,
    status: "identified" as const,
  },
  {
    id: "sr_5",
    address: "Tatranská 9, Poprad",
    platform: "facebook" as const,
    daysListed: 168,
    originalPrice: 98000,
    currentPrice: 85000,
    priceDropPercent: 13.3,
    score: 89,
    status: "identified" as const,
  },
];

export async function POST(request: Request) {
  const supabaseAuth = await createServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const block = await checkAiRateLimit(user.id, "stealth-scan", 10);
  if (block) return NextResponse.json(block, { status: 429 });

  try {
    const body = await request.json() as { area?: string; minScore?: number; generateNew?: boolean };
    const minScore = body.minScore ?? 60;

    // Skús načítať z DB
    const supabase = createAdminClient();
    const { data: dbProspects } = await supabase
      .from("stealth_recruiter_prospects")
      .select("*")
      .gte("score", minScore)
      .order("score", { ascending: false })
      .limit(20);

    let prospects = dbProspects ?? [];

    // Ak DB prázdna alebo generateNew, použi demo dáta + AI scoring
    if (prospects.length === 0 || body.generateNew) {
      // Ak generateNew, AI vygeneruje komentár ku každému
      if (body.generateNew) {
        const scoredPrompt = `Pre každého zo 5 samopredajcov vygeneruj krátky (1 veta) diagnostický komentár v slovenčine vysvetľujúci prečo je vhodný kandidát pre makléra. Odpovedaj ako JSON array: [{"id":"sr_1","comment":"..."},...].

Kandidáti:
${DEMO_PROSPECTS.map(p => `- ${p.id}: ${p.address}, ${p.daysListed} dní inzeruje, znížil cenu o ${p.priceDropPercent}%`).join("\n")}`;

        try {
          const { content: rawJson } = await callOpenAI({
            model:           "gpt-4o-mini",
            max_tokens:      400,
            temperature:     0.5,
            tag:             "stealth-scan",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: "Odpovedaj VŽDY validným JSON." },
              { role: "user",   content: scoredPrompt },
            ],
          });

          const raw = JSON.parse(rawJson || "{}") as
            { candidates?: CommentItem[] } | CommentItem[];
          const comments: CommentItem[] = Array.isArray(raw) ? raw : (raw as { candidates?: CommentItem[] }).candidates ?? [];

          prospects = DEMO_PROSPECTS.map(p => {
            const comment = comments.find((c: CommentItem) => c.id === p.id);
            return { ...p, ai_comment: comment?.comment ?? null };
          });
        } catch {
          prospects = DEMO_PROSPECTS;
        }
      } else {
        prospects = DEMO_PROSPECTS;
      }

      // Ulož do DB pre budúce použitie
      const toInsert = DEMO_PROSPECTS.map(p => ({
        address:       p.address,
        platform:      p.platform,
        days_listed:   p.daysListed,
        original_price:p.originalPrice,
        current_price: p.currentPrice,
        score:         p.score,
        status:        p.status,
      }));

      try {
        await supabase
          .from("stealth_recruiter_prospects")
          .upsert(toInsert, { onConflict: "address" });
      } catch { /* ignore */ }
    }

    // Mapuj DB rows na output formát
    const result = prospects.map((p: ProspectRow | typeof DEMO_PROSPECTS[0]) => ({
      id:                "id" in p ? p.id : `db_${Math.random()}`,
      address:           p.address,
      platform:          "platform" in p ? p.platform : ((p as ProspectRow).platform ?? "other"),
      daysListed:        "daysListed" in p ? p.daysListed : (p as ProspectRow).days_listed ?? 0,
      originalPrice:     "originalPrice" in p ? p.originalPrice : (p as ProspectRow).original_price ?? 0,
      currentPrice:      "currentPrice" in p ? p.currentPrice : (p as ProspectRow).current_price ?? 0,
      priceDropPercent:  "priceDropPercent" in p
        ? p.priceDropPercent
        : (p as ProspectRow).original_price
          ? Math.round(((p as ProspectRow).original_price - (p as ProspectRow).current_price) / (p as ProspectRow).original_price * 1000) / 10
          : 0,
      score:             p.score ?? 0,
      status:            "status" in p ? p.status : ((p as ProspectRow).status ?? "identified"),
    }));

    return NextResponse.json({
      prospects: result.filter((p: { score: number }) => p.score >= minScore),
      total: result.length,
      source: (dbProspects?.length ?? 0) > 0 ? "db" : "demo",
    });
  } catch (err) {
    console.error("[stealth-recruiter/scan]", err);
    return NextResponse.json({ prospects: DEMO_PROSPECTS, total: DEMO_PROSPECTS.length, source: "fallback" });
  }
}

type CommentItem = { id: string; comment: string };
type ProspectRow = {
  id?: string;
  address: string;
  platform?: string;
  days_listed?: number;
  original_price: number;
  current_price: number;
  score?: number;
  status?: string;
};
