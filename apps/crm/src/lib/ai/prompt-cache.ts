/**
 * Anthropic prompt-cache eligibility + block builders.
 *
 * Official mins (Claude API docs, 2026-10):
 * - Claude Sonnet 4.6 / Sonnet 4.5 / Sonnet 5: 1 024 tokens
 * - Claude Haiku 4.5: 4 096 tokens
 * - Claude Haiku 3.5: 2 048 tokens
 *
 * Shorter prefixes marked with cache_control are ignored (no error, no save).
 * Do not attach the marker unless the stable prefix is long enough.
 */

export const CACHE_CONTROL_EPHEMERAL = { type: "ephemeral" } as const;

/** Cache write is billed at 1.25× base input; read at 0.1×. */
export const CACHE_WRITE_MULTIPLIER = 1.25;
export const CACHE_READ_MULTIPLIER = 0.1;

export const MIN_CACHEABLE_TOKENS = {
  sonnet: 1_024,
  haiku45: 4_096,
  haiku35: 2_048,
} as const;

export type CachedSystemBlock = {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
};

export type ClaudeCacheUsage = {
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
};

/**
 * Conservative token estimate for eligibility only (not billing).
 * Anthropic bills from `usage`; this is chars/4 so we skip short prefixes.
 */
export function estimateCacheTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function minCacheableTokensForModel(model: string): number {
  const m = model.toLowerCase();
  if (
    m.includes("haiku-3-5") ||
    m.includes("haiku-3.5") ||
    m.includes("3-5-haiku") ||
    m.includes("3.5-haiku")
  ) {
    return MIN_CACHEABLE_TOKENS.haiku35;
  }
  if (m.includes("haiku")) return MIN_CACHEABLE_TOKENS.haiku45;
  if (m.includes("sonnet")) return MIN_CACHEABLE_TOKENS.sonnet;
  // Unknown Claude model: require the stricter Haiku 4.5 floor so we do not
  // attach a no-op (or a 1.25× write on a prefix that will not cache).
  return MIN_CACHEABLE_TOKENS.haiku45;
}

export function shouldCachePrefix(text: string, model: string): boolean {
  return estimateCacheTokens(text) >= minCacheableTokensForModel(model);
}

/**
 * Stable system prefix as a Messages API system block.
 * Attaches cache_control only when the prefix meets the model minimum.
 */
export function cachedSystem(text: string, model: string): CachedSystemBlock[] {
  const block: CachedSystemBlock = { type: "text", text };
  if (shouldCachePrefix(text, model)) {
    block.cache_control = { ...CACHE_CONTROL_EPHEMERAL };
  }
  return [block];
}

type SystemBlock = {
  type: string;
  text?: string;
  cache_control?: { type: "ephemeral" } | null;
  [key: string]: unknown;
};

type ParamsWithSystem = {
  model: string;
  system?: string | SystemBlock[];
};

/**
 * Safety net for `callClaude` and stream callers: convert a string system
 * into a cached block when eligible; strip cache_control when too short.
 */
export function applyCachedSystem<T extends ParamsWithSystem>(params: T): T {
  const { system, model } = params;
  if (system == null) return params;
  if (typeof system === "string") {
    return { ...params, system: cachedSystem(system, model) };
  }
  if (!Array.isArray(system) || system.length === 0) return params;

  const prefix = system
    .filter((b) => b.type === "text")
    .map((b) => (typeof b.text === "string" ? b.text : ""))
    .join("");
  const eligible = shouldCachePrefix(prefix, model);
  let lastText = -1;
  system.forEach((b, i) => {
    if (b.type === "text") lastText = i;
  });

  return {
    ...params,
    system: system.map((block, i) => {
      if (block.type !== "text") return block;
      const next: SystemBlock = { ...block };
      if (eligible && i === lastText) {
        next.cache_control = { ...CACHE_CONTROL_EPHEMERAL };
      } else {
        delete next.cache_control;
      }
      return next;
    }),
  };
}

export function extractClaudeCacheUsage(
  usage?: {
    cache_creation_input_tokens?: number | null;
    cache_read_input_tokens?: number | null;
  } | null,
): ClaudeCacheUsage {
  return {
    cacheCreationInputTokens: usage?.cache_creation_input_tokens ?? 0,
    cacheReadInputTokens: usage?.cache_read_input_tokens ?? 0,
  };
}

export function formatClaudeUsageLog(usage: {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}): string {
  const cache = extractClaudeCacheUsage(usage);
  return `in:${usage.input_tokens ?? 0} out:${usage.output_tokens ?? 0} cache_write:${cache.cacheCreationInputTokens} cache_read:${cache.cacheReadInputTokens}`;
}
