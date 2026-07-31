import { z } from "zod";

const LangfuseEnvSchema = z.object({
  secretKey: z.string().min(1),
  publicKey: z.string().min(1),
  baseUrl: z.string().url(),
  enabled: z.boolean(),
});

export type LangfuseConfig = z.infer<typeof LangfuseEnvSchema>;

let cachedConfig: LangfuseConfig | null | undefined;

function parseEnabledFlag(raw: string | undefined): boolean {
  if (raw === undefined || raw === "") return true;
  const normalized = raw.trim().toLowerCase();
  return normalized !== "false" && normalized !== "0" && normalized !== "off";
}

/** Typed Langfuse config from env. Returns null when keys are missing or disabled. */
export function getLangfuseConfig(): LangfuseConfig | null {
  if (cachedConfig !== undefined) return cachedConfig;

  const secretKey = process.env.LANGFUSE_SECRET_KEY?.trim();
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY?.trim();

  if (!secretKey || !publicKey) {
    cachedConfig = null;
    return null;
  }

  const parsed = LangfuseEnvSchema.safeParse({
    secretKey,
    publicKey,
    baseUrl: process.env.LANGFUSE_BASE_URL?.trim() || "https://cloud.langfuse.com",
    enabled: parseEnabledFlag(process.env.LANGFUSE_ENABLED),
  });

  if (!parsed.success || !parsed.data.enabled) {
    cachedConfig = null;
    return null;
  }

  cachedConfig = parsed.data;
  return cachedConfig;
}

export function isLangfuseEnabled(): boolean {
  return getLangfuseConfig() !== null;
}

/** Test-only reset — do not use in production code. */
export function resetLangfuseConfigCache(): void {
  cachedConfig = undefined;
}
