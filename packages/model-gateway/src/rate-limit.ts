import type { ProviderRateLimit } from "./types.ts";

function num(raw: string | null): number | null {
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function text(raw: string | null): string | null {
  if (raw === null) return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

/** Official response headers only. All-null means the provider sent no quota telemetry. */
export function rateLimitFromHeaders(
  style: "openai" | "anthropic",
  get: (name: string) => string | null,
): ProviderRateLimit | null {
  const pick = (name: string) => get(name);
  const limit =
    style === "openai"
      ? {
          requestsLimit: num(pick("x-ratelimit-limit-requests")),
          requestsRemaining: num(pick("x-ratelimit-remaining-requests")),
          requestsReset: text(pick("x-ratelimit-reset-requests")),
          tokensLimit: num(pick("x-ratelimit-limit-tokens")),
          tokensRemaining: num(pick("x-ratelimit-remaining-tokens")),
          tokensReset: text(pick("x-ratelimit-reset-tokens")),
        }
      : {
          requestsLimit: num(pick("anthropic-ratelimit-requests-limit")),
          requestsRemaining: num(pick("anthropic-ratelimit-requests-remaining")),
          requestsReset: text(pick("anthropic-ratelimit-requests-reset")),
          tokensLimit: num(pick("anthropic-ratelimit-tokens-limit")),
          tokensRemaining: num(pick("anthropic-ratelimit-tokens-remaining")),
          tokensReset: text(pick("anthropic-ratelimit-tokens-reset")),
        };
  const any = Object.values(limit).some((value) => value !== null);
  return any ? limit : null;
}
