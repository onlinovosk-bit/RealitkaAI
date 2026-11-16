export type GatewayProviderId = "openai" | "anthropic" | "gemini" | "deepseek" | "xai";

/** Budget slices of the one shared governor pool. Not extra pools. */
export type GatewayProjectId = "revolis" | "onlinovo" | "other";

/** Urgent work may use the reserve. Anything else is deferred when only the reserve remains. */
export type GatewayPriority = "urgent" | "normal";

export interface ProviderRateLimit {
  requestsLimit: number | null;
  requestsRemaining: number | null;
  requestsReset: string | null;
  tokensLimit: number | null;
  tokensRemaining: number | null;
  tokensReset: string | null;
}

export interface GatewayTask {
  taskId: string;
  prompt: string;
  /** Hard per-task ceiling in EUR for this completion (defaults from env). */
  maxCostEur?: number;
  /** Expected max input tokens for pre-flight estimate. */
  maxInputTokens?: number;
  /** Expected max output tokens for pre-flight estimate. */
  maxOutputTokens?: number;
  /** Which project slice this call draws. Missing means `other`. */
  projectId?: GatewayProjectId;
  /** Agent or bot id for attribution. Never inferred. */
  agentId?: string;
  /** Missing means non-urgent (`normal`) and may be deferred. */
  priority?: GatewayPriority;
}

export interface GatewayCompletion {
  text: string;
  provider: GatewayProviderId;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costEur: number;
  ms: number;
  attempts: number;
}

export type GatewayCallStatus = "ok" | "error" | "blocked" | "deferred";

export interface GatewayLedgerRecord {
  ts: string;
  taskId: string;
  status: GatewayCallStatus;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costEur: number;
  ms: number;
  attempts: number;
  errorCode?: string;
  projectId?: GatewayProjectId;
  agentId?: string;
  poolId?: string;
  /** Present only when the provider response included rate-limit headers. */
  rateLimit?: ProviderRateLimit | null;
}

export class GatewayError extends Error {
  readonly code: string;
  readonly attempts: number;

  constructor(code: string, message: string, attempts = 0) {
    super(message);
    this.name = "GatewayError";
    this.code = code;
    this.attempts = attempts;
  }
}

export interface ProviderCallResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  /** Null when the response had no rate-limit headers. Never synthesized. */
  rateLimit?: ProviderRateLimit | null;
}

export interface ProviderCallRequest {
  model: string;
  prompt: string;
  maxOutputTokens: number;
}

export type ProviderCallErrorKind = "auth" | "rate_limit" | "unavailable" | "unknown";

export class ProviderCallError extends Error {
  readonly kind: ProviderCallErrorKind;

  constructor(kind: ProviderCallErrorKind, message: string) {
    super(message);
    this.name = "ProviderCallError";
    this.kind = kind;
  }
}

export interface ModelProvider {
  readonly id: GatewayProviderId;
  readonly model: string;
  call(req: ProviderCallRequest): Promise<ProviderCallResult>;
}
