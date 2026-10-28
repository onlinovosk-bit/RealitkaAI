import { callClaude, CLAUDE_SONNET, extractJson } from "./claude";
import { estimateClaudeCostEur } from "./llm-usage-cost";
import { cachedSystem, extractClaudeCacheUsage } from "./prompt-cache";
import type { ListingContent } from "./listing-content";
import {
  ListingVisionProviderError,
  type ListingVisionPhoto,
  type ListingVisionProvider,
} from "./listing-vision-provider";

function toClaudeImageBlock(photo: ListingVisionPhoto) {
  if (photo.source === "base64") {
    return {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: photo.mediaType,
        data: photo.data,
      },
    };
  }
  return {
    type: "image" as const,
    source: {
      type: "url" as const,
      url: photo.url,
    },
  };
}

export function createAnthropicListingVisionProvider(): ListingVisionProvider {
  return {
    id: "anthropic",
    async generate(input) {
      if (!process.env.ANTHROPIC_API_KEY?.trim()) {
        throw new ListingVisionProviderError(
          "ANTHROPIC_API_KEY nie je nastavený",
          "missing_key",
        );
      }

      const t0 = Date.now();
      try {
        const response = await callClaude(
          {
            model: CLAUDE_SONNET,
            max_tokens: 4096,
            system: cachedSystem(input.systemPrompt, CLAUDE_SONNET),
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: input.userPrompt },
                  ...input.photos.map(toClaudeImageBlock),
                ],
              },
            ],
          },
          "listing-from-photos",
        );

        const raw = response.content[0]?.type === "text" ? response.content[0].text : "{}";
        const cache = extractClaudeCacheUsage(response.usage);
        return {
          content: extractJson<ListingContent>(raw),
          audit: {
            model: CLAUDE_SONNET,
            costEur: estimateClaudeCostEur(
              CLAUDE_SONNET,
              response.usage.input_tokens,
              response.usage.output_tokens,
              {
                creationInputTokens: cache.cacheCreationInputTokens,
                readInputTokens: cache.cacheReadInputTokens,
              },
            ),
            latencyMs: Date.now() - t0,
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            cacheCreationInputTokens: cache.cacheCreationInputTokens,
            cacheReadInputTokens: cache.cacheReadInputTokens,
          },
        };
      } catch (err) {
        if (err instanceof ListingVisionProviderError) throw err;
        const message = err instanceof Error ? err.message : "Vision provider zlyhal";
        throw new ListingVisionProviderError(message, "provider_failed");
      }
    },
  };
}
