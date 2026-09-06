/**
 * Schema-tolerant AI cost write to `ai_action_audit`.
 *
 * Prod (2026-09-03) still has the June baseline columns only — missing
 * `cost_eur` / `credits_spent` / `model` / `latency_ms`. Repo migrations
 * `20260611000002_ai_action_audit_cost.sql` + `20260611000004_ai_cost_daily.sql`
 * exist but were never applied. `logAiAction` insert then fails and only
 * `console.warn`s (AP-010). This helper retries with cost fields in `meta`.
 */

import { createServiceRoleClient } from "@/lib/supabase/admin";

export type PersistAiCostTelemetryInput = {
  agencyId: string | null;
  feature: string;
  costEur: number | null;
  model?: string | null;
  latencyMs?: number | null;
  creditsSpent?: number | null;
  subjectPreview?: string | null;
  meta?: Record<string, unknown>;
};

export type PersistAiCostTelemetryResult = {
  ok: boolean;
  mode?: "full" | "meta_fallback";
  error?: string;
};

/** Detect PostgREST / Postgres errors for missing cost-related columns. */
export function isMissingCostColumnError(message: string): boolean {
  const m = message.toLowerCase();
  const mentionsColumn =
    m.includes("cost_eur") ||
    m.includes("credits_spent") ||
    m.includes("latency_ms") ||
    (m.includes("model") && m.includes("column"));
  const missing =
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("could not find");
  return mentionsColumn && missing;
}

export async function persistAiCostTelemetry(
  input: PersistAiCostTelemetryInput,
): Promise<PersistAiCostTelemetryResult> {
  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "service_unavailable" };

  const meta: Record<string, unknown> = {
    feature: input.feature,
    ...input.meta,
    costEur: input.costEur,
    model: input.model ?? null,
    latencyMs: input.latencyMs ?? null,
    creditsSpent: input.creditsSpent ?? null,
  };

  const base = {
    agency_id: input.agencyId,
    lead_id: null as string | null,
    action_kind: "ai_suggested",
    channel: "email",
    subject_preview: input.subjectPreview?.slice(0, 500) ?? null,
    meta,
  };

  const full = await supabase.from("ai_action_audit").insert({
    ...base,
    cost_eur: input.costEur,
    credits_spent: input.creditsSpent ?? null,
    model: input.model ?? null,
    latency_ms: input.latencyMs ?? null,
  });

  if (!full.error) return { ok: true, mode: "full" };

  if (!isMissingCostColumnError(full.error.message)) {
    console.warn("[persist-cost-telemetry] insert:", full.error.message);
    return { ok: false, error: full.error.message };
  }

  const safe = await supabase.from("ai_action_audit").insert(base);
  if (safe.error) {
    console.warn("[persist-cost-telemetry] meta fallback:", safe.error.message);
    return { ok: false, error: safe.error.message };
  }

  return { ok: true, mode: "meta_fallback" };
}
