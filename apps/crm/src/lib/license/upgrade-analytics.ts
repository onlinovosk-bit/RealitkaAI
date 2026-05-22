import type { UpgradeIntentEvent } from "./types";

type UpgradeIntentPayload = Record<string, unknown>;

export async function trackUpgradeIntent(
  event: UpgradeIntentEvent,
  payload: UpgradeIntentPayload = {},
): Promise<void> {
  const body = {
    event,
    payload: {
      ...payload,
      ts: new Date().toISOString(),
    },
  };

  try {
    await fetch("/api/analytics/upgrade-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    // Non-blocking — analytics must never break UX
  }
}
