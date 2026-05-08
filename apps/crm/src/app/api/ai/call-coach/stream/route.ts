/**
 * POST /api/ai/call-coach/stream
 * SSE streaming pre real-time coaching feedback z prepisu hovoru.
 * Model: Haiku (latency-optimized), max_tokens: 500.
 *
 * Client usage:
 *   const res = await fetch('/api/ai/call-coach/stream', { method: 'POST', body: JSON.stringify({ transcript }) });
 *   const reader = res.body!.getReader();
 *   for (;;) { const { done, value } = await reader.read(); if (done) break; process(new TextDecoder().decode(value)); }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClaudeClient, CLAUDE_HAIKU } from "@/lib/ai/claude";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";

const SYSTEM = `Si realitný sales coach so 20 rokmi praxe v SR. \
Dávaš úprimnú, konkrétnu spätnú väzbu — nie generické pochvaly. \
Sústreď sa na čo maklér mohol urobiť inak, aby zvýšil šancu kúpy. \
Výstup je VŽDY validný JSON bez markdown.`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const block = await checkAiRateLimit(user.id, "call-coach-stream", 10);
  if (block) return NextResponse.json(block, { status: 429 });

  let transcript: string;
  try {
    const body = await req.json();
    transcript = body.transcript;
    if (!transcript || transcript.trim().length < 80) {
      return NextResponse.json({ ok: false, error: "transcript_too_short" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "transcript_too_short" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = getClaudeClient().messages.stream({
          model:      CLAUDE_HAIKU,
          max_tokens: 500,
          system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
          messages: [
            {
              role: "user",
              content: `Ohodnoť hovor makléra na základe prepisu:\n\n${transcript.slice(0, 6_000)}\n\nVráť JSON:
{
  "score": 0-100,
  "strengths": ["max 3 konkrétne veci čo maklér robil dobre"],
  "improvements": ["max 3 konkrétne veci na zlepšenie s dôvodom prečo"],
  "tip": "Jeden kľúčový tip na ďalší hovor (1 veta, akčný)",
  "next_suggestions": ["1-3 alternatívne vety čo mohol povedať pri konkrétnych momentoch hovoru"]
}`,
            },
          ],
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta" &&
            event.delta.text
          ) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "Connection":        "keep-alive",
    },
  });
}
