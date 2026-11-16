import type { CardConfidence } from "./usage.ts";

const STALE_AFTER_MS = 36 * 60 * 60 * 1000;

function statusLabel(status: CardConfidence): string {
  if (status === "live") return "Živé";
  if (status === "manual") return "Manuálne";
  if (status === "stale") return "Zastarané";
  return "Nedostupné";
}

export const QUOTA_WINDOWS = ["weekly", "monthly", "session", "custom"] as const;
export type QuotaWindow = (typeof QUOTA_WINDOWS)[number];

export const SUBSCRIPTION_THRESHOLDS = [50, 70, 85, 95] as const;

export type SubscriptionReaction = "WARN" | "REDUCE" | "DEFER_NON_URGENT" | "CRITICAL";

export type SubscriptionForecastStatus = "available" | "insufficient_data";

export interface SubscriptionPoolIdentity {
  provider: string;
  accountRef: string;
  quotaWindow: QuotaWindow;
}

export interface SubscriptionSnapshot {
  provider: string;
  accountRef: string;
  quotaWindow: QuotaWindow;
  source: "provider_api" | "manual_snapshot";
  usedPercent: number | null;
  remainingPercent: number | null;
  resetAt: string | null;
  resetTimezone: string | null;
  capturedAt: string | null;
  note: string | null;
}

export interface SubscriptionPercentSample {
  capturedAt: string;
  usedPercent: number;
  resetAt: string | null;
}

export type SubscriptionForecast =
  | {
      status: "available";
      burnPercentPerHour: number;
      remainingPercent: number;
      projectedExhaustionAt: string | null;
      sampleCount: number;
    }
  | {
      status: "insufficient_data";
      reason: "insufficient_samples" | "mixed_reset_period" | "no_burn";
      sampleCount: number;
    };

export interface SubscriptionCard {
  id: string;
  label: string;
  provider: string;
  accountRef: string;
  quotaWindow: QuotaWindow;
  usedPercent: number | null;
  remainingPercent: number | null;
  usedDisplay: string;
  remainingDisplay: string;
  status: CardConfidence;
  statusCode: "LIVE" | "MANUAL" | "STALE" | "UNAVAILABLE";
  statusLabel: string;
  source: string;
  capturedAt: string | null;
  resetAt: string | null;
  resetTimezone: string | null;
  resetDisplay: string;
  forecastLabel: string;
  reaction: SubscriptionReaction | null;
  reactionLabel: string;
  recommendation: string;
  note: string | null;
}

export interface SubscriptionCapacityView {
  cards: SubscriptionCard[];
  empty: boolean;
}

export const CANONICAL_SUBSCRIPTION_CARDS: Array<{
  identity: SubscriptionPoolIdentity;
  label: string;
}> = [
  {
    identity: { provider: "grok_bot", accountRef: "shared", quotaWindow: "weekly" },
    label: "Grok Bot — weekly shared pool",
  },
  {
    identity: { provider: "claude", accountRef: "shared", quotaWindow: "session" },
    label: "Claude — session / five-hour",
  },
  {
    identity: { provider: "claude", accountRef: "shared", quotaWindow: "weekly" },
    label: "Claude — weekly",
  },
];

const SECRETISH =
  /(api[_-]?key|secret|bearer\s|sk-[a-z0-9]|sk-ant-|xai-[a-z0-9]|-----begin)/i;

export function isQuotaWindow(value: unknown): value is QuotaWindow {
  return typeof value === "string" && (QUOTA_WINDOWS as readonly string[]).includes(value);
}

export function isValidIanaTimezone(value: string): boolean {
  if (!value || value.length > 64) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function looksLikeSecret(value: string): boolean {
  return SECRETISH.test(value);
}

export function normalizeProvider(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (value === "xai" || value === "grok" || value === "grok_bot") return "grok_bot";
  if (value === "anthropic" || value === "claude") return "claude";
  return value;
}

export function normalizeAccountRef(provider: string, accountRef: string, quotaWindow: QuotaWindow): string {
  const alias = accountRef.trim() || "default";
  if (normalizeProvider(provider) === "grok_bot" && quotaWindow === "weekly") return "shared";
  return alias;
}

export function subscriptionPoolId(identity: SubscriptionPoolIdentity): string {
  const provider = normalizeProvider(identity.provider);
  const accountRef = normalizeAccountRef(provider, identity.accountRef, identity.quotaWindow);
  return `${provider}:${accountRef}:${identity.quotaWindow}`;
}

export function canonicalIdentity(input: SubscriptionPoolIdentity): SubscriptionPoolIdentity {
  const provider = normalizeProvider(input.provider);
  const quotaWindow = input.quotaWindow;
  return {
    provider,
    accountRef: normalizeAccountRef(provider, input.accountRef, quotaWindow),
    quotaWindow,
  };
}

export function resolvePercents(input: {
  usedPercent: number | null | undefined;
  remainingPercent: number | null | undefined;
}): { ok: true; usedPercent: number; remainingPercent: number } | { ok: false; error: string } {
  const used = input.usedPercent;
  const remaining = input.remainingPercent;
  const hasUsed = typeof used === "number" && Number.isFinite(used);
  const hasRemaining = typeof remaining === "number" && Number.isFinite(remaining);
  if (!hasUsed && !hasRemaining) {
    return { ok: false, error: "used_percent alebo remaining_percent je povinné" };
  }
  if (hasUsed && (used < 0 || used > 100)) {
    return { ok: false, error: "used_percent musí byť 0–100" };
  }
  if (hasRemaining && (remaining < 0 || remaining > 100)) {
    return { ok: false, error: "remaining_percent musí byť 0–100" };
  }
  if (hasUsed && hasRemaining) {
    if (Math.abs(used + remaining - 100) > 0.05) {
      return { ok: false, error: "used_percent a remaining_percent musia dať 100" };
    }
    return { ok: true, usedPercent: round2(used), remainingPercent: round2(remaining) };
  }
  if (hasUsed && used !== undefined && used !== null) {
    return { ok: true, usedPercent: round2(used), remainingPercent: round2(100 - used) };
  }
  if (hasRemaining && remaining !== undefined && remaining !== null) {
    return { ok: true, usedPercent: round2(100 - remaining), remainingPercent: round2(remaining) };
  }
  return { ok: false, error: "used_percent alebo remaining_percent je povinné" };
}

export function parseIsoDate(value: string): Date | null {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms);
}

export interface ManualSnapshotInput {
  provider: string;
  accountRef: string;
  quotaWindow: string;
  usedPercent?: number | null;
  remainingPercent?: number | null;
  resetAt: string;
  resetTimezone: string;
  capturedAt: string;
  note?: string | null;
}

export type ValidatedManualSnapshot = SubscriptionPoolIdentity & {
  poolId: string;
  usedPercent: number;
  remainingPercent: number;
  resetAt: string;
  resetTimezone: string;
  capturedAt: string;
  note: string | null;
  source: "manual_snapshot";
};

export function validateManualSnapshot(input: ManualSnapshotInput):
  | { ok: true; value: ValidatedManualSnapshot }
  | { ok: false; error: string } {
  if (typeof input.provider !== "string" || !/^[a-z][a-z0-9_]{0,31}$/.test(input.provider.trim().toLowerCase())) {
    return { ok: false, error: "provider musí byť krátky identifikátor bez credentials" };
  }
  if (looksLikeSecret(input.provider) || looksLikeSecret(input.accountRef) || looksLikeSecret(input.note ?? "")) {
    return { ok: false, error: "pole nesmie obsahovať kľúč ani credentials" };
  }
  if (typeof input.accountRef !== "string" || !/^[a-zA-Z0-9._-]{1,64}$/.test(input.accountRef.trim())) {
    return { ok: false, error: "account alias musí byť 1–64 znakov [A-Za-z0-9._-]" };
  }
  if (!isQuotaWindow(input.quotaWindow)) {
    return { ok: false, error: "quota_window musí byť weekly, monthly, session alebo custom" };
  }
  const percents = resolvePercents({
    usedPercent: input.usedPercent,
    remainingPercent: input.remainingPercent,
  });
  if (!percents.ok) return percents;
  const resetAt = parseIsoDate(input.resetAt);
  const capturedAt = parseIsoDate(input.capturedAt);
  if (!resetAt) return { ok: false, error: "reset_at musí byť platný čas" };
  if (!capturedAt) return { ok: false, error: "captured_at musí byť platný čas" };
  if (!isValidIanaTimezone(input.resetTimezone)) {
    return { ok: false, error: "reset_timezone musí byť platná IANA zóna" };
  }
  const identity = canonicalIdentity({
    provider: input.provider,
    accountRef: input.accountRef,
    quotaWindow: input.quotaWindow,
  });
  const note = typeof input.note === "string" && input.note.trim() !== "" ? input.note.trim().slice(0, 500) : null;
  return {
    ok: true,
    value: {
      ...identity,
      poolId: subscriptionPoolId(identity),
      usedPercent: percents.usedPercent,
      remainingPercent: percents.remainingPercent,
      resetAt: resetAt.toISOString(),
      resetTimezone: input.resetTimezone,
      capturedAt: capturedAt.toISOString(),
      note,
      source: "manual_snapshot",
    },
  };
}

export function subscriptionConfidence(
  snapshot: Pick<SubscriptionSnapshot, "source" | "capturedAt">,
  now: Date,
): CardConfidence {
  if (!snapshot.capturedAt) return "unavailable";
  const captured = Date.parse(snapshot.capturedAt);
  if (!Number.isFinite(captured)) return "unavailable";
  const age = now.getTime() - captured;
  if (age < 0) return "unavailable";
  if (age > STALE_AFTER_MS) return "stale";
  if (snapshot.source === "provider_api") return "live";
  if (snapshot.source === "manual_snapshot") return "manual";
  return "unavailable";
}

export function statusCode(status: CardConfidence): SubscriptionCard["statusCode"] {
  if (status === "live") return "LIVE";
  if (status === "manual") return "MANUAL";
  if (status === "stale") return "STALE";
  return "UNAVAILABLE";
}

export function reactionForUsedPercent(usedPercent: number): SubscriptionReaction | null {
  if (!Number.isFinite(usedPercent)) return null;
  if (usedPercent >= 95) return "CRITICAL";
  if (usedPercent >= 85) return "DEFER_NON_URGENT";
  if (usedPercent >= 70) return "REDUCE";
  if (usedPercent >= 50) return "WARN";
  return null;
}

export function reactionLabel(reaction: SubscriptionReaction | null): string {
  if (reaction === "WARN") return "WARN";
  if (reaction === "REDUCE") return "REDUCE";
  if (reaction === "DEFER_NON_URGENT") return "DEFER NON-URGENT";
  if (reaction === "CRITICAL") return "CRITICAL";
  return "OK";
}

export function recommendationForReaction(reaction: SubscriptionReaction | null): string {
  if (reaction === "WARN") {
    return "Odporúčanie: skontrolovať Ostatné úlohy. Revolis.AI ostáva prvá. Nie je to vypnutie agenta.";
  }
  if (reaction === "REDUCE") {
    return "Odporúčanie: znížiť Ostatné; ONLINOVO.sk len ak neohrozí Revolis.AI. Bez vzdialeného vypnutia predplatného.";
  }
  if (reaction === "DEFER_NON_URGENT") {
    return "Odporúčanie: odložiť neurgentné. Priorita 1 Revolis.AI, 2 ONLINOVO.sk, 3 Ostatné. API volania spravuje Model Gateway.";
  }
  if (reaction === "CRITICAL") {
    return "Odporúčanie: len kritické Revolis.AI. Vzdialené zastavenie Grok Bot / Claude nie je sľúbené — chýba oficiálne control API.";
  }
  return "Spotreba pod 50 %. Žiadna zmena priority.";
}

export function resetPeriodKey(resetAt: string | null): string {
  if (!resetAt) return "unknown-reset";
  const ms = Date.parse(resetAt);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : "unknown-reset";
}

export function forecastFromPercentSamples(
  samples: readonly SubscriptionPercentSample[],
  nowMs: number,
): SubscriptionForecast {
  const dated = samples.filter((sample) => {
    const ms = Date.parse(sample.capturedAt);
    return Number.isFinite(ms) && ms <= nowMs && Number.isFinite(sample.usedPercent);
  });
  if (dated.length < 2) {
    return { status: "insufficient_data", reason: "insufficient_samples", sampleCount: dated.length };
  }
  const periods = new Set(dated.map((sample) => resetPeriodKey(sample.resetAt)));
  if (periods.size !== 1) {
    return { status: "insufficient_data", reason: "mixed_reset_period", sampleCount: dated.length };
  }
  const ordered = [...dated].sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  if (!first || !last) {
    return { status: "insufficient_data", reason: "insufficient_samples", sampleCount: 0 };
  }
  const spanMs = Date.parse(last.capturedAt) - Date.parse(first.capturedAt);
  if (!(spanMs > 0)) {
    return { status: "insufficient_data", reason: "insufficient_samples", sampleCount: ordered.length };
  }
  const delta = last.usedPercent - first.usedPercent;
  if (!(delta > 0)) {
    return { status: "insufficient_data", reason: "no_burn", sampleCount: ordered.length };
  }
  const burnPercentPerHour = delta / (spanMs / 3_600_000);
  const remainingPercent = round2(Math.max(0, 100 - last.usedPercent));
  const hoursLeft = remainingPercent / burnPercentPerHour;
  const projectedExhaustionAt =
    remainingPercent <= 0
      ? last.capturedAt
      : new Date(nowMs + hoursLeft * 3_600_000).toISOString();
  return {
    status: "available",
    burnPercentPerHour: round4(burnPercentPerHour),
    remainingPercent,
    projectedExhaustionAt,
    sampleCount: ordered.length,
  };
}

export function forecastLabel(result: SubscriptionForecast): string {
  if (result.status === "insufficient_data") return "INSUFFICIENT DATA";
  if (!result.projectedExhaustionAt) return "INSUFFICIENT DATA";
  return `Vyčerpanie ${result.projectedExhaustionAt} · ${result.burnPercentPerHour.toFixed(2)} %/h · zostáva ${result.remainingPercent} %`;
}

export function formatReset(resetAt: string | null, timeZone: string | null): string {
  if (!resetAt) return "Nedostupné";
  const date = parseIsoDate(resetAt);
  if (!date) return "Nedostupné";
  if (timeZone && isValidIanaTimezone(timeZone)) {
    try {
      const formatted = new Intl.DateTimeFormat("sk-SK", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone,
      }).format(date);
      return `${formatted} (${timeZone})`;
    } catch {
      return `${date.toISOString()} (${timeZone})`;
    }
  }
  return date.toISOString();
}

export function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "UNAVAILABLE";
  return `${round2(value)} %`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

export function groupSnapshots(
  snapshots: readonly SubscriptionSnapshot[],
): Map<string, SubscriptionSnapshot[]> {
  const groups = new Map<string, SubscriptionSnapshot[]>();
  for (const snapshot of snapshots) {
    const identity = canonicalIdentity({
      provider: snapshot.provider,
      accountRef: snapshot.accountRef,
      quotaWindow: snapshot.quotaWindow,
    });
    const id = subscriptionPoolId(identity);
    const list = groups.get(id) ?? [];
    list.push({ ...snapshot, ...identity });
    groups.set(id, list);
  }
  return groups;
}

function newestSnapshot(rows: readonly SubscriptionSnapshot[]): SubscriptionSnapshot | null {
  let best: SubscriptionSnapshot | null = null;
  let bestMs = -Infinity;
  for (const row of rows) {
    const ms = Date.parse(row.capturedAt ?? "");
    if (Number.isFinite(ms) && ms >= bestMs) {
      best = row;
      bestMs = ms;
    }
  }
  return best;
}

function cardFromGroup(
  identity: SubscriptionPoolIdentity,
  label: string,
  rows: readonly SubscriptionSnapshot[],
  now: Date,
): SubscriptionCard {
  const id = subscriptionPoolId(identity);
  const latest = newestSnapshot(rows);
  if (!latest || (latest.usedPercent === null && latest.remainingPercent === null)) {
    return unavailableCard(identity, label);
  }
  const percents = resolvePercents({
    usedPercent: latest.usedPercent,
    remainingPercent: latest.remainingPercent,
  });
  if (!percents.ok) return unavailableCard(identity, label);
  const status = subscriptionConfidence(latest, now);
  const samples: SubscriptionPercentSample[] = rows.flatMap((row) => {
    const resolved = resolvePercents({
      usedPercent: row.usedPercent,
      remainingPercent: row.remainingPercent,
    });
    if (!resolved.ok || !row.capturedAt) return [];
    return [{ capturedAt: row.capturedAt, usedPercent: resolved.usedPercent, resetAt: row.resetAt }];
  });
  const forecast = forecastFromPercentSamples(samples, now.getTime());
  const reaction = status === "unavailable" ? null : reactionForUsedPercent(percents.usedPercent);
  return {
    id,
    label,
    provider: identity.provider,
    accountRef: identity.accountRef,
    quotaWindow: identity.quotaWindow,
    usedPercent: percents.usedPercent,
    remainingPercent: percents.remainingPercent,
    usedDisplay: formatPercent(percents.usedPercent),
    remainingDisplay: formatPercent(percents.remainingPercent),
    status,
    statusCode: statusCode(status),
    statusLabel: statusLabel(status),
    source: latest.source === "provider_api" ? "oficiálna odpoveď API" : "manuálny snímok",
    capturedAt: latest.capturedAt,
    resetAt: latest.resetAt,
    resetTimezone: latest.resetTimezone,
    resetDisplay: formatReset(latest.resetAt, latest.resetTimezone),
    forecastLabel: forecastLabel(forecast),
    reaction,
    reactionLabel: reactionLabel(reaction),
    recommendation: recommendationForReaction(reaction),
    note: latest.note,
  };
}

function unavailableCard(identity: SubscriptionPoolIdentity, label: string): SubscriptionCard {
  return {
    id: subscriptionPoolId(identity),
    label,
    provider: identity.provider,
    accountRef: identity.accountRef,
    quotaWindow: identity.quotaWindow,
    usedPercent: null,
    remainingPercent: null,
    usedDisplay: "UNAVAILABLE",
    remainingDisplay: "UNAVAILABLE",
    status: "unavailable",
    statusCode: "UNAVAILABLE",
    statusLabel: statusLabel("unavailable"),
    source: "chýba snímok",
    capturedAt: null,
    resetAt: null,
    resetTimezone: null,
    resetDisplay: "Nedostupné",
    forecastLabel: "INSUFFICIENT DATA",
    reaction: null,
    reactionLabel: "UNAVAILABLE",
    recommendation: "Žiadne percentá sa nedopĺňajú. Chýbajúci zdroj ostáva UNAVAILABLE.",
    note: null,
  };
}

function extraLabel(identity: SubscriptionPoolIdentity): string {
  return `${identity.provider} — ${identity.quotaWindow} (${identity.accountRef})`;
}

export function buildSubscriptionCapacityView(
  snapshots: readonly SubscriptionSnapshot[],
  now: Date,
): SubscriptionCapacityView {
  const groups = groupSnapshots(snapshots);
  const used = new Set<string>();
  const cards: SubscriptionCard[] = [];

  for (const canonical of CANONICAL_SUBSCRIPTION_CARDS) {
    const id = subscriptionPoolId(canonical.identity);
    used.add(id);
    cards.push(cardFromGroup(canonical.identity, canonical.label, groups.get(id) ?? [], now));
  }

  const extras = [...groups.keys()]
    .filter((id) => !used.has(id))
    .sort();
  for (const id of extras) {
    const rows = groups.get(id) ?? [];
    const latest = newestSnapshot(rows);
    if (!latest) continue;
    const identity = canonicalIdentity({
      provider: latest.provider,
      accountRef: latest.accountRef,
      quotaWindow: latest.quotaWindow,
    });
    cards.push(cardFromGroup(identity, extraLabel(identity), rows, now));
  }

  return {
    cards,
    empty: cards.every((card) => card.status === "unavailable"),
  };
}
