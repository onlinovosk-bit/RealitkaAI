/**
 * Google Ads Stage 0 credential loader (PR-S0.2).
 *
 * Secrets live in Vercel env / local `.env.local` (ZISTI: no KMS yet).
 * This module validates at use-time and never logs secret values.
 * Live Google API calls are intentionally out of scope here.
 */

/** Opaque DB pointer — Stage 0 vault equivalent (Vercel env). */
export const GOOGLE_ADS_CREDENTIAL_REF = "env:GOOGLE_ADS_SA_KEY_JSON";

/** Binding default from .env.local.example when the env var is unset/empty. */
export const DEFAULT_GOOGLE_ADS_RATE_LIMIT_PER_TENANT = 10;

const REQUIRED_ENV_KEYS = [
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_ADS_LOGIN_CUSTOMER_ID",
  "GOOGLE_ADS_SA_KEY_JSON",
] as const;

export type GoogleAdsRequiredEnvKey = (typeof REQUIRED_ENV_KEYS)[number];

export class GoogleAdsCredentialsError extends Error {
  readonly code: "MISSING_GOOGLE_ADS_CREDENTIAL" | "INVALID_GOOGLE_ADS_CREDENTIAL";
  readonly envName: string;

  constructor(
    code: GoogleAdsCredentialsError["code"],
    envName: string,
    message: string,
  ) {
    super(message);
    this.name = "GoogleAdsCredentialsError";
    this.code = code;
    this.envName = envName;
  }
}

export type GoogleAdsCredentials = {
  developerToken: string;
  /** Digits only (dashes stripped). */
  loginCustomerId: string;
  /**
   * Service account JSON as a string.
   * NEVER log, NEVER put in API responses, NEVER send to LLM context.
   */
  saKeyJson: string;
  rateLimitPerTenant: number;
};

/** Non-secret surface safe for logs / HTTP responses. */
export type GoogleAdsCredentialsPublicMeta = {
  loginCustomerId: string;
  rateLimitPerTenant: number;
  credentialRef: typeof GOOGLE_ADS_CREDENTIAL_REF;
  credentialType: "SERVICE_ACCOUNT";
  hasDeveloperToken: boolean;
  hasServiceAccountKey: boolean;
};

export function normalizeGoogleAdsCustomerId(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

function requireNonEmpty(
  env: NodeJS.ProcessEnv,
  key: GoogleAdsRequiredEnvKey,
): string {
  const raw = env[key];
  if (raw == null || String(raw).trim() === "") {
    throw new GoogleAdsCredentialsError(
      "MISSING_GOOGLE_ADS_CREDENTIAL",
      key,
      `Missing required Google Ads credential: ${key}`,
    );
  }
  return String(raw).trim();
}

function parseRateLimit(raw: string | undefined): number {
  if (raw == null || raw.trim() === "") {
    return DEFAULT_GOOGLE_ADS_RATE_LIMIT_PER_TENANT;
  }
  const parsed = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new GoogleAdsCredentialsError(
      "INVALID_GOOGLE_ADS_CREDENTIAL",
      "GOOGLE_ADS_RATE_LIMIT_PER_TENANT",
      "Invalid Google Ads credential: GOOGLE_ADS_RATE_LIMIT_PER_TENANT must be a positive integer",
    );
  }
  return parsed;
}

/**
 * Validate SA JSON shape without echoing secret material into error messages.
 */
export function assertValidServiceAccountJson(saKeyJson: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(saKeyJson);
  } catch {
    throw new GoogleAdsCredentialsError(
      "INVALID_GOOGLE_ADS_CREDENTIAL",
      "GOOGLE_ADS_SA_KEY_JSON",
      "Invalid Google Ads credential: GOOGLE_ADS_SA_KEY_JSON must be valid JSON",
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new GoogleAdsCredentialsError(
      "INVALID_GOOGLE_ADS_CREDENTIAL",
      "GOOGLE_ADS_SA_KEY_JSON",
      "Invalid Google Ads credential: GOOGLE_ADS_SA_KEY_JSON must be a JSON object",
    );
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.client_email !== "string" || obj.client_email.trim() === "") {
    throw new GoogleAdsCredentialsError(
      "INVALID_GOOGLE_ADS_CREDENTIAL",
      "GOOGLE_ADS_SA_KEY_JSON",
      "Invalid Google Ads credential: GOOGLE_ADS_SA_KEY_JSON missing client_email",
    );
  }
  if (typeof obj.private_key !== "string" || obj.private_key.trim() === "") {
    throw new GoogleAdsCredentialsError(
      "INVALID_GOOGLE_ADS_CREDENTIAL",
      "GOOGLE_ADS_SA_KEY_JSON",
      "Invalid Google Ads credential: GOOGLE_ADS_SA_KEY_JSON missing private_key",
    );
  }
}

/**
 * Load + validate Google Ads env credentials.
 * Throws {@link GoogleAdsCredentialsError} on missing/invalid values
 * (explicit failure — never silent `undefined`).
 */
export function loadGoogleAdsCredentials(
  env: NodeJS.ProcessEnv = process.env,
): GoogleAdsCredentials {
  const developerToken = requireNonEmpty(env, "GOOGLE_ADS_DEVELOPER_TOKEN");
  const loginRaw = requireNonEmpty(env, "GOOGLE_ADS_LOGIN_CUSTOMER_ID");
  const saKeyJson = requireNonEmpty(env, "GOOGLE_ADS_SA_KEY_JSON");

  const loginCustomerId = normalizeGoogleAdsCustomerId(loginRaw);
  if (!loginCustomerId) {
    throw new GoogleAdsCredentialsError(
      "INVALID_GOOGLE_ADS_CREDENTIAL",
      "GOOGLE_ADS_LOGIN_CUSTOMER_ID",
      "Invalid Google Ads credential: GOOGLE_ADS_LOGIN_CUSTOMER_ID must contain digits",
    );
  }

  assertValidServiceAccountJson(saKeyJson);

  return {
    developerToken,
    loginCustomerId,
    saKeyJson,
    rateLimitPerTenant: parseRateLimit(env.GOOGLE_ADS_RATE_LIMIT_PER_TENANT),
  };
}

export function toGoogleAdsCredentialsPublicMeta(
  creds: GoogleAdsCredentials,
): GoogleAdsCredentialsPublicMeta {
  return {
    loginCustomerId: creds.loginCustomerId,
    rateLimitPerTenant: creds.rateLimitPerTenant,
    credentialRef: GOOGLE_ADS_CREDENTIAL_REF,
    credentialType: "SERVICE_ACCOUNT",
    hasDeveloperToken: Boolean(creds.developerToken),
    hasServiceAccountKey: Boolean(creds.saKeyJson),
  };
}

/**
 * Redact any known secret substrings from a log/response string.
 * Used by routes/tests to guarantee credentials never leak.
 */
export function redactGoogleAdsSecrets(
  text: string,
  creds?: Pick<GoogleAdsCredentials, "developerToken" | "saKeyJson"> | null,
): string {
  if (!creds) return text;
  let out = text;
  if (creds.developerToken) {
    out = out.split(creds.developerToken).join("[REDACTED_DEVELOPER_TOKEN]");
  }
  if (creds.saKeyJson) {
    out = out.split(creds.saKeyJson).join("[REDACTED_SA_KEY_JSON]");
    try {
      const parsed = JSON.parse(creds.saKeyJson) as { private_key?: string };
      if (parsed.private_key) {
        out = out.split(parsed.private_key).join("[REDACTED_PRIVATE_KEY]");
      }
    } catch {
      /* ignore */
    }
  }
  return out;
}

/** True if haystack contains developer token or SA key material. */
export function containsGoogleAdsSecret(
  haystack: string,
  creds: Pick<GoogleAdsCredentials, "developerToken" | "saKeyJson">,
): boolean {
  if (!haystack) return false;
  if (creds.developerToken && haystack.includes(creds.developerToken)) {
    return true;
  }
  if (creds.saKeyJson && haystack.includes(creds.saKeyJson)) {
    return true;
  }
  try {
    const parsed = JSON.parse(creds.saKeyJson) as { private_key?: string };
    if (parsed.private_key && haystack.includes(parsed.private_key)) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
