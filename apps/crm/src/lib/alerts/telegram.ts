/**
 * Founder Alert Adapter v0.1 — Telegram Bot API výstup.
 *
 * Setup: docs/runbooks/telegram-alert-setup.md
 * Vyžaduje TELEGRAM_BOT_TOKEN a TELEGRAM_CHAT_ID. Bez nich adaptér ticho
 * neposiela — nenakonfigurovaný kanál nesmie zhodiť volajúci kód.
 */

import { formatTelegram } from "./format";
import type { AlertEvent, DeliveryResult } from "./types";

const API_BASE = "https://api.telegram.org";
const TIMEOUT_MS = 8000;

export function isTelegramConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
}

/**
 * Pošle event do Telegramu. Nikdy nevyhodí výnimku — zlyhanie sirény nesmie
 * zhodiť to, čo ju spustilo (rovnaký princíp ako `revolis-guard.ts:96`).
 */
export async function sendTelegram(
  event: AlertEvent,
  env: NodeJS.ProcessEnv = process.env,
): Promise<DeliveryResult> {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { channel: "telegram", delivered: false, reason: "not_configured" };
  }

  try {
    const response = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: formatTelegram(event),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      // Telegram vracia popis chyby v tele; status stačí a token sa tým nedostane do logu.
      return { channel: "telegram", delivered: false, reason: `http_${response.status}` };
    }

    return { channel: "telegram", delivered: true };
  } catch (error) {
    const reason = error instanceof Error ? error.name : "unknown_error";
    return { channel: "telegram", delivered: false, reason };
  }
}
