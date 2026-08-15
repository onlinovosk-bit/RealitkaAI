/**
 * Google Ads API client wrapper (Stage 0 / PR-S0.3).
 *
 * Auth credentials are intentionally NOT loaded here — inject a token provider
 * (wired in PR-S0.2). All HTTP goes through an injectable fetch (default: global).
 * No live Google calls in CI; unit tests use mocks only.
 */

export const GOOGLE_ADS_API_BASE_URL = "https://googleads.googleapis.com";
/** Current Google Ads REST version. v18 is sunset (HTML 404). Seed + client MUST import this. */
export const GOOGLE_ADS_API_VERSION = "v25";

/** Sensible Stage 0 default when GOOGLE_ADS_RATE_LIMIT_PER_TENANT is unset. */
export const DEFAULT_GOOGLE_ADS_RATE_LIMIT_PER_TENANT = 60;

export const DEFAULT_MAX_ATTEMPTS = 3;
export const DEFAULT_INITIAL_BACKOFF_MS = 200;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * Auth surface only — credential storage / OAuth / SA live in PR-S0.2.
 * Callers supply tokens; this module never reads secret env vars.
 */
export interface GoogleAdsTokenProvider {
  getAccessToken(): Promise<string> | string;
  /** Optional until credentials PR wires developer token. */
  getDeveloperToken?(): Promise<string> | string;
}

export type GoogleAdsFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export type GoogleAdsSleep = (ms: number) => Promise<void>;

export type GoogleAdsClientOptions = {
  /** Tenant key for per-agency rate limiting. */
  agencyId: string;
  /**
   * Google Ads customer id (digits). Resolved server-side from agency context —
   * never trust a raw client payload for this in route handlers.
   */
  customerId: string;
  auth: GoogleAdsTokenProvider;
  /** MCC login-customer-id header when operating under a manager account. */
  loginCustomerId?: string;
  fetchImpl?: GoogleAdsFetch;
  sleep?: GoogleAdsSleep;
  now?: () => number;
  /** Override env-derived limit (useful in tests). */
  rateLimitPerTenant?: number;
  rateLimitWindowMs?: number;
  maxAttempts?: number;
  initialBackoffMs?: number;
  baseUrl?: string;
  apiVersion?: string;
};

export class GoogleAdsRateLimitError extends Error {
  readonly code = "GOOGLE_ADS_RATE_LIMIT" as const;
  readonly agencyId: string;
  readonly limit: number;

  constructor(agencyId: string, limit: number) {
    super(
      `Google Ads rate limit exceeded for agency ${agencyId} (limit ${limit} per window)`,
    );
    this.name = "GoogleAdsRateLimitError";
    this.agencyId = agencyId;
    this.limit = limit;
  }
}

export class GoogleAdsRequestError extends Error {
  readonly code = "GOOGLE_ADS_REQUEST_FAILED" as const;
  readonly status: number | null;
  readonly attempts: number;
  readonly cause?: unknown;

  constructor(
    message: string,
    opts: { status?: number | null; attempts: number; cause?: unknown },
  ) {
    super(message);
    this.name = "GoogleAdsRequestError";
    this.status = opts.status ?? null;
    this.attempts = opts.attempts;
    this.cause = opts.cause;
  }
}

type WindowBucket = {
  windowStartMs: number;
  count: number;
};

const rateLimitBuckets = new Map<string, WindowBucket>();

export function resolveRateLimitPerTenant(
  envValue: string | undefined = process.env.GOOGLE_ADS_RATE_LIMIT_PER_TENANT,
  override?: number,
): number {
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return Math.floor(override);
  }
  if (envValue == null || envValue.trim() === "") {
    return DEFAULT_GOOGLE_ADS_RATE_LIMIT_PER_TENANT;
  }
  const parsed = Number.parseInt(envValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_GOOGLE_ADS_RATE_LIMIT_PER_TENANT;
  }
  return parsed;
}

/** Exponential backoff: initialBackoffMs * 2^(attemptIndex) for attemptIndex >= 0. */
export function computeBackoffMs(
  attemptIndex: number,
  initialBackoffMs: number = DEFAULT_INITIAL_BACKOFF_MS,
): number {
  if (attemptIndex < 0) {
    throw new Error("attemptIndex must be >= 0");
  }
  return initialBackoffMs * 2 ** attemptIndex;
}

export function resetGoogleAdsRateLimitState(): void {
  rateLimitBuckets.clear();
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeCustomerId(customerId: string): string {
  return customerId.replace(/-/g, "").trim();
}

export class GoogleAdsClient {
  private readonly agencyId: string;
  private readonly customerId: string;
  private readonly auth: GoogleAdsTokenProvider;
  private readonly loginCustomerId?: string;
  private readonly fetchImpl: GoogleAdsFetch;
  private readonly sleep: GoogleAdsSleep;
  private readonly now: () => number;
  private readonly rateLimitPerTenant: number;
  private readonly rateLimitWindowMs: number;
  private readonly maxAttempts: number;
  private readonly initialBackoffMs: number;
  private readonly baseUrl: string;
  private readonly apiVersion: string;

  constructor(options: GoogleAdsClientOptions) {
    if (!options.agencyId?.trim()) {
      throw new Error("GoogleAdsClient requires agencyId");
    }
    if (!options.customerId?.trim()) {
      throw new Error("GoogleAdsClient requires customerId");
    }
    if (!options.auth?.getAccessToken) {
      throw new Error("GoogleAdsClient requires auth.getAccessToken");
    }

    this.agencyId = options.agencyId.trim();
    this.customerId = normalizeCustomerId(options.customerId);
    this.auth = options.auth;
    this.loginCustomerId = options.loginCustomerId
      ? normalizeCustomerId(options.loginCustomerId)
      : undefined;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleep ?? defaultSleep;
    this.now = options.now ?? Date.now;
    this.rateLimitPerTenant = resolveRateLimitPerTenant(
      process.env.GOOGLE_ADS_RATE_LIMIT_PER_TENANT,
      options.rateLimitPerTenant,
    );
    this.rateLimitWindowMs =
      options.rateLimitWindowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS;
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.initialBackoffMs =
      options.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS;
    this.baseUrl = (options.baseUrl ?? GOOGLE_ADS_API_BASE_URL).replace(/\/$/, "");
    this.apiVersion = options.apiVersion ?? GOOGLE_ADS_API_VERSION;
  }

  getRateLimitPerTenant(): number {
    return this.rateLimitPerTenant;
  }

  /**
   * Consume one slot from the per-tenant window. Throws GoogleAdsRateLimitError
   * when the configured limit would be exceeded.
   */
  assertWithinRateLimit(): void {
    const nowMs = this.now();
    const existing = rateLimitBuckets.get(this.agencyId);
    if (!existing || nowMs - existing.windowStartMs >= this.rateLimitWindowMs) {
      rateLimitBuckets.set(this.agencyId, { windowStartMs: nowMs, count: 1 });
      return;
    }
    if (existing.count >= this.rateLimitPerTenant) {
      throw new GoogleAdsRateLimitError(this.agencyId, this.rateLimitPerTenant);
    }
    existing.count += 1;
  }

  /**
   * Low-level request with rate limit, auth headers, retry + exponential backoff.
   * Path is relative to `/<version>/customers/<customerId>/` unless absolute.
   */
  async request(
    path: string,
    init: RequestInit = {},
  ): Promise<{ status: number; body: unknown }> {
    this.assertWithinRateLimit();

    const url = this.resolveUrl(path);
    let lastError: unknown;
    let lastStatus: number | null = null;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const accessToken = await this.auth.getAccessToken();
        if (!accessToken) {
          throw new GoogleAdsRequestError(
            "Google Ads auth returned an empty access token",
            { attempts: attempt, status: null },
          );
        }

        const headers = new Headers(init.headers);
        headers.set("Authorization", `Bearer ${accessToken}`);
        headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");

        if (this.auth.getDeveloperToken) {
          const developerToken = await this.auth.getDeveloperToken();
          if (developerToken) {
            headers.set("developer-token", developerToken);
          }
        }
        if (this.loginCustomerId) {
          headers.set("login-customer-id", this.loginCustomerId);
        }

        const response = await this.fetchImpl(url, {
          ...init,
          headers,
        });
        lastStatus = response.status;

        const text = await response.text();
        const body = text ? safeParseJson(text) : null;

        if (response.ok) {
          return { status: response.status, body };
        }

        const retryable = RETRYABLE_STATUS_CODES.has(response.status);
        const message = extractErrorMessage(body, response.status);

        if (retryable && attempt < this.maxAttempts) {
          await this.sleep(computeBackoffMs(attempt - 1, this.initialBackoffMs));
          continue;
        }

        throw new GoogleAdsRequestError(message, {
          status: response.status,
          attempts: attempt,
        });
      } catch (error) {
        if (error instanceof GoogleAdsRequestError) {
          throw error;
        }
        if (error instanceof GoogleAdsRateLimitError) {
          throw error;
        }

        lastError = error;
        if (attempt >= this.maxAttempts) {
          throw new GoogleAdsRequestError(
            error instanceof Error
              ? error.message
              : "Google Ads request failed after retries",
            {
              status: lastStatus,
              attempts: attempt,
              cause: error,
            },
          );
        }
        await this.sleep(computeBackoffMs(attempt - 1, this.initialBackoffMs));
      }
    }

    throw new GoogleAdsRequestError(
      lastError instanceof Error
        ? lastError.message
        : "Google Ads request failed after retries",
      {
        status: lastStatus,
        attempts: this.maxAttempts,
        cause: lastError,
      },
    );
  }

  /** Convenience: Google Ads Search-style GAQL POST. */
  async search(query: string): Promise<unknown> {
    const result = await this.request(":search", {
      method: "POST",
      body: JSON.stringify({ query }),
    });
    return result.body;
  }

  private resolveUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const normalized = path.startsWith("/") ? path.slice(1) : path;
    if (normalized.startsWith("customers/")) {
      return `${this.baseUrl}/${this.apiVersion}/${normalized}`;
    }
    if (normalized.startsWith(":")) {
      return `${this.baseUrl}/${this.apiVersion}/customers/${this.customerId}${normalized}`;
    }
    return `${this.baseUrl}/${this.apiVersion}/customers/${this.customerId}/${normalized}`;
  }
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function extractErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.error === "string") {
      return record.error;
    }
    if (record.error && typeof record.error === "object") {
      const nested = record.error as Record<string, unknown>;
      if (typeof nested.message === "string") {
        return nested.message;
      }
    }
    if (typeof record.message === "string") {
      return record.message;
    }
  }
  if (typeof body === "string" && body.trim()) {
    return body;
  }
  return `Google Ads request failed (${status})`;
}
