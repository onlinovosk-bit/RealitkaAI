/**
 * Founder Alert Adapter v0.1 — Alert Router.
 *
 *   Agent → AlertEvent → Router → Policy → {Slack, Telegram} → Founder
 *
 * Router je jediné miesto, ktoré rozhoduje o doručení. Agent o kanáloch nevie
 * a nesmie ich obchádzať — priamy `fetch` na webhook je porušenie tejto vrstvy.
 */

import { formatSlack } from "./format";
import { channelsFor, isDuplicate, markSent } from "./policy";
import { sendTelegram } from "./telegram";
import type { AlertChannel, AlertEvent, DeliveryResult, RouteResult } from "./types";

const SLACK_TIMEOUT_MS = 8000;

async function sendSlack(
  event: AlertEvent,
  env: NodeJS.ProcessEnv = process.env,
): Promise<DeliveryResult> {
  const url = env.SLACK_WEBHOOK_URL;
  if (!url) return { channel: "slack", delivered: false, reason: "not_configured" };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: formatSlack(event),
        username: "Revolis Control",
        icon_emoji: ":rotating_light:",
      }),
      signal: AbortSignal.timeout(SLACK_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { channel: "slack", delivered: false, reason: `http_${response.status}` };
    }
    return { channel: "slack", delivered: true };
  } catch (error) {
    const reason = error instanceof Error ? error.name : "unknown_error";
    return { channel: "slack", delivered: false, reason };
  }
}

const SENDERS: Record<
  AlertChannel,
  (event: AlertEvent, env: NodeJS.ProcessEnv) => Promise<DeliveryResult>
> = {
  slack: sendSlack,
  telegram: sendTelegram,
};

/**
 * Smeruje event podľa policy. Nikdy nevyhadzuje výnimku a nikdy neblokuje
 * volajúceho na chybe kanála — siréna, ktorá zhodí to, čo hlási, je horšia
 * než žiadna siréna.
 */
export async function routeAlert(
  event: AlertEvent,
  env: NodeJS.ProcessEnv = process.env,
): Promise<RouteResult> {
  const channels = channelsFor(event, env);
  if (channels.length === 0) {
    return { routed: false, suppressedBy: "policy", deliveries: [] };
  }

  const now = event.at?.getTime() ?? Date.now();
  if (isDuplicate(event, now)) {
    return { routed: false, suppressedBy: "dedup", deliveries: [] };
  }

  const deliveries = await Promise.all(
    channels.map((channel) => SENDERS[channel](event, env)),
  );

  // Tiché okno sa otvára, len ak sa aspoň jeden kanál naozaj doručil —
  // inak by zlyhané odoslanie umlčalo aj ďalšie pokusy.
  if (deliveries.some((delivery) => delivery.delivered)) {
    markSent(event, now);
  }

  return { routed: true, deliveries };
}
