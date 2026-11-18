import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSubscriptionCapacityView,
  canonicalIdentity,
  forecastFromPercentSamples,
  groupSnapshots,
  reactionForUsedPercent,
  subscriptionPoolId,
  validateManualSnapshot,
  type SubscriptionSnapshot,
} from "../src/subscription-capacity.ts";

const NOW = new Date("2026-11-16T12:00:00.000Z");

function snap(over: Partial<SubscriptionSnapshot> & Pick<SubscriptionSnapshot, "provider" | "quotaWindow">): SubscriptionSnapshot {
  return {
    accountRef: "shared",
    source: "manual_snapshot",
    usedPercent: 40,
    remainingPercent: 60,
    resetAt: "2026-11-23T00:00:00.000Z",
    resetTimezone: "Europe/Bratislava",
    capturedAt: "2026-11-16T10:00:00.000Z",
    note: null,
    ...over,
  };
}

test("shared Grok Bot weekly pool is shown once across bot aliases", () => {
  const view = buildSubscriptionCapacityView(
    [
      snap({ provider: "grok_bot", accountRef: "bot-a", quotaWindow: "weekly", usedPercent: 10, remainingPercent: 90 }),
      snap({ provider: "xai", accountRef: "bot-b", quotaWindow: "weekly", usedPercent: 22, remainingPercent: 78, capturedAt: "2026-11-16T11:00:00.000Z" }),
    ],
    NOW,
  );
  const grok = view.cards.filter((card) => card.provider === "grok_bot" && card.quotaWindow === "weekly");
  assert.equal(grok.length, 1);
  assert.equal(grok[0]?.accountRef, "shared");
  assert.equal(grok[0]?.id, "grok_bot:shared:weekly");
  assert.equal(grok[0]?.usedPercent, 22);
});

test("weekly and session limits stay separate pools", () => {
  assert.notEqual(
    subscriptionPoolId({ provider: "claude", accountRef: "shared", quotaWindow: "weekly" }),
    subscriptionPoolId({ provider: "claude", accountRef: "shared", quotaWindow: "session" }),
  );
  const view = buildSubscriptionCapacityView(
    [
      snap({ provider: "claude", quotaWindow: "weekly", usedPercent: 80, remainingPercent: 20 }),
      snap({ provider: "anthropic", quotaWindow: "session", usedPercent: 15, remainingPercent: 85 }),
    ],
    NOW,
  );
  const weekly = view.cards.find((card) => card.id === "claude:shared:weekly");
  const session = view.cards.find((card) => card.id === "claude:shared:session");
  assert.equal(weekly?.usedPercent, 80);
  assert.equal(session?.usedPercent, 15);
  assert.equal(canonicalIdentity({ provider: "anthropic", accountRef: "shared", quotaWindow: "session" }).provider, "claude");
});

test("manual snapshot validation accepts percent pair and rejects secrets and bad timezone", () => {
  const ok = validateManualSnapshot({
    provider: "claude",
    accountRef: "shared",
    quotaWindow: "weekly",
    usedPercent: 12,
    resetAt: "2026-11-23T12:00:00.000Z",
    resetTimezone: "Europe/Bratislava",
    capturedAt: "2026-11-16T11:00:00.000Z",
    note: "dashboard screenshot",
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.value.remainingPercent, 88);
    assert.equal(ok.value.poolId, "claude:shared:weekly");
  }

  const remainingOnly = validateManualSnapshot({
    provider: "claude",
    accountRef: "shared",
    quotaWindow: "session",
    remainingPercent: 40,
    resetAt: "2026-11-16T16:00:00.000Z",
    resetTimezone: "UTC",
    capturedAt: "2026-11-16T11:00:00.000Z",
  });
  assert.equal(remainingOnly.ok, true);
  if (remainingOnly.ok) assert.equal(remainingOnly.value.usedPercent, 60);

  const badSum = validateManualSnapshot({
    provider: "claude",
    accountRef: "shared",
    quotaWindow: "weekly",
    usedPercent: 10,
    remainingPercent: 10,
    resetAt: "2026-11-23T12:00:00.000Z",
    resetTimezone: "UTC",
    capturedAt: "2026-11-16T11:00:00.000Z",
  });
  assert.equal(badSum.ok, false);

  const secret = validateManualSnapshot({
    provider: "claude",
    accountRef: "shared",
    quotaWindow: "weekly",
    usedPercent: 1,
    resetAt: "2026-11-23T12:00:00.000Z",
    resetTimezone: "UTC",
    capturedAt: "2026-11-16T11:00:00.000Z",
    note: "sk-ant-secret-value",
  });
  assert.equal(secret.ok, false);

  const tz = validateManualSnapshot({
    provider: "claude",
    accountRef: "shared",
    quotaWindow: "weekly",
    usedPercent: 1,
    resetAt: "2026-11-23T12:00:00.000Z",
    resetTimezone: "Not/AZone",
    capturedAt: "2026-11-16T11:00:00.000Z",
  });
  assert.equal(tz.ok, false);

  const over = validateManualSnapshot({
    provider: "claude",
    accountRef: "shared",
    quotaWindow: "weekly",
    usedPercent: 101,
    resetAt: "2026-11-23T12:00:00.000Z",
    resetTimezone: "UTC",
    capturedAt: "2026-11-16T11:00:00.000Z",
  });
  assert.equal(over.ok, false);
});

test("updating an existing pool keeps identity and groups time samples", () => {
  const first = snap({
    provider: "claude",
    quotaWindow: "weekly",
    usedPercent: 10,
    remainingPercent: 90,
    capturedAt: "2026-11-16T08:00:00.000Z",
  });
  const second = snap({
    provider: "claude",
    quotaWindow: "weekly",
    usedPercent: 30,
    remainingPercent: 70,
    capturedAt: "2026-11-16T11:00:00.000Z",
  });
  const groups = groupSnapshots([first, second]);
  const id = "claude:shared:weekly";
  assert.equal(groups.get(id)?.length, 2);
  const view = buildSubscriptionCapacityView([first, second], NOW);
  const card = view.cards.find((item) => item.id === id);
  assert.equal(card?.usedPercent, 30);
  assert.equal(card?.id, id);
});

test("stale snapshot and missing source stay honest", () => {
  const stale = buildSubscriptionCapacityView(
    [
      snap({
        provider: "claude",
        quotaWindow: "weekly",
        usedPercent: 55,
        remainingPercent: 45,
        capturedAt: "2026-11-10T00:00:00.000Z",
      }),
    ],
    NOW,
  );
  assert.equal(stale.cards.find((card) => card.id === "claude:shared:weekly")?.statusCode, "STALE");

  const empty = buildSubscriptionCapacityView([], NOW);
  const grok = empty.cards.find((card) => card.id === "grok_bot:shared:weekly");
  assert.equal(grok?.statusCode, "UNAVAILABLE");
  assert.equal(grok?.usedDisplay, "UNAVAILABLE");
  assert.equal(grok?.forecastLabel, "INSUFFICIENT DATA");
  assert.equal(empty.cards.some((card) => typeof card.usedPercent === "number" && card.status === "unavailable"), false);
});

test("forecast from two samples in one reset period", () => {
  const now = Date.parse("2026-11-16T12:00:00.000Z");
  const forecast = forecastFromPercentSamples(
    [
      { capturedAt: "2026-11-16T08:00:00.000Z", usedPercent: 20, resetAt: "2026-11-23T00:00:00.000Z" },
      { capturedAt: "2026-11-16T10:00:00.000Z", usedPercent: 30, resetAt: "2026-11-23T00:00:00.000Z" },
    ],
    now,
  );
  assert.equal(forecast.status, "available");
  if (forecast.status === "available") {
    assert.equal(forecast.burnPercentPerHour, 5);
    assert.equal(forecast.remainingPercent, 70);
    assert.equal(forecast.sampleCount, 2);
  }
});

test("one sample is insufficient data", () => {
  const forecast = forecastFromPercentSamples(
    [{ capturedAt: "2026-11-16T08:00:00.000Z", usedPercent: 20, resetAt: "2026-11-23T00:00:00.000Z" }],
    Date.parse("2026-11-16T12:00:00.000Z"),
  );
  assert.equal(forecast.status, "insufficient_data");
  if (forecast.status === "insufficient_data") {
    assert.equal(forecast.reason, "insufficient_samples");
    assert.equal(forecast.sampleCount, 1);
  }
});

test("samples from different reset periods are not mixed", () => {
  const forecast = forecastFromPercentSamples(
    [
      { capturedAt: "2026-11-09T08:00:00.000Z", usedPercent: 90, resetAt: "2026-11-10T00:00:00.000Z" },
      { capturedAt: "2026-11-16T08:00:00.000Z", usedPercent: 10, resetAt: "2026-11-23T00:00:00.000Z" },
    ],
    Date.parse("2026-11-16T12:00:00.000Z"),
  );
  assert.equal(forecast.status, "insufficient_data");
  if (forecast.status === "insufficient_data") assert.equal(forecast.reason, "mixed_reset_period");
});

test("thresholds 50/70/85/95 map to WARN REDUCE DEFER CRITICAL", () => {
  assert.equal(reactionForUsedPercent(49.9), null);
  assert.equal(reactionForUsedPercent(50), "WARN");
  assert.equal(reactionForUsedPercent(70), "REDUCE");
  assert.equal(reactionForUsedPercent(85), "DEFER_NON_URGENT");
  assert.equal(reactionForUsedPercent(95), "CRITICAL");
  const view = buildSubscriptionCapacityView(
    [
      snap({ provider: "claude", quotaWindow: "weekly", usedPercent: 95, remainingPercent: 5 }),
    ],
    NOW,
  );
  assert.equal(view.cards.find((card) => card.id === "claude:shared:weekly")?.reaction, "CRITICAL");
  assert.match(
    view.cards.find((card) => card.id === "claude:shared:weekly")?.recommendation ?? "",
    /Revolis\.AI/,
  );
});
