import type { ModelProvider, ProviderCallRequest, ProviderCallResult } from "../types.ts";
import { ProviderCallError } from "../types.ts";

export function createAnthropicProvider(model: string, apiKey: string): ModelProvider {
  return {
    id: "anthropic",
    model,
    async call(req: ProviderCallRequest): Promise<ProviderCallResult> {
      if (!apiKey) throw new ProviderCallError("auth", "ANTHROPIC_API_KEY is missing");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: req.model,
          max_tokens: req.maxOutputTokens,
          messages: [{ role: "user", content: req.prompt }],
        }),
      });
      if (res.status === 401 || res.status === 403) {
        throw new ProviderCallError("auth", `Anthropic auth failed (${res.status})`);
      }
      if (res.status === 429) {
        throw new ProviderCallError("rate_limit", "Anthropic rate limited");
      }
      if (!res.ok) {
        throw new ProviderCallError("unavailable", `Anthropic error (${res.status})`);
      }
      const json = (await res.json()) as {
        content?: Array<{ type?: string; text?: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      const text =
        json.content?.find((c) => c.type === "text")?.text ?? json.content?.[0]?.text ?? "";
      return {
        text,
        tokensIn: json.usage?.input_tokens ?? 0,
        tokensOut: json.usage?.output_tokens ?? 0,
      };
    },
  };
}
