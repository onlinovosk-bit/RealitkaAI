import { describe, expect, it } from "vitest";
import { CLAUDE_HAIKU, CLAUDE_SONNET } from "../claude";
import { SYSTEM_PROMPT } from "../listing-content-system-prompt";
import { sanitizeSystem } from "../sanitize";
import {
  applyCachedSystem,
  cachedSystem,
  estimateCacheTokens,
  extractClaudeCacheUsage,
  formatClaudeUsageLog,
  minCacheableTokensForModel,
  shouldCachePrefix,
} from "../prompt-cache";

describe("prompt-cache eligibility", () => {
  it("uses official mins: Sonnet 1024, Haiku 4.5 4096, Haiku 3.5 2048", () => {
    expect(minCacheableTokensForModel(CLAUDE_SONNET)).toBe(1024);
    expect(minCacheableTokensForModel(CLAUDE_HAIKU)).toBe(4096);
    expect(minCacheableTokensForModel("claude-3-5-haiku-latest")).toBe(2048);
    expect(minCacheableTokensForModel("unknown-claude")).toBe(4096);
  });

  it("marks the listing FINAL system prompt cacheable on Sonnet, not on Haiku 4.5", () => {
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(10_000);
    expect(shouldCachePrefix(SYSTEM_PROMPT, CLAUDE_SONNET)).toBe(true);
    expect(shouldCachePrefix(SYSTEM_PROMPT, CLAUDE_HAIKU)).toBe(false);
    expect(cachedSystem(SYSTEM_PROMPT, CLAUDE_SONNET)[0]?.cache_control).toEqual({
      type: "ephemeral",
    });
    expect(cachedSystem(SYSTEM_PROMPT, CLAUDE_HAIKU)[0]?.cache_control).toBeUndefined();
  });

  it("does not attach cache_control under the model minimum", () => {
    const short = "Si asistent. Výstup je JSON.";
    expect(estimateCacheTokens(short)).toBeLessThan(1024);
    expect(cachedSystem(short, CLAUDE_SONNET)[0]).toEqual({ type: "text", text: short });
    expect(cachedSystem(short, CLAUDE_HAIKU)[0]).toEqual({ type: "text", text: short });
  });

  it("applyCachedSystem strips a no-op marker and adds one when the prefix is long enough", () => {
    const short = applyCachedSystem({
      model: CLAUDE_HAIKU,
      system: [{ type: "text", text: "krátky", cache_control: { type: "ephemeral" } }],
    });
    expect(short.system?.[0]).toEqual({ type: "text", text: "krátky" });

    const long = applyCachedSystem({
      model: CLAUDE_SONNET,
      system: SYSTEM_PROMPT,
    });
    expect(long.system?.[0]).toMatchObject({
      type: "text",
      text: SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    });
  });

  it("sanitizeSystem keeps cache_control while masking PII in the prefix", () => {
    const vault = {};
    const out = sanitizeSystem(
      [{ type: "text", text: `${SYSTEM_PROMPT}\nKontakt jan@example.com`, cache_control: { type: "ephemeral" } }],
      vault,
    );
    const block = Array.isArray(out) ? out[0] : undefined;
    expect(block).toMatchObject({ type: "text", cache_control: { type: "ephemeral" } });
    expect(block?.text).not.toContain("jan@example.com");
    expect(block?.text).toContain("[EMAIL_1]");
  });

  it("keeps variable user content out of the cached system block", () => {
    const blocks = cachedSystem(SYSTEM_PROMPT, CLAUDE_SONNET);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.text).toBe(SYSTEM_PROMPT);
    expect(blocks[0]?.text).not.toContain("NEHNUTEĽNOSŤ NA PREDAJ");
  });
});

describe("prompt-cache usage logging", () => {
  it("extracts cache_creation_input_tokens and cache_read_input_tokens", () => {
    expect(
      extractClaudeCacheUsage({
        cache_creation_input_tokens: 18_031,
        cache_read_input_tokens: 0,
      }),
    ).toEqual({ cacheCreationInputTokens: 18_031, cacheReadInputTokens: 0 });
    expect(extractClaudeCacheUsage({})).toEqual({
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    });
  });

  it("formats the stderr usage line with cache counters", () => {
    expect(
      formatClaudeUsageLog({
        input_tokens: 200,
        output_tokens: 80,
        cache_creation_input_tokens: 18_031,
        cache_read_input_tokens: 0,
      }),
    ).toBe("in:200 out:80 cache_write:18031 cache_read:0");
    expect(
      formatClaudeUsageLog({
        input_tokens: 200,
        output_tokens: 80,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 18_031,
      }),
    ).toBe("in:200 out:80 cache_write:0 cache_read:18031");
  });
});
