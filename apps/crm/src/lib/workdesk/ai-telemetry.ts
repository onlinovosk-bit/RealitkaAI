export type WorkdeskTelemetryEvent =
  | "ai_recommendation_click"
  | "call_now_click"
  | "forecast_alert_open"
  | "market_signal_open"
  | "priority_strip_view"
  | "next_best_action_click"
  | "dashboard_module_open"
  | "hot_leads_click"
  | "lead_priority_open";

type TelemetryDetail = Record<string, string | number | boolean | null | undefined>;

/** Client-side AI interaction telemetry — fire-and-forget via monitoring bus. */
export function trackWorkdeskEvent(event: WorkdeskTelemetryEvent, detail?: TelemetryDetail): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("monitoring", {
      detail: {
        action: event,
        surface: "workdesk",
        ts: Date.now(),
        ...detail,
      },
    }),
  );
}
