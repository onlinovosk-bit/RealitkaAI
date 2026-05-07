/**
 * POST /api/ai/listing-content/stream
 * SSE streaming pre generovanie obsahu nehnuteľnosti.
 * UI zobrazuje text okamžite — žiadny spinner > 1s (L99 latency requirement).
 *
 * Client usage:
 *   const res = await fetch('/api/ai/listing-content/stream', { method: 'POST', body: JSON.stringify({ property, persona }) });
 *   const reader = res.body!.getReader();
 *   for (;;) { const { done, value } = await reader.read(); if (done) break; process(new TextDecoder().decode(value)); }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClaudeClient, CLAUDE_SONNET } from "@/lib/ai/claude";
import { SYSTEM_PROMPT, buildListingUserPrompt } from "@/lib/ai/listing-content";
import type { PropertyInput, ListingPersona } from "@/lib/ai/listing-content";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let property: PropertyInput, persona: ListingPersona;
  try {
    const body = await req.json();
    property = body.property;
    persona  = body.persona ?? "GENERAL";
    if (!property?.type || !property?.location) throw new Error("missing fields");
  } catch {
    return NextResponse.json({ ok: false, error: "property.type and property.location required" }, { status: 400 });
  }

  const encoder   = new TextEncoder();
  const userPrompt = buildListingUserPrompt(property, persona);

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = getClaudeClient().messages.stream({
          model:      CLAUDE_SONNET,
          max_tokens: 2200,
          system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: userPrompt }],
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
      "Content-Type":    "text/event-stream",
      "Cache-Control":   "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "Connection":      "keep-alive",
    },
  });
}
