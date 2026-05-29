import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";
import { callOpenAI } from "@/lib/ai/openai";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";
import { resolveProfileForAuthUser } from "@/lib/profiles/resolve-profile-for-auth";
import {
  bratislavaVerifiedAtRange,
  isStealthRecruiterDemoMode,
  normalizeRegion,
} from "@/lib/stealth-recruiter/scan-filters";

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

type ScanBody = {
  area?: string;
  minScore?: number;
  generateNew?: boolean;
  onlyToday?: boolean;
};

type CommentItem = { id: string; comment: string };

type ProspectRow = {
  id?: string;
  address: string;
  platform?: string;
  region?: string | null;
  days_listed?: number;
  original_price: number;
  current_price: number;
  score?: number;
  status?: string;
  verified_at?: string | null;
};

export async function POST(request: Request) {
  const supabaseAuth = await createServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const block = await checkAiRateLimit(user.id, "stealth-scan", 10);
  if (block) return NextResponse.json(block, { status: 429 });

  const demoMode = isStealthRecruiterDemoMode();

  try {
    const body = (await request.json()) as ScanBody;
    const minScore = body.minScore ?? 60;
    const area = normalizeRegion(body.area);
    const onlyToday = body.onlyToday === true;

    const { profile, profileMissingAgency } = await resolveProfileForAuthUser(
      supabaseAuth,
      user.id,
      "id, agency_id",
      user.email,
    );

    if (profileMissingAgency || !profile?.agency_id) {
      return NextResponse.json({
        prospects: [],
        total: 0,
        source: "empty",
        reason: "missing_agency",
      });
    }

    const supabase = createAdminClient();
    let query = supabase
      .from("stealth_recruiter_prospects")
      .select("*")
      .eq("agency_id", profile.agency_id)
      .in("status", ["identified", "verified"])
      .gte("score", minScore)
      .order("score", { ascending: false })
      .limit(20);

    if (area) {
      query = query.ilike("region", area);
    }

    if (onlyToday) {
      const { from, to } = bratislavaVerifiedAtRange();
      query = query.gte("verified_at", from).lt("verified_at", to);
    }

    const { data: dbProspects } = await query;
    let prospects: ProspectRow[] = dbProspects ?? [];

    if (prospects.length === 0 && demoMode && body.generateNew) {
      let demoSet = DEMO_PROSPECTS;
      if (area) {
        demoSet = demoSet.filter((p) =>
          p.address.toLowerCase().includes(area.toLowerCase()),
        );
      }

      if (body.generateNew && demoSet.length > 0) {
        const scoredPrompt = `Pre každého zo ${demoSet.length} samopredajcov vygeneruj krátky (1 veta) diagnostický komentár v slovenčine vysvetľujúci prečo je vhodný kandidát pre makléra. Odpovedaj ako JSON array: [{"id":"sr_1","comment":"..."},...].

Kandidáti:
${demoSet.map((p) => `- ${p.id}: ${p.address}, ${p.daysListed} dní inzeruje, znížil cenu o ${p.priceDropPercent}%`).join("\n")}`;

        try {
          const { content: rawJson } = await callOpenAI({
            model: "gpt-4o-mini",
            max_tokens: 400,
            temperature: 0.5,
            tag: "stealth-scan",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: "Odpovedaj VŽDY validným JSON." },
              { role: "user", content: scoredPrompt },
            ],
          });

          const raw = JSON.parse(rawJson || "{}") as
            | { candidates?: CommentItem[] }
            | CommentItem[];
          const comments: CommentItem[] = Array.isArray(raw)
            ? raw
            : (raw as { candidates?: CommentItem[] }).candidates ?? [];

          prospects = demoSet.map((p) => {
            const comment = comments.find((c) => c.id === p.id);
            return {
              id: p.id,
              address: p.address,
              platform: p.platform,
              region: area ?? "Prešov",
              days_listed: p.daysListed,
              original_price: p.originalPrice,
              current_price: p.currentPrice,
              score: p.score,
              status: p.status,
              ai_comment: comment?.comment ?? null,
            };
          });
        } catch {
          prospects = demoSet.map((p) => ({
            id: p.id,
            address: p.address,
            platform: p.platform,
            region: area ?? "Prešov",
            days_listed: p.daysListed,
            original_price: p.originalPrice,
            current_price: p.currentPrice,
            score: p.score,
            status: p.status,
          }));
        }
      } else if (demoMode) {
        prospects = demoSet.map((p) => ({
          id: p.id,
          address: p.address,
          platform: p.platform,
          region: area ?? "Prešov",
          days_listed: p.daysListed,
          original_price: p.originalPrice,
          current_price: p.currentPrice,
          score: p.score,
          status: p.status,
        }));
      }

      if (demoMode && body.generateNew) {
        const toInsert = demoSet.map((p) => ({
          agency_id: profile.agency_id,
          address: p.address,
          region: area ?? "Prešov",
          platform: p.platform,
          days_listed: p.daysListed,
          original_price: p.originalPrice,
          current_price: p.currentPrice,
          score: p.score,
          status: p.status,
          verified_at: new Date().toISOString(),
          scraped_at: new Date().toISOString(),
        }));

        try {
          await supabase
            .from("stealth_recruiter_prospects")
            .upsert(toInsert, { onConflict: "agency_id,address" });
        } catch {
          /* ignore */
        }
      }
    }

    const result = prospects.map((p: ProspectRow | (typeof DEMO_PROSPECTS)[0]) => ({
      id: "id" in p && p.id ? p.id : `db_${Math.random()}`,
      address: p.address,
      platform:
        "platform" in p && typeof p.platform === "string"
          ? p.platform
          : ((p as ProspectRow).platform ?? "other"),
      daysListed:
        "daysListed" in p
          ? p.daysListed
          : (p as ProspectRow).days_listed ?? 0,
      originalPrice:
        "originalPrice" in p
          ? p.originalPrice
          : (p as ProspectRow).original_price ?? 0,
      currentPrice:
        "currentPrice" in p
          ? p.currentPrice
          : (p as ProspectRow).current_price ?? 0,
      priceDropPercent:
        "priceDropPercent" in p
          ? p.priceDropPercent
          : (p as ProspectRow).original_price
            ? Math.round(
                (((p as ProspectRow).original_price -
                  (p as ProspectRow).current_price) /
                  (p as ProspectRow).original_price) *
                  1000,
              ) / 10
            : 0,
      score: p.score ?? 0,
      status:
        "status" in p && typeof p.status === "string"
          ? p.status
          : ((p as ProspectRow).status ?? "identified"),
    }));

    const filtered = result.filter((p) => p.score >= minScore);

    if (filtered.length === 0 && !demoMode) {
      return NextResponse.json({
        prospects: [],
        total: 0,
        source: "empty",
        message: "Žiadni overení samopredajcovia v regióne Prešov dnes.",
      });
    }

    return NextResponse.json({
      prospects: filtered,
      total: filtered.length,
      source: (dbProspects?.length ?? 0) > 0 ? "db" : demoMode ? "demo" : "empty",
    });
  } catch (err) {
    console.error("[stealth-recruiter/scan]", err);
    if (demoMode) {
      return NextResponse.json({
        prospects: DEMO_PROSPECTS,
        total: DEMO_PROSPECTS.length,
        source: "fallback",
      });
    }
    return NextResponse.json({ prospects: [], total: 0, source: "error" }, { status: 500 });
  }
}
