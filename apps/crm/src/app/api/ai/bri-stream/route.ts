/**
 * GET /api/ai/bri-stream
 * Server-Sent Events – live Buyer Readiness Index (simulované delty na reálnych lead IDs).
 */

export const runtime = "nodejs";

import { getDemoShowcaseLeads } from "@/lib/mock-data";
import { listLeads } from "@/lib/leads-store";

type BriLeadSlice = {
  id: string;
  name: string;
  score: number;
  bri: number;
};

async function loadLeadSlices(): Promise<BriLeadSlice[]> {
  try {
    const list = await listLeads();
    const top = list.slice(0, 24);
    if (top.length === 0) {
      return getDemoShowcaseLeads().slice(0, 10).map((l) => ({
        id: l.id,
        name: l.name,
        score: l.score,
        bri: l.buyer_readiness_score ?? l.score,
      }));
    }
    return top.map((l) => ({
      id: l.id,
      name: l.name,
      score: l.score,
      bri: l.buyer_readiness_score ?? l.score,
    }));
  } catch {
    return getDemoShowcaseLeads().slice(0, 10).map((l) => ({
      id: l.id,
      name: l.name,
      score: l.score,
      bri: l.buyer_readiness_score ?? l.score,
    }));
  }
}

export async function GET() {
  let intervalRef: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let cache = await loadLeadSlices();
      let refreshTick = 0;

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "CONNECTED",
            activityType: "bri_delta",
            at: new Date().toISOString(),
          })}\n\n`
        )
      );

      intervalRef = setInterval(async () => {
        try {
          refreshTick += 1;
          if (refreshTick % 6 === 0) {
            cache = await loadLeadSlices();
          }
          if (cache.length === 0) {
            cache = await loadLeadSlices();
          }

          const pick = cache[Math.floor(Math.random() * cache.length)];
          if (!pick) return;

          const delta = Math.floor(Math.random() * 7) - 2;
          const prev = pick.bri;
          const next = Math.min(100, Math.max(0, prev + delta));
          pick.bri = next;

          const payload = {
            type: "BRI_UPDATE",
            activityType: "bri_delta",
            leadId: pick.id,
            leadName: pick.name,
            previousScore: prev,
            newScore: next,
            delta,
            at: new Date().toISOString(),
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        } catch {
          if (intervalRef) {
            clearInterval(intervalRef);
            intervalRef = null;
          }
          try {
            controller.close();
          } catch {
            /* ignore */
          }
        }
      }, 3800);
    },
    cancel() {
      if (intervalRef) {
        clearInterval(intervalRef);
        intervalRef = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
