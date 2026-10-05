import { AgentError } from "./types.js";

export interface BudgetLimits {
  maxRows: number;
  maxCalls: number;
  /** Deterministic code retries nothing. Any retry is a defect or an attack on cost. */
  maxRetries: number;
  /** Cost of LLM use is zero in P10. Raising this needs a measured cost (P08 §K). */
  maxLlmCalls: number;
}

export const DEFAULT_LIMITS: Readonly<BudgetLimits> = {
  maxRows: 50_000,
  maxCalls: 10_000,
  maxRetries: 0,
  maxLlmCalls: 0,
};

/** A limit that is not enforced is not a limit. */
export class RunBudget {
  private rows = 0;
  private calls = 0;
  private retries = 0;
  private llmCalls = 0;

  constructor(private readonly limits: Readonly<BudgetLimits> = DEFAULT_LIMITS) {}

  spendRows(n: number): void {
    this.rows += n;
    if (this.rows > this.limits.maxRows) {
      throw new AgentError("BUDGET_EXCEEDED", `rows ${this.rows} > ${this.limits.maxRows}`);
    }
  }

  spendCall(): void {
    this.calls += 1;
    if (this.calls > this.limits.maxCalls) {
      throw new AgentError("BUDGET_EXCEEDED", `calls ${this.calls} > ${this.limits.maxCalls}`);
    }
  }

  spendRetry(): void {
    this.retries += 1;
    if (this.retries > this.limits.maxRetries) {
      throw new AgentError("BUDGET_EXCEEDED", `retries ${this.retries} > ${this.limits.maxRetries}`);
    }
  }

  spendLlmCall(): void {
    this.llmCalls += 1;
    if (this.llmCalls > this.limits.maxLlmCalls) {
      throw new AgentError("BUDGET_EXCEEDED", `llm calls ${this.llmCalls} > ${this.limits.maxLlmCalls}`);
    }
  }

  usage(): { rows: number; calls: number; retries: number; llm_calls: number } {
    return { rows: this.rows, calls: this.calls, retries: this.retries, llm_calls: this.llmCalls };
  }
}
