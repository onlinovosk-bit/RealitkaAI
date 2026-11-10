export type GatewayProviderId = "openai" | "anthropic" | "gemini" | "deepseek" | "xai";

export interface GatewayTask {
  taskId: string;
  prompt: string;
  /** Hard per-task ceiling in EUR for this completion (defaults from env). */
  maxCostEur?: number;
  /** Expected max input tokens for pre-flight estimate. */
  maxInputTokens?: number;
  /** Expected max output tokens for pre-flight estimate. */
  maxOutputTokens?: number;
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

export type GatewayCallStatus = "ok" | "error" | "blocked";

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
