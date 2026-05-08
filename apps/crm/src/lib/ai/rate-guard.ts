import { rateLimit } from "@/lib/rate-limit";
import type { NextResponse } from "next/server";

type Json429 = { ok: false; error: string };

/**
 * Check per-user AI rate limit. Returns null if allowed, or a 429 response body if blocked.
 * Caller is responsible for returning the response:
 *   const block = await checkAiRateLimit(userId, "call-script", 20);
 *   if (block) return NextResponse.json(block, { status: 429 });
 */
export async function checkAiRateLimit(
  userId: string,
  route: string,
  maxPerMinute = 20,
): Promise<Json429 | null> {
  const key = `ai:${route}:${userId}`;
  const { allowed, remaining } = await rateLimit(key, maxPerMinute, 60_000);
  if (!allowed) {
    return {
      ok:    false,
      error: `Príliš veľa požiadaviek. Skúste znova o chvíľu. (limit: ${maxPerMinute}/min, zostatok: ${remaining})`,
    };
  }
  return null;
}
