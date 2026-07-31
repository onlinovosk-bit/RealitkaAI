import { callClaude, CLAUDE_SONNET, extractJson } from "@/lib/ai/claude";
import { estimateClaudeCostEur } from "@/lib/ai/llm-usage-cost";
import {
  buildListingSystemPrompt,
  buildListingUserPrompt,
  LISTING_PROMPT_VERSION,
  listingPromptHash,
} from "@/lib/ai/prompts/listing-prompt";
import {
  formatListingInputForPrompt,
  type ListingInput,
} from "@/lib/ai/schemas/listing-input";
import {
  LISTING_OUTPUT_SCHEMA_VERSION,
  parseListingOutput,
  type ListingOutput,
} from "@/lib/ai/schemas/listing-output";

export type ListingGenerationAudit = {
  model: string;
  costEur: number;
  latencyMs: number;
  promptVersion: string;
  promptHash: string;
  schemaVersion: string;
};

export async function generateListingFromInput(
  input: ListingInput,
  trace?: { agencyId?: string | null; userId?: string | null },
): Promise<{ output: ListingOutput; audit: ListingGenerationAudit }> {
  const system = buildListingSystemPrompt();
  const userPrompt = buildListingUserPrompt(formatListingInputForPrompt(input));
  const t0 = Date.now();

  const response = await callClaude(
    {
      model: CLAUDE_SONNET,
      max_tokens: 4096,
      temperature: 0.4,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userPrompt }],
    },
    "generate-listing",
    {
      feature: "generate-listing",
      workflowType: "listing_generation",
      agencyId: trace?.agencyId,
      userId: trace?.userId,
    },
  );

  const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
  const parsed = parseListingOutput(extractJson<unknown>(raw));

  return {
    output: parsed,
    audit: {
      model: CLAUDE_SONNET,
      costEur: estimateClaudeCostEur(
        CLAUDE_SONNET,
        response.usage.input_tokens,
        response.usage.output_tokens,
      ),
      latencyMs: Date.now() - t0,
      promptVersion: LISTING_PROMPT_VERSION,
      promptHash: listingPromptHash(),
      schemaVersion: LISTING_OUTPUT_SCHEMA_VERSION,
    },
  };
}
