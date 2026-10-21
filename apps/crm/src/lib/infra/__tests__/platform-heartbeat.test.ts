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
  realviaQueuePending: 0,
  realviaQueueFailed: 0,
  realviaLastWorkerRunAt: "2026-07-08T11:55:00.000Z",
  realviaPropertiesUpdated24h: 12,
  inboundMailboxCount: 1,
  sellerRescueLastNotifAt: "2026-07-08T06:00:00.000Z",
  sellerRescueLastTaskAt: "2026-07-08T06:00:00.000Z",
  moatCaptureTriage24h: 0,
  moatCaptureNba24h: 0,
  moatCaptureAiEmail24h: 0,
  moatDealOutcomes24h: 0,
  guardianLastRunAt: "2026-07-08T11:00:00.000Z",
  guardianOpenFindings: 0,
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

  it("flags critical realvia when webhooks quiet 7d+ (no mailbox gate)", () => {
    const signals = evaluateHeartbeatSignals(
      {
        ...baseMetrics(),
        realviaLastWebhookAt: "2026-06-01T09:00:00.000Z",
        realviaWebhookTotal: 5,
        inboundMailboxCount: 0,
      },
      now,
    );
    const hit = signals.find((s) => s.id === "realvia_webhook_stale_7d");
    expect(hit?.severity).toBe("critical");
  });

  it("flags warning realvia when quiet 48h but under 7d", () => {
    const signals = evaluateHeartbeatSignals(
      {
        ...baseMetrics(),
        realviaLastWebhookAt: "2026-07-05T12:00:00.000Z", // 3d before now
        realviaWebhookTotal: 5,
        inboundMailboxCount: 0,
      },
      now,
    );
    expect(signals.some((s) => s.id === "realvia_webhook_stale_48h" && s.severity === "warning")).toBe(
      true,
    );
    expect(signals.some((s) => s.id === "realvia_webhook_stale_7d")).toBe(false);
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
    expect(signals.some((s) => s.id.startsWith("realvia_webhook_stale"))).toBe(false);
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

  // ── Realvia worker a front rady (REALVIA-SEC-01) ──────────────────────────
  // Doteraz heartbeat merel iba PRÍTOK webhookov. Tieto testy držia, že vidí aj
  // ich SPRACOVANIE: prítok môže byť zelený a properties sa pritom neaktualizujú.

  it("failed job je critical — vyčerpal opakovania a sám sa nepohne", () => {
    const signals = evaluateHeartbeatSignals(
      { ...baseMetrics(), realviaQueueFailed: 1 },
      now,
    );
    const signal = signals.find((s) => s.id === "realvia_queue_failed_jobs");
    expect(signal?.severity).toBe("critical");
    expect(signal?.evidence.realviaQueueFailed).toBe(1);
  });

  it("worker mimo + front čaká = critical", () => {
    const signals = evaluateHeartbeatSignals(
      {
        ...baseMetrics(),
        realviaQueuePending: 7,
        realviaLastWorkerRunAt: "2026-07-08T08:00:00.000Z", // 4 h dozadu
      },
      now,
    );
    const signal = signals.find((s) => s.id === "realvia_worker_stale_2h");
    expect(signal?.severity).toBe("critical");
    expect(signal?.evidence.realviaQueuePending).toBe(7);
  });

  it("worker nikdy nebežal a front čaká = tiež critical", () => {
    // `null` nesmie prejsť ako „v poriadku" — to je presne tá zámena
    // „nevieme" vs. „netreba", ktorá tento projekt už raz stála mesiace.
    const signals = evaluateHeartbeatSignals(
      { ...baseMetrics(), realviaQueuePending: 3, realviaLastWorkerRunAt: null },
      now,
    );
    expect(signals.some((s) => s.id === "realvia_worker_stale_2h")).toBe(true);
  });

  it("prázdny front nehlási mŕtveho workera", () => {
    // Bez čakajúcej práce je ticho správny stav, nie porucha. Bez tejto brány
    // by heartbeat pípal každú noc, keď Realvia nepošle nič.
    const signals = evaluateHeartbeatSignals(
      { ...baseMetrics(), realviaQueuePending: 0, realviaLastWorkerRunAt: null },
      now,
    );
    expect(signals.some((s) => s.id === "realvia_worker_stale_2h")).toBe(false);
  });

  it("tenant bez Realvie nedostane ani jeden realvia signál", () => {
    const signals = evaluateHeartbeatSignals(
      {
        ...baseMetrics(),
        realviaWebhookTotal: 0,
        realviaLastWebhookAt: null,
        realviaQueuePending: 5,
        realviaQueueFailed: 2,
        realviaLastWorkerRunAt: null,
      },
      now,
    );
    expect(signals.some((s) => s.id.startsWith("realvia_"))).toBe(false);
  });

  it("zdravý worker a čistý front nehlásia nič", () => {
    const signals = evaluateHeartbeatSignals(
      { ...baseMetrics(), realviaQueuePending: 2, realviaQueueFailed: 0 },
      now,
    );
    expect(signals.some((s) => s.id.startsWith("realvia_"))).toBe(false);
  });
});
