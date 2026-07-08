import { describe, expect, it } from "vitest";
import {
  evaluateHeartbeatSignals,
  type HeartbeatMetrics,
} from "@/lib/infra/platform-heartbeat";

const baseMetrics = (): HeartbeatMetrics => ({
  agencyScope: null,
  untriagedLeads24h: 0,
  untriagedLeads7d: 0,
  maxAiTriageAt: "2026-07-08T10:00:00.000Z",
  realviaLastWebhookAt: "2026-07-08T09:00:00.000Z",
  realviaWebhookTotal: 10,
  inboundMailboxCount: 1,
  sellerRescueLastNotifAt: "2026-07-08T06:00:00.000Z",
  sellerRescueLastTaskAt: "2026-07-08T06:00:00.000Z",
});

describe("evaluateHeartbeatSignals", () => {
  const now = Date.parse("2026-07-08T12:00:00.000Z");

  it("returns ok when all metrics healthy", () => {
    const signals = evaluateHeartbeatSignals(baseMetrics(), now);
    expect(signals).toHaveLength(0);
  });

  it("flags critical when untriaged leads exist in 24h window", () => {
    const signals = evaluateHeartbeatSignals(
      { ...baseMetrics(), untriagedLeads24h: 2 },
      now,
    );
    expect(signals.some((s) => s.id === "triage_untriaged_24h" && s.severity === "critical")).toBe(
      true,
    );
  });

  it("flags warning for 7d triage backlog without 24h untriaged", () => {
    const signals = evaluateHeartbeatSignals(
      { ...baseMetrics(), untriagedLeads7d: 3 },
      now,
    );
    expect(signals.some((s) => s.id === "triage_backlog_7d")).toBe(true);
    expect(signals.some((s) => s.id === "triage_untriaged_24h")).toBe(false);
  });

  it("flags stale realvia when mailbox active and webhooks went quiet", () => {
    const signals = evaluateHeartbeatSignals(
      {
        ...baseMetrics(),
        realviaLastWebhookAt: "2026-06-01T09:00:00.000Z",
        realviaWebhookTotal: 5,
        inboundMailboxCount: 1,
      },
      now,
    );
    expect(signals.some((s) => s.id === "realvia_webhook_stale_7d")).toBe(true);
  });

  it("skips realvia stale when no prior webhook history", () => {
    const signals = evaluateHeartbeatSignals(
      {
        ...baseMetrics(),
        realviaLastWebhookAt: null,
        realviaWebhookTotal: 0,
        inboundMailboxCount: 1,
      },
      now,
    );
    expect(signals.some((s) => s.id === "realvia_webhook_stale_7d")).toBe(false);
  });

  it("flags seller-rescue silence when triage healthy", () => {
    const signals = evaluateHeartbeatSignals(
      {
        ...baseMetrics(),
        sellerRescueLastNotifAt: "2026-06-01T06:00:00.000Z",
        sellerRescueLastTaskAt: "2026-06-01T06:00:00.000Z",
      },
      now,
    );
    expect(signals.some((s) => s.id === "seller_rescue_silent_48h")).toBe(true);
  });
});
