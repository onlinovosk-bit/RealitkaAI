import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callOpenAI } from "@/lib/ai/openai";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";
import { checkCapabilityAccess } from "@/lib/license/access";
import {
  DEMO_STEALTH_PROSPECTS,
  isStealthRecruiterDemoMode,
} from "@/lib/stealth-recruiter/demo-prospects";
import {
  listStealthProspects,
  upsertStealthProspects,
} from "@/lib/stealth-recruiter/store";
import type { StealthProspect } from "@/types/acquisition-hub";

type CommentItem = { id: string; comment: string };

function capabilityErrorResponse(access: Awaited<ReturnType<typeof checkCapabilityAccess>>) {
  if (access.reason === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (access.reason === "no_profile") {
    return NextResponse.json({ error: "Profil nebol nájdený." }, { status: 404 });
  }
  if (access.reason === "no_agency") {
    return NextResponse.json(
      { error: "Chýba agency_id v profile — tenant scope nie je nastavený." },
      { status: 400 },
    );
  }
  return NextResponse.json(
    {
      error: "Tichý Náborár vyžaduje program Reality Monopol (Protocol Authority).",
      currentTier: access.tier,
      upgradeUrl: "/billing",
    },
    { status: 403 },
  );
}

async function enrichWithAiComments(prospects: StealthProspect[]): Promise<StealthProspect[]> {
  const scoredPrompt = `Pre každého zo ${prospects.length} samopredajcov vygeneruj krátky (1 veta) diagnostický komentár v slovenčine vysvetľujúci prečo je vhodný kandidát pre makléra. Odpovedaj ako JSON array: [{"id":"...","comment":"..."},...].

Kandidáti:
${prospects
  .map(
    (p) =>
      `- ${p.id}: ${p.address}, ${p.daysListed} dní inzeruje, znížil cenu o ${p.priceDropPercent}%`,
  )
  .join("\n")}`;

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

  const raw = JSON.parse(rawJson || "{}") as { candidates?: CommentItem[] } | CommentItem[];
  const comments: CommentItem[] = Array.isArray(raw)
    ? raw
    : ((raw as { candidates?: CommentItem[] }).candidates ?? []);

  return prospects.map((p) => {
    const comment = comments.find((c) => c.id === p.id);
    return comment?.comment ? { ...p, aiOutreach: comment.comment } : p;
  });
}

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
  const access = await checkCapabilityAccess("canUseStealthRecruiter");
  if (!access.allowed) {
    return capabilityErrorResponse(access);
  }

  const block = await checkAiRateLimit(access.userId!, "stealth-scan", 10);
  if (block) return NextResponse.json(block, { status: 429 });

  const demoMode = isStealthRecruiterDemoMode();

  try {
    const body = (await request.json()) as { area?: string; minScore?: number; generateNew?: boolean };
    const minScore = body.minScore ?? 60;
    const demoMode = isStealthRecruiterDemoMode();
    const supabase = await createClient();
    const agencyId = access.agencyId!;
    const profileId = access.profileId ?? null;

    let prospects = await listStealthProspects(
      agencyId,
      { minScore: 0, limit: 20 },
      supabase,
    );

    if (!demoMode) {
      if (prospects.length === 0) {
        return NextResponse.json(
          {
            error:
              "Stealth scan nie je dostupný bez externého zdroja signálov. Pripojte scraper integráciu alebo nastavte STEALTH_RECRUITER_DEMO=1 pre QA.",
            code: "SCAN_SOURCE_UNAVAILABLE",
          },
          { status: 503 },
        );
      }

      const filtered = prospects.filter((p) => p.score >= minScore);
      if (body.generateNew) {
        try {
          const enriched = await enrichWithAiComments(filtered);
          return NextResponse.json({
            prospects: enriched,
            total: enriched.length,
            source: "db",
            demoMode: false,
          });
        } catch (aiErr) {
          console.warn("[stealth-recruiter/scan] AI enrich failed:", aiErr);
        }
      }

      return NextResponse.json({
        prospects: filtered,
        total: filtered.length,
        source: "db",
        demoMode: false,
      });
    }

    if (prospects.length === 0 || body.generateNew) {
      prospects = await upsertStealthProspects(
        agencyId,
        profileId,
        DEMO_STEALTH_PROSPECTS,
        supabase,
      );
    }

    let result = prospects.filter((p) => p.score >= minScore);
    const seededFromDemo = prospects.some((p) =>
      DEMO_STEALTH_PROSPECTS.some((d) => d.address === p.address),
    );

    if (body.generateNew && result.length > 0) {
      try {
        result = await enrichWithAiComments(result);
      } catch (aiErr) {
        console.warn("[stealth-recruiter/scan] AI enrich failed:", aiErr);
      }
    }

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
      prospects: result,
      total: result.length,
      source: seededFromDemo ? "demo" : "db",
      demoMode: true,
    });
  } catch (err) {
    console.error("[stealth-recruiter/scan]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scan zlyhal." },
      { status: 500 },
    );
  }
}
