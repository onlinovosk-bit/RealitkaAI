import type { ModelProvider, ProviderCallRequest, ProviderCallResult } from "../types.ts";
import { ProviderCallError } from "../types.ts";

export function createOpenAiProvider(model: string, apiKey: string): ModelProvider {
  return {
    id: "openai",
    model,
    async call(req: ProviderCallRequest): Promise<ProviderCallResult> {
      if (!apiKey) throw new ProviderCallError("auth", "OPENAI_API_KEY is missing");
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: req.model,
          messages: [{ role: "user", content: req.prompt }],
          max_tokens: req.maxOutputTokens,
        }),
      });
      if (res.status === 401 || res.status === 403) {
        throw new ProviderCallError("auth", `OpenAI auth failed (${res.status})`);
      }
      if (res.status === 429) {
        throw new ProviderCallError("rate_limit", "OpenAI rate limited");
      }
      if (!res.ok) {
        throw new ProviderCallError("unavailable", `OpenAI error (${res.status})`);
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const text = json.choices?.[0]?.message?.content ?? "";
      return {
        text,
        tokensIn: json.usage?.prompt_tokens ?? 0,
        tokensOut: json.usage?.completion_tokens ?? 0,
      };
    },
  };
}
