import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CRM_ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(CRM_ROOT, rel), "utf8");
}

describe("[verification] Smolko CRM chatbot MVP", () => {
  it("keeps the first slice internal and deterministic without LLM provider calls", () => {
    const route = read("src/app/api/ai/smolko-chat/route.ts");
    const engine = read("src/lib/smolko-chatbot.ts");

    expect(route).not.toContain("getClaudeClient");
    expect(route).not.toContain("OpenAI");
    expect(route).not.toContain("generateEmbedding");
    expect(route).not.toContain("callOpenAI");
    expect(engine).toContain("Neviem bezpečne odpovedať bez dohadu");
  });

  it("uses tenant-scoped CRM stores instead of public Concierge/booking writes", () => {
    const route = read("src/app/api/ai/smolko-chat/route.ts");
    const component = read("src/components/revolis/SmolkoChatbotPanel.tsx");

    expect(route).toContain("listLeads(undefined, supabase");
    expect(route).toContain("listTasks(supabase)");
    expect(route).not.toContain("scheduled_events");
    expect(route).not.toContain("portal_listings");
    expect(route).toContain("incrementUsageMetric");
    expect(route).toContain("ai_chatbot_queries");
    expect(component).toContain("Bez externého LLM");
  });

  it("surfaces outcome prompts for today's calls and risk rescue", () => {
    const engine = read("src/lib/smolko-chatbot.ts");

    expect(engine).toContain("Komu mám volať dnes?");
    expect(engine).toContain("Ktoré leady nesmiem stratiť?");
    expect(engine).toContain("Čo mám vybaviť ako prvé?");
  });
});
