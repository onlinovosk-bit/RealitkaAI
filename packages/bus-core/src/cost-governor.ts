/**
 * API Cost Governor v1 — USD policy beside the execution-count cap.
 *
 * The count cap in `execution-cap.ts` limits how many runs start. This module
 * limits how much those runs may cost. It does not call a provider, does not
 * raise a budget, and does not treat a configured snapshot as a live price list.
 *
 * Windows are UTC calendar day (`YYYY-MM-DD`) and UTC calendar month (`YYYY-MM`).
 * They are not the rolling 24 h window of the count cap and not Europe/Bratislava.
 *
 * An in-flight provider call cannot be cancelled from here. After it finishes,
 * `settle` records the provider figure or leaves actual cost null. A second
 * authorize for that task does not start another call.
 */

import type { BusEnvelope } from "./types.ts";

export const COST_GOVERNOR_VERSION = "1.0.0";
export const CONFIGURED_SNAPSHOT_LABEL = "configured_snapshot_not_vendor_live" as const;

/**
 * Internal ceilings. These are governor policy, not a Claude Console balance,
 * not a purchased-credit target, and not a vendor invoice.
 */
export const INTERNAL_GOVERNOR_LIMITS = {
  per_task_usd: 0.5,
  daily_usd: 5,
  monthly_usd: 25,
  warn_remaining_ratio: 0.2,
  max_retries: 0,
  max_timeout_ms: 10 * 60_000,
} as const;

export type GovernorDecisionKind = "ALLOW" | "WARN" | "DOWNGRADE" | "ESCALATE" | "BLOCK";
export type CostSource = "provider_usage" | "unavailable";

export interface PriceSnapshotEntry {
  provider: string;
  model: string;
  /**
   * Operator ceiling for one estimate of this model.
   * Not a vendor rate and not permission to invent `actual_cost_usd`.
   */
  max_estimate_usd: number;
}

export interface PriceCatalog {
  version: string;
  /** When the operator wrote the snapshot. Not proof the vendor still charges this. */
  as_of: string;
  source_label: typeof CONFIGURED_SNAPSHOT_LABEL;
  entries: PriceSnapshotEntry[];
}

export interface GovernorLimits {
  per_task_usd: number;
  daily_usd: number;
  monthly_usd: number;
  warn_remaining_ratio: number;
  max_retries: number;
  max_timeout_ms: number;
}

export interface GovernorConfig {
  version: string;
  limits: GovernorLimits;
  catalog: PriceCatalog;
  /** Suggested cheaper model. Never switched to silently. */
  downgrade_to?: { provider: string; model: string };
  /** When set, `capability_id` must be a member. Empty list allows nothing. */
  capability_allowlist?: readonly string[];
  /** Parse/load failure. Authorize blocks before any reservation. */
  load_error?: string;
}

export interface TaskContractInput {
  task_id?: unknown;
  requester?: unknown;
  purpose?: unknown;
  risk?: unknown;
  provider?: unknown;
  model?: unknown;
  estimated_cost_usd?: unknown;
  max_cost_usd?: unknown;
  daily_remaining_usd?: unknown;
  monthly_remaining_usd?: unknown;
  acceptance_criteria?: unknown;
  approval_gate?: unknown;
  acked?: unknown;
  kill_switch?: unknown;
  side_effects?: unknown;
  timeout_ms?: unknown;
  retry_attempt?: unknown;
  capability_id?: unknown;
}

export interface GovernorDecision {
  decision: GovernorDecisionKind;
  code: string;
  reason: string;
  reservation_id: string | null;
  estimated_cost_usd: number | null;
  /** Decision time never has an actual. Only `settle` may set one, from provider usage. */
  actual_cost_usd: null;
  hold_usd: number;
  suggested_model?: { provider: string; model: string };
}

export interface LedgerEntry {
  reservation_id: string;
  task_id: string;
  requester: string;
  purpose_redacted: string;
  provider: string;
  model: string;
  decision: "ALLOW" | "WARN";
  estimated_cost_usd: number;
  hold_usd: number;
  actual_cost_usd: number | null;
  cost_source: CostSource | null;
  overage_usd: number | null;
  day_key: string;
  month_key: string;
  created_at: string;
  settled_at?: string;
}

export interface SettleInput {
  actual_cost_usd: number | null;
  cost_source: CostSource;
}

export type SettleResult =
  | { ok: true; entry: LedgerEntry }
  | { ok: false; decision: "BLOCK"; code: string; reason: string };

interface ValidContract {
  task_id: string;
  requester: string;
  purpose: string;
  risk: "low" | "medium" | "high";
  provider: string;
  model: string;
  estimated_cost_usd: number;
  max_cost_usd: number;
  daily_remaining_usd: number;
  monthly_remaining_usd: number;
  acceptance_criteria: string[];
  approval_gate: "AUTO-SAFE" | "GO REQUIRED" | "STOP";
  acked: boolean;
  kill_switch: boolean;
  side_effects: string[];
  timeout_ms: number;
  retry_attempt: number;
  capability_id?: string;
}

interface LedgerView {
  entries(): readonly LedgerEntry[];
  insert(entry: LedgerEntry): void;
  replace(reservationId: string, entry: LedgerEntry): void;
}

export interface CostLedger {
  transaction<T>(fn: (view: LedgerView) => T | Promise<T>): Promise<T>;
}

function forbiddenSideEffect(effect: string): boolean {
  if (/^billing(\.|$)/i.test(effect)) return true;
  if (/^(prod\.delete|portal\.scrape|auto_deploy|merge)$/i.test(effect)) return true;
  return /stripe|deploy|secret|credit|auto-?reload|purchase/i.test(effect);
}

const SECRET_PATTERNS: readonly RegExp[] = [
  /sk-[A-Za-z0-9_-]{8,}/g,
  /\b(?:api[_-]?key|token|secret|password|bearer)\b\s*[:=]\s*\S+/gi,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
];

export function redactSecrets(value: string): string {
  let next = value;
  for (const pattern of SECRET_PATTERNS) {
    next = next.replace(pattern, "[redacted]");
  }
  return next;
}

export function utcDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function utcMonthKey(now: Date): string {
  return now.toISOString().slice(0, 7);
}

export function defaultGovernorConfig(): GovernorConfig {
  return {
    version: COST_GOVERNOR_VERSION,
    limits: { ...INTERNAL_GOVERNOR_LIMITS },
    catalog: {
      version: COST_GOVERNOR_VERSION,
      as_of: "unconfigured",
      source_label: CONFIGURED_SNAPSHOT_LABEL,
      entries: [],
    },
    capability_allowlist: ["bus-alive", "repo-head"],
  };
}

export function parseGovernorConfig(value: unknown): { ok: true; config: GovernorConfig } | { ok: false; reason: string } {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "config must be a JSON object" };
  }
  const candidate = value as GovernorConfig;
  const problem = configError(candidate);
  if (problem) return { ok: false, reason: problem };
  return { ok: true, config: candidate };
}

function configError(config: GovernorConfig): string | null {
  if (config.load_error) return config.load_error;
  if (config.version !== COST_GOVERNOR_VERSION) return "config version is missing or not 1.0.0";
  const limits = config.limits;
  if (!limits) return "limits are missing";
  const money = [limits.per_task_usd, limits.daily_usd, limits.monthly_usd];
  if (money.some((value) => !Number.isFinite(value) || value <= 0)) return "limits must be finite and positive";
  if (!(limits.per_task_usd <= limits.daily_usd && limits.daily_usd <= limits.monthly_usd)) {
    return "limits must satisfy per_task <= daily <= monthly";
  }
  if (!Number.isFinite(limits.warn_remaining_ratio) || limits.warn_remaining_ratio <= 0 || limits.warn_remaining_ratio >= 1) {
    return "warn_remaining_ratio must be between 0 and 1";
  }
  if (!Number.isInteger(limits.max_retries) || limits.max_retries < 0) return "max_retries must be an integer >= 0";
  if (!Number.isFinite(limits.max_timeout_ms) || limits.max_timeout_ms <= 0) return "max_timeout_ms must be positive";
  const catalog = config.catalog;
  if (!catalog || catalog.version !== COST_GOVERNOR_VERSION) return "catalog version is missing or not 1.0.0";
  if (catalog.source_label !== CONFIGURED_SNAPSHOT_LABEL) {
    return "catalog source_label must be configured_snapshot_not_vendor_live";
  }
  if (typeof catalog.as_of !== "string" || catalog.as_of.trim() === "") return "catalog as_of is missing";
  if (!Array.isArray(catalog.entries)) return "catalog entries must be an array";
  const seen = new Set<string>();
  for (const entry of catalog.entries) {
    if (!entry || typeof entry.provider !== "string" || typeof entry.model !== "string") return "catalog entry is incomplete";
    if (!Number.isFinite(entry.max_estimate_usd) || entry.max_estimate_usd <= 0) return "catalog max_estimate_usd must be positive";
    const key = `${entry.provider}/${entry.model}`;
    if (seen.has(key)) return `duplicate catalog entry ${key}`;
    seen.add(key);
  }
  if (config.downgrade_to) {
    const target = findEntry(config, config.downgrade_to.provider, config.downgrade_to.model);
    if (!target) return "downgrade_to is not in the configured snapshot";
  }
  if (config.capability_allowlist !== undefined && !Array.isArray(config.capability_allowlist)) {
    return "capability_allowlist must be an array";
  }
  return null;
}

function findEntry(config: GovernorConfig, provider: string, model: string): PriceSnapshotEntry | undefined {
  return config.catalog.entries.find((entry) => entry.provider === provider && entry.model === model);
}

function block(
  code: string,
  reason: string,
  estimated: number | null,
  extra: Partial<GovernorDecision> = {},
): GovernorDecision {
  return {
    decision: "BLOCK",
    code,
    reason,
    reservation_id: null,
    estimated_cost_usd: estimated,
    actual_cost_usd: null,
    hold_usd: 0,
    ...extra,
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim() !== "");
}

function validateContract(input: TaskContractInput): { ok: true; contract: ValidContract } | { ok: false; reason: string } {
  const required: Array<[keyof TaskContractInput, unknown]> = [
    ["task_id", input.task_id],
    ["requester", input.requester],
    ["purpose", input.purpose],
    ["provider", input.provider],
    ["model", input.model],
  ];
  for (const [key, value] of required) {
    if (typeof value !== "string" || value.trim() === "") return { ok: false, reason: `${key} is missing` };
  }
  if (input.risk !== "low" && input.risk !== "medium" && input.risk !== "high") return { ok: false, reason: "risk is missing" };
  if (input.approval_gate !== "AUTO-SAFE" && input.approval_gate !== "GO REQUIRED" && input.approval_gate !== "STOP") {
    return { ok: false, reason: "approval_gate is missing" };
  }
  if (!Number.isFinite(input.estimated_cost_usd) || Number(input.estimated_cost_usd) <= 0) {
    return { ok: false, reason: "estimated_cost_usd must be a finite number greater than 0" };
  }
  if (!Number.isFinite(input.max_cost_usd) || Number(input.max_cost_usd) < Number(input.estimated_cost_usd)) {
    return { ok: false, reason: "max_cost_usd must be finite and at least the estimate" };
  }
  if (!Number.isFinite(input.daily_remaining_usd) || Number(input.daily_remaining_usd) < 0) {
    return { ok: false, reason: "daily_remaining_usd is missing" };
  }
  if (!Number.isFinite(input.monthly_remaining_usd) || Number(input.monthly_remaining_usd) < 0) {
    return { ok: false, reason: "monthly_remaining_usd is missing" };
  }
  if (!isStringArray(input.acceptance_criteria)) return { ok: false, reason: "acceptance_criteria is missing" };
  if (!isPositiveInt(input.timeout_ms)) return { ok: false, reason: "timeout_ms is missing" };
  const retry = input.retry_attempt === undefined ? 0 : input.retry_attempt;
  if (!isNonNegativeInt(retry)) return { ok: false, reason: "retry_attempt is invalid" };
  if (input.side_effects !== undefined && (!Array.isArray(input.side_effects) || input.side_effects.some((item) => typeof item !== "string"))) {
    return { ok: false, reason: "side_effects must be strings" };
  }
  if (input.capability_id !== undefined && typeof input.capability_id !== "string") {
    return { ok: false, reason: "capability_id must be a string" };
  }
  return {
    ok: true,
    contract: {
      task_id: String(input.task_id),
      requester: String(input.requester),
      purpose: String(input.purpose),
      risk: input.risk,
      provider: String(input.provider),
      model: String(input.model),
      estimated_cost_usd: Number(input.estimated_cost_usd),
      max_cost_usd: Number(input.max_cost_usd),
      daily_remaining_usd: Number(input.daily_remaining_usd),
      monthly_remaining_usd: Number(input.monthly_remaining_usd),
      acceptance_criteria: input.acceptance_criteria,
      approval_gate: input.approval_gate,
      acked: input.acked === true,
      kill_switch: input.kill_switch === true,
      side_effects: (input.side_effects as string[] | undefined) ?? [],
      timeout_ms: Number(input.timeout_ms),
      retry_attempt: Number(retry),
      capability_id: typeof input.capability_id === "string" ? input.capability_id : undefined,
    },
  };
}

function budgetUsd(entry: LedgerEntry): number {
  return entry.actual_cost_usd === null ? entry.hold_usd : entry.actual_cost_usd;
}

export class InMemoryCostLedger implements CostLedger {
  private entries: LedgerEntry[] = [];
  private tail: Promise<void> = Promise.resolve();

  async transaction<T>(fn: (view: LedgerView) => T | Promise<T>): Promise<T> {
    const run = this.tail.then(async () => {
      let next = this.entries.map((entry) => ({ ...entry }));
      const view: LedgerView = {
        entries: () => next,
        insert: (entry) => {
          next = [...next, { ...entry }];
        },
        replace: (reservationId, entry) => {
          const index = next.findIndex((candidate) => candidate.reservation_id === reservationId);
          if (index < 0) throw new Error(`reservation ${reservationId} not found`);
          const copy = next.slice();
          copy[index] = { ...entry };
          next = copy;
        },
      };
      const result = await fn(view);
      this.entries = next;
      return result;
    });
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

export class UnavailableCostLedger implements CostLedger {
  async transaction<T>(_fn: (view: LedgerView) => T | Promise<T>): Promise<T> {
    throw new Error("cost ledger unavailable");
  }
}

export interface LedgerIo {
  read(file: string): Promise<string | undefined>;
  write(file: string, contents: string): Promise<void>;
}

/**
 * One-process ledger on disk. A second OS process can still lose an update;
 * that race is outside this lock. A missing file is an empty budget. A file
 * that cannot be parsed fails the transaction, and the governor blocks.
 */
export class FileCostLedger implements CostLedger {
  private tail: Promise<void> = Promise.resolve();
  private readonly file: string;
  private readonly io: LedgerIo;

  constructor(file: string, io: LedgerIo) {
    this.file = file;
    this.io = io;
  }

  async transaction<T>(fn: (view: LedgerView) => T | Promise<T>): Promise<T> {
    const run = this.tail.then(async () => {
      const raw = await this.io.read(this.file);
      let next = raw === undefined ? [] : parseLedger(raw);
      const view: LedgerView = {
        entries: () => next,
        insert: (entry) => {
          next = [...next, { ...entry }];
        },
        replace: (reservationId, entry) => {
          const index = next.findIndex((candidate) => candidate.reservation_id === reservationId);
          if (index < 0) throw new Error(`reservation ${reservationId} not found`);
          const copy = next.slice();
          copy[index] = { ...entry };
          next = copy;
        },
      };
      const result = await fn(view);
      await this.io.write(this.file, JSON.stringify(next));
      return result;
    });
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

function parseLedger(raw: string): LedgerEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("cost ledger file is not JSON");
  }
  if (!Array.isArray(parsed)) throw new Error("cost ledger file is not an array");
  return parsed.map((value) => {
    if (value === null || typeof value !== "object") throw new Error("cost ledger entry is not an object");
    const entry = value as LedgerEntry;
    if (typeof entry.reservation_id !== "string" || typeof entry.hold_usd !== "number" || typeof entry.estimated_cost_usd !== "number") {
      throw new Error("cost ledger entry is incomplete");
    }
    if (entry.actual_cost_usd !== null && (typeof entry.actual_cost_usd !== "number" || !Number.isFinite(entry.actual_cost_usd))) {
      throw new Error("cost ledger actual_cost_usd must be a finite number or null");
    }
    return { ...entry };
  });
}

export class CostGovernor {
  private readonly config: GovernorConfig;
  private readonly ledger: CostLedger;
  private readonly ids: () => string;

  constructor(config: GovernorConfig, ledger: CostLedger = new InMemoryCostLedger(), ids: () => string = defaultReservationId) {
    this.config = config;
    this.ledger = ledger;
    this.ids = ids;
  }

  async authorize(input: TaskContractInput, now = new Date()): Promise<GovernorDecision> {
    const configured = configError(this.config);
    if (configured) return block("invalid_config", configured, finiteOrNull(input.estimated_cost_usd));
    if (input.kill_switch === true) return block("kill_switch", "kill switch is on", finiteOrNull(input.estimated_cost_usd));
    if (input.approval_gate === "STOP") return block("stop", "STOP blocks a paid call", finiteOrNull(input.estimated_cost_usd));
    if (input.approval_gate === "GO REQUIRED") {
      return {
        decision: "ESCALATE",
        code: "go_required",
        reason: input.acked === true ? "GO REQUIRED survives ack" : "GO REQUIRED needs the founder",
        reservation_id: null,
        estimated_cost_usd: finiteOrNull(input.estimated_cost_usd),
        actual_cost_usd: null,
        hold_usd: 0,
      };
    }

    const parsed = validateContract(input);
    if (!parsed.ok) return block("invalid_contract", parsed.reason, finiteOrNull(input.estimated_cost_usd));
    const contract = parsed.contract;
    const forbidden = contract.side_effects.find((effect) => forbiddenSideEffect(effect));
    if (forbidden) return block("forbidden_side_effect", `refused side effect ${forbidden}`, contract.estimated_cost_usd);
    if (contract.timeout_ms > this.config.limits.max_timeout_ms) {
      return block("timeout", `timeout_ms ${contract.timeout_ms} exceeds ${this.config.limits.max_timeout_ms}`, contract.estimated_cost_usd);
    }
    if (this.config.capability_allowlist) {
      if (!contract.capability_id || !this.config.capability_allowlist.includes(contract.capability_id)) {
        return block("capability_denied", "capability is not on the governor allowlist", contract.estimated_cost_usd);
      }
    }

    try {
      return await this.ledger.transaction((view) => this.decide(view, contract, now));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return block("ledger_failure", reason, contract.estimated_cost_usd);
    }
  }

  async settle(reservationId: string, actual: SettleInput, now = new Date()): Promise<SettleResult> {
    try {
      return await this.ledger.transaction((view) => {
        const current = view.entries().find((entry) => entry.reservation_id === reservationId);
        if (!current) return { ok: false as const, decision: "BLOCK" as const, code: "unknown_reservation", reason: "reservation was not found" };
        if (current.settled_at) return { ok: false as const, decision: "BLOCK" as const, code: "already_settled", reason: "reservation is already settled" };
        if (actual.cost_source === "unavailable") {
          if (actual.actual_cost_usd !== null) {
            return { ok: false as const, decision: "BLOCK" as const, code: "actual_mismatch", reason: "unavailable cost cannot carry a number" };
          }
          const entry: LedgerEntry = {
            ...current,
            actual_cost_usd: null,
            cost_source: "unavailable",
            overage_usd: null,
            settled_at: now.toISOString(),
          };
          view.replace(reservationId, entry);
          return { ok: true as const, entry };
        }
        if (typeof actual.actual_cost_usd !== "number" || !Number.isFinite(actual.actual_cost_usd) || actual.actual_cost_usd < 0) {
          return {
            ok: false as const,
            decision: "BLOCK" as const,
            code: "actual_missing",
            reason: "provider usage did not include a finite non-negative actual_cost_usd",
          };
        }
        const entry: LedgerEntry = {
          ...current,
          actual_cost_usd: actual.actual_cost_usd,
          cost_source: "provider_usage",
          overage_usd: actual.actual_cost_usd > current.hold_usd ? roundUsd(actual.actual_cost_usd - current.hold_usd) : null,
          settled_at: now.toISOString(),
        };
        view.replace(reservationId, entry);
        return { ok: true as const, entry };
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return { ok: false, decision: "BLOCK", code: "ledger_failure", reason };
    }
  }

  async entries(): Promise<readonly LedgerEntry[]> {
    return this.ledger.transaction((view) => view.entries().map((entry) => ({ ...entry })));
  }

  private decide(view: LedgerView, contract: ValidContract, now: Date): GovernorDecision {
    const prior = view.entries().filter((entry) => entry.task_id === contract.task_id);
    if (prior.some((entry) => !entry.settled_at)) {
      return block("in_flight", "a paid call for this task is already reserved", contract.estimated_cost_usd);
    }
    if (prior.length > this.config.limits.max_retries) {
      return block("retry_limit", `${prior.length} reservation(s) already exist and max_retries is ${this.config.limits.max_retries}`, contract.estimated_cost_usd);
    }
    if (contract.retry_attempt > this.config.limits.max_retries) {
      return block("retry_limit", "retry_attempt exceeds max_retries", contract.estimated_cost_usd);
    }

    const priced = findEntry(this.config, contract.provider, contract.model);
    if (!priced) return block("unknown_price", "model is not in the configured snapshot", contract.estimated_cost_usd);
    if (contract.estimated_cost_usd > priced.max_estimate_usd) {
      return block("estimate_above_snapshot", "estimate exceeds the configured snapshot ceiling for this model", contract.estimated_cost_usd);
    }
    if (contract.max_cost_usd > this.config.limits.per_task_usd || contract.estimated_cost_usd > this.config.limits.per_task_usd) {
      const downgrade = this.config.downgrade_to;
      if (downgrade && (downgrade.provider !== contract.provider || downgrade.model !== contract.model)) {
        return {
          decision: "DOWNGRADE",
          code: "per_task_limit",
          reason: "estimate exceeds the per-task ceiling; a cheaper configured model is available and was not selected",
          reservation_id: null,
          estimated_cost_usd: contract.estimated_cost_usd,
          actual_cost_usd: null,
          hold_usd: 0,
          suggested_model: { provider: downgrade.provider, model: downgrade.model },
        };
      }
      return block("per_task_limit", "estimate exceeds the per-task ceiling", contract.estimated_cost_usd);
    }

    const day = utcDayKey(now);
    const month = utcMonthKey(now);
    const spentDay = sumSpent(view.entries(), (entry) => entry.day_key === day);
    const spentMonth = sumSpent(view.entries(), (entry) => entry.month_key === month);
    const dailyRemaining = Math.min(contract.daily_remaining_usd, this.config.limits.daily_usd - spentDay);
    const monthlyRemaining = Math.min(contract.monthly_remaining_usd, this.config.limits.monthly_usd - spentMonth);
    if (!Number.isFinite(dailyRemaining) || !Number.isFinite(monthlyRemaining)) {
      return block("unknown_budget", "remaining budget is not finite", contract.estimated_cost_usd);
    }
    if (contract.estimated_cost_usd > dailyRemaining) {
      return block("daily_limit", "estimate exceeds the remaining daily budget", contract.estimated_cost_usd);
    }
    if (contract.estimated_cost_usd > monthlyRemaining) {
      return block("monthly_limit", "estimate exceeds the remaining monthly budget", contract.estimated_cost_usd);
    }

    const afterDay = dailyRemaining - contract.estimated_cost_usd;
    const afterMonth = monthlyRemaining - contract.estimated_cost_usd;
    const warn =
      afterDay <= this.config.limits.warn_remaining_ratio * this.config.limits.daily_usd ||
      afterMonth <= this.config.limits.warn_remaining_ratio * this.config.limits.monthly_usd;
    const decision: "ALLOW" | "WARN" = warn ? "WARN" : "ALLOW";
    const entry: LedgerEntry = {
      reservation_id: this.ids(),
      task_id: contract.task_id,
      requester: redactSecrets(contract.requester),
      purpose_redacted: redactSecrets(contract.purpose),
      provider: contract.provider,
      model: contract.model,
      decision,
      estimated_cost_usd: contract.estimated_cost_usd,
      hold_usd: contract.estimated_cost_usd,
      actual_cost_usd: null,
      cost_source: null,
      overage_usd: null,
      day_key: day,
      month_key: month,
      created_at: now.toISOString(),
    };
    view.insert(entry);
    return {
      decision,
      code: decision === "WARN" ? "near_limit" : "within_limit",
      reason: decision === "WARN" ? "remaining budget is at or under the warn ratio" : "within configured limits",
      reservation_id: entry.reservation_id,
      estimated_cost_usd: contract.estimated_cost_usd,
      actual_cost_usd: null,
      hold_usd: entry.hold_usd,
    };
  }
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function defaultReservationId(): string {
  return `res_${Math.random().toString(36).slice(2, 10)}`;
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sumSpent(entries: readonly LedgerEntry[], include: (entry: LedgerEntry) => boolean): number {
  return entries.filter(include).reduce((sum, entry) => sum + budgetUsd(entry), 0);
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function providerForModel(model: string): string {
  if (/^(claude|haiku|sonnet|opus)(-|$)/i.test(model) || /^(haiku|sonnet|opus)$/i.test(model)) return "anthropic";
  return "unspecified";
}

/** Build the contract the bus runner is allowed to spend against. Missing numbers fail later as invalid_contract. */
export function contractFromBusTask(
  task: BusEnvelope,
  options: { model: string; timeoutMs: number; capabilityId: string },
): TaskContractInput {
  const counters = task.counters ?? {};
  return {
    task_id: task.id,
    requester: task.from,
    purpose: task.summary,
    risk: task.mode === "READ_ONLY" && task.next_action?.gate === "AUTO-SAFE" ? "low" : undefined,
    provider: providerForModel(options.model),
    model: options.model,
    estimated_cost_usd: counters.estimated_cost_usd,
    max_cost_usd: counters.max_cost_usd,
    daily_remaining_usd: counters.daily_remaining_usd,
    monthly_remaining_usd: counters.monthly_remaining_usd,
    acceptance_criteria: task.next_action?.description ? [task.next_action.description] : [],
    approval_gate: task.next_action?.gate,
    acked: false,
    kill_switch: false,
    side_effects: task.scope?.external_systems ?? [],
    timeout_ms: options.timeoutMs,
    retry_attempt: counters.retry_attempt ?? 0,
    capability_id: options.capabilityId,
  };
}

export interface RouteQuality {
  case_id: string;
  metric: string;
  score: number;
}

export interface RouteCandidate {
  provider: string;
  model: string;
  /** Operator ceiling. Not a vendor rate. */
  max_estimate_usd?: number | null;
  price_source?: "configured_snapshot" | "unavailable" | null;
  quality?: RouteQuality | null;
}

export interface RouteRequest {
  candidates: readonly RouteCandidate[];
  quality_bar: number;
  metric: string;
  case_id: string;
  environment: "production" | "non_production" | "unspecified";
  apply_switch?: boolean;
  budget_remaining_usd: number | null;
  retries_used: number;
  max_retries: number;
}

export interface RouteTelemetry {
  case_id: string;
  metric: string;
  quality_bar: number;
  candidate_count: number;
  environment: RouteRequest["environment"];
  retries_used: number;
  max_retries: number;
  budget_remaining_usd: number | null;
  selected_model: string | null;
}

export interface RouteDecision {
  decision: "RECOMMEND" | "BLOCK" | "INCOMPLETE";
  code: string;
  selected: { provider: string; model: string } | null;
  /** This function never switches a model, including outside production. */
  applied: false;
  reason: string;
  telemetry: RouteTelemetry;
}

function routeTelemetry(request: RouteRequest, selectedModel: string | null): RouteTelemetry {
  return {
    case_id: request.case_id,
    metric: request.metric,
    quality_bar: request.quality_bar,
    candidate_count: request.candidates.length,
    environment: request.environment,
    retries_used: request.retries_used,
    max_retries: request.max_retries,
    budget_remaining_usd: request.budget_remaining_usd,
    selected_model: selectedModel === null ? null : redactSecrets(selectedModel),
  };
}

function routeBlock(request: RouteRequest, code: string, reason: string): RouteDecision {
  return {
    decision: "BLOCK",
    code,
    selected: null,
    applied: false,
    reason,
    telemetry: routeTelemetry(request, null),
  };
}

/**
 * Advisory route. Picks the lowest configured ceiling that meets a measured bar.
 * Does not read a vendor price list, does not change INTERNAL_GOVERNOR_LIMITS,
 * and does not apply a model switch.
 */
export function selectRoute(request: RouteRequest): RouteDecision {
  if (request.apply_switch === true && request.environment === "production") {
    return routeBlock(request, "production_switch_forbidden", "production model switch is not applied");
  }
  if (
    !Number.isInteger(request.retries_used) ||
    !Number.isInteger(request.max_retries) ||
    request.retries_used < 0 ||
    request.max_retries < 0 ||
    request.retries_used > request.max_retries
  ) {
    return routeBlock(request, "retry_limit", "retry count is outside the configured bound");
  }
  if (typeof request.budget_remaining_usd !== "number" || !Number.isFinite(request.budget_remaining_usd)) {
    return routeBlock(request, "budget_unknown", "remaining budget is missing; failing closed");
  }
  if (!request.candidates.length) {
    return {
      decision: "INCOMPLETE",
      code: "no_candidates",
      selected: null,
      applied: false,
      reason: "there is no candidate to compare",
      telemetry: routeTelemetry(request, null),
    };
  }

  const complete: Array<RouteCandidate & { max_estimate_usd: number; quality: RouteQuality }> = [];
  for (const candidate of request.candidates) {
    const priced = candidate.price_source === "configured_snapshot"
      && typeof candidate.max_estimate_usd === "number"
      && Number.isFinite(candidate.max_estimate_usd)
      && candidate.max_estimate_usd >= 0;
    const quality = candidate.quality;
    const measured = !!quality
      && quality.case_id === request.case_id
      && quality.metric === request.metric
      && typeof quality.score === "number"
      && Number.isFinite(quality.score);
    if (!priced || !measured || !quality) {
      return {
        decision: "INCOMPLETE",
        code: "measurement_incomplete",
        selected: null,
        applied: false,
        reason: "a candidate is missing a configured ceiling or a measurement on this case",
        telemetry: routeTelemetry(request, null),
      };
    }
    complete.push({ ...candidate, max_estimate_usd: candidate.max_estimate_usd as number, quality });
  }

  const passing = complete.filter((candidate) => candidate.quality.score >= request.quality_bar);
  if (!passing.length) {
    return routeBlock(request, "quality_bar_unmet", "no measured candidate meets the quality bar");
  }
  const affordable = passing.filter((candidate) => candidate.max_estimate_usd <= (request.budget_remaining_usd as number));
  if (!affordable.length) {
    return routeBlock(request, "budget_exhausted", "every candidate that meets the bar exceeds the remaining budget");
  }
  affordable.sort((a, b) => a.max_estimate_usd - b.max_estimate_usd || a.provider.localeCompare(b.provider) || a.model.localeCompare(b.model));
  const best = affordable[0];
  if (!best) return routeBlock(request, "budget_exhausted", "every candidate that meets the bar exceeds the remaining budget");
  return {
    decision: "RECOMMEND",
    code: request.apply_switch === true ? "switch_not_applied" : "cheapest_passing_bar",
    selected: { provider: best.provider, model: best.model },
    applied: false,
    reason: "lowest configured ceiling among candidates that meet the measured bar; switch not applied",
    telemetry: routeTelemetry(request, best.model),
  };
}
