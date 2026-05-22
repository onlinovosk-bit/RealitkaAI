export type RevenueTelemetryEvent =
  | "upgrade_cta"
  | "forecast_open"
  | "market_signal"
  | "demo_start"
  | "demo_finish";

type RevenueTelemetryPayload = Record<string, unknown>;

export async function trackRevenueTelemetry(
  event: RevenueTelemetryEvent,
  payload: RevenueTelemetryPayload = {},
): Promise<void> {
  const body = {
    event,
    payload: {
      ...payload,
      ts: new Date().toISOString(),
    },
  };

  try {
    await fetch("/api/analytics/revenue-telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    // Non-blocking
  }
}
