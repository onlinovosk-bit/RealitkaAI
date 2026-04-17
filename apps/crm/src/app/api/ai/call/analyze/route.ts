import { okResponse, errorResponse } from "@/lib/api-response";
import { analyzeCall } from "@/lib/ai/call-analysis";
import { generateCallCoaching } from "@/lib/ai/call-coach";
import { getCurrentProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/leads-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (isSupabaseConfigured() && !profile) {
      return errorResponse("Neautorizovaný prístup.", 401);
    }

    const body = (await request.json()) as { text?: string };
    const text = String(body.text || "").trim();
    if (text.length < 10) {
      return errorResponse("Zadaj prepis hovoru (aspoň ~10 znakov).", 400);
    }

    const analysis = analyzeCall(text);
    const coaching = generateCallCoaching(analysis);

    return okResponse({
      transcriptPreview: text.length > 400 ? `${text.slice(0, 400)}…` : text,
      analysis,
      coaching,
    });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Analýza zlyhala.", 400);
  }
}
