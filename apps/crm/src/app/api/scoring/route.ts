import { NextResponse } from "next/server";

/**
 * 410 shim od 2026-06; zmazať po ~4 týždňoch bez volaní (over Vercel logy).
 * Legacy GET heuristika (SCRAPED → SCORED) bola odstránená — jediná scoring cesta je v2.
 */
const GONE_BODY = {
  error: "Gone",
  message:
    "Tento endpoint je deprecated. Použi POST /api/scoring/recalculate.",
  replacement: "/api/scoring/recalculate",
  docs: "AI Scoring 2.0: ai-scoring-store + /scoring",
};

export async function GET() {
  return NextResponse.json(GONE_BODY, { status: 410 });
}
