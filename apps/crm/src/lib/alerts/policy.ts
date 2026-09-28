/**
 * Founder Alert Adapter v0.1 — policy a dedup.
 *
 * Policy rozhoduje, ČI a KAM event ide. Dedup rozhoduje, či sa ten istý
 * incident nezopakuje v tichom intervale.
 */

import { SEVERITIES, type AlertChannel, type AlertEvent, type Severity } from "./types";

/**
 * Severity → kanály. Zodpovedá founderovej tabuľke:
 *   🟢 INFO voliteľne · 🔵 EVENT nie vždy · 🟠 WARNING áno
 *   🔴 CRITICAL okamžite · ⚫ GOVERNANCE okamžite
 *
 * INFO a EVENT sú štandardne tiché — inak sa zo sirény stane šum.
 * Zapína ich `ALERTS_MIN_SEVERITY`.
 */
const DEFAULT_CHANNELS: Record<Severity, AlertChannel[]> = {
  INFO: ["slack"],
  EVENT: ["slack"],
  WARNING: ["slack", "telegram"],
  CRITICAL: ["slack", "telegram"],
  GOVERNANCE: ["slack", "telegram"],
};

/** Tichý interval na incident. CRITICAL a GOVERNANCE majú kratší. */
const COOLDOWN_MS: Record<Severity, number> = {
  INFO: 60 * 60 * 1000,
  EVENT: 60 * 60 * 1000,
  WARNING: 30 * 60 * 1000,
  CRITICAL: 10 * 60 * 1000,
  GOVERNANCE: 10 * 60 * 1000,
};

function severityRank(severity: Severity): number {
  return SEVERITIES.indexOf(severity);
}

/**
 * Minimálna severity, ktorá sa vôbec doručuje. Default WARNING — INFO a EVENT
 * ostávajú ticho, kým ich founder nezapne cez `ALERTS_MIN_SEVERITY=INFO`.
 */
export function minSeverity(env: NodeJS.ProcessEnv = process.env): Severity {
  const raw = (env.ALERTS_MIN_SEVERITY ?? "").trim().toUpperCase();
  return (SEVERITIES as readonly string[]).includes(raw) ? (raw as Severity) : "WARNING";
}

/** Kanály, do ktorých má event ísť. Prázdne pole = potlačené policy. */
export function channelsFor(
  event: AlertEvent,
  env: NodeJS.ProcessEnv = process.env,
): AlertChannel[] {
  if (severityRank(event.severity) < severityRank(minSeverity(env))) return [];
  return DEFAULT_CHANNELS[event.severity] ?? [];
}

/**
 * Dedup okno v pamäti procesu.
 *
 * OBMEDZENIE (vedomé, v0.1): v serverless behu je pamäť per-instance, takže
 * dedup drží iba v rámci jednej inštancie. Spoľahlivý dedup naprieč inštanciami
 * by potreboval zdieľané úložisko — to je nová DB tabuľka, teda migrácia,
 * a tá je mimo rozsahu v0.1. Zapísané ako otvorený bod v
 * docs/architecture/founder-alert-adapter-v0.1.md.
 */
const lastSent = new Map<string, number>();

/** Iba pre testy — vyčistí dedup okno. */
export function resetDedup(): void {
  lastSent.clear();
}

/**
 * true = event je v tichom intervale a nemá sa poslať.
 * Vyriešené incidenty (`resolved`) prejdú vždy — founder sa musí dozvedieť,
 * že je po incidente, aj keď hlásenie o jeho vzniku bolo pred chvíľou.
 */
export function isDuplicate(event: AlertEvent, now = Date.now()): boolean {
  if (event.resolved) return false;
  const previous = lastSent.get(event.dedupKey);
  if (previous === undefined) return false;
  return now - previous < COOLDOWN_MS[event.severity];
}

export function markSent(event: AlertEvent, now = Date.now()): void {
  if (event.resolved) {
    lastSent.delete(event.dedupKey);
    return;
  }
  lastSent.set(event.dedupKey, now);
}
