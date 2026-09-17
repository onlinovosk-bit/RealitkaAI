/**
 * Founder Alert Adapter v0.1 — skladanie textu správy.
 *
 * Text sa SKLADÁ z whitelistovaných polí eventu, nikdy sa nepreberá hotový
 * reťazec od volajúceho. Je to zámer: sanitizácia cudzieho textu je hra, ktorú
 * obranca prehráva — skladanie z polí je hranica, ktorú nemožno obísť
 * omylom (CLAUDE.md §2 stealth, §4 GDPR).
 */

import { SEVERITY_ICON, type AlertEvent } from "./types";

/** Telegram odmieta správy nad 4096 znakov. */
const TELEGRAM_MAX = 4096;

/** Jedna hodnota poľa — identifikátor, nie odsek textu. */
const MAX_FIELD_LEN = 200;

function oneLine(value: string, max = MAX_FIELD_LEN): string {
  const flat = value.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** Escape pre Telegram `parse_mode: "HTML"` — jediné tri znaky, ktoré vyžaduje. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** Plain-text varianta pre Slack. */
export function formatSlack(event: AlertEvent): string {
  const icon = SEVERITY_ICON[event.severity];
  const head = `${icon} ${event.severity}${event.resolved ? " · VYRIEŠENÉ" : ""} — ${oneLine(event.title)}`;

  const lines = [head, `typ: ${oneLine(event.type)} · agent: ${oneLine(event.agent)}`];

  for (const [key, value] of Object.entries(event.fields ?? {})) {
    lines.push(`${oneLine(key, 40)}: ${oneLine(value)}`);
  }
  if (event.evidenceRef) lines.push(`dôkaz: ${oneLine(event.evidenceRef, 300)}`);
  if (event.actionRequired && !event.resolved) lines.push("→ vyžaduje zásah foundera");

  return truncate(lines.join("\n"), TELEGRAM_MAX);
}

/** HTML varianta pre Telegram (`parse_mode: "HTML"`). */
export function formatTelegram(event: AlertEvent): string {
  const icon = SEVERITY_ICON[event.severity];
  const suffix = event.resolved ? " · VYRIEŠENÉ" : "";
  const head = `${icon} <b>${escapeHtml(event.severity)}${escapeHtml(suffix)}</b> — ${escapeHtml(oneLine(event.title))}`;

  const lines = [
    head,
    `<i>${escapeHtml(oneLine(event.type))}</i> · ${escapeHtml(oneLine(event.agent))}`,
  ];

  for (const [key, value] of Object.entries(event.fields ?? {})) {
    lines.push(`${escapeHtml(oneLine(key, 40))}: <code>${escapeHtml(oneLine(value))}</code>`);
  }
  if (event.evidenceRef) {
    lines.push(`dôkaz: <code>${escapeHtml(oneLine(event.evidenceRef, 300))}</code>`);
  }
  if (event.actionRequired && !event.resolved) {
    lines.push("<b>→ vyžaduje zásah foundera</b>");
  }

  return truncate(lines.join("\n"), TELEGRAM_MAX);
}
