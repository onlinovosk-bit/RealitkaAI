/**
 * Living spec: Anthropic prompt cache is attached only when the stable prefix
 * meets the model minimum. Listing (Sonnet) is the only in-repo prefix that
 * clears the bar; Haiku 4.5 call sites stay uncached.
 */
import { describe, expect, it } from "vitest";
import { CLAUDE_HAIKU, CLAUDE_SONNET } from "@/lib/ai/claude";
import { SYSTEM_PROMPT } from "@/lib/ai/listing-content";
import {
  cachedSystem,
  minCacheableTokensForModel,
  shouldCachePrefix,
} from "@/lib/ai/prompt-cache";

describe("[verification] anthropic prompt cache policy", () => {
  it("keeps official minima (Sonnet 1024, Haiku 4.5 4096)", () => {
    expect(minCacheableTokensForModel(CLAUDE_SONNET)).toBe(1024);
    expect(minCacheableTokensForModel(CLAUDE_HAIKU)).toBe(4096);
  });

  it("listing SYSTEM_PROMPT is cacheable on Sonnet and stays after the user breakpoint", () => {
    expect(shouldCachePrefix(SYSTEM_PROMPT, CLAUDE_SONNET)).toBe(true);
    expect(cachedSystem(SYSTEM_PROMPT, CLAUDE_SONNET)[0]?.cache_control).toEqual({
      type: "ephemeral",
    });
  });

  it("does not claim a Haiku 4.5 cache hit on the listing prefix (4 096 floor)", () => {
    expect(shouldCachePrefix(SYSTEM_PROMPT, CLAUDE_HAIKU)).toBe(false);
  });
});
