/**
 * Revolis.AI – Buyer Readiness Index (BRI) Engine
 *
 * Pure funkcia – žiadne DB volania, žiadne side effects.
 * Vstup: lead data + zoznam aktivít
 * Výstup: BuyerReadinessDto
 *
 * Váhový model:
 *   intentScore  0–40  záujem (aktivity, typ, frekvencia)
 *   fitScore     0–30  zhoda profilu (stav, score z DB, typ nehnuteľnosti)
 *   timingScore  0–30  časovanie (posledný kontakt, urgencia)
 *   total        0–100
 */

import type { BuyerReadinessDto, BriSegment } from "@/services/playbook/types";

// ─── Vstupné typy ────────────────────────────────────────────

export interface BriActivity {
  id: string;
  type: string;        // "Email" | "Telefonát" | "Obhliadka" | "Poznámka" | "Lead" | ...
  source?: string;
  severity?: string;
  createdAt: string;
}

export interface BriLeadContext {
  status: string;      // "Nový" | "Teplý" | "Horúci" | "Obhliadka" | "Ponuka"
  score: number;       // DB skóre 0–100
  budget?: string;
  propertyType?: string;
  rooms?: string;
  lastContactAt?: string;
  createdAt?: string;
}

export interface BriTimingContext {
  firstSeenAt?: string;
  lastActiveAt?: string;
}

// ─── Váhy ─────────────────────────────────────────────────────

const STATUS_FIT: Record<string, number> = {
  "Ponuka":    30,
  "Obhliadka": 22,
  "Horúci":    18,
  "Teplý":     10,
  "Nový":       5,
};

const ACTIVITY_INTENT: Record<string, number> = {
  "Obhliadka": 10,
  "Telefonát":  6,
  "Email":      3,
  "Poznámka":   2,
  "Lead":       1,
};

// ─── Core ────────────────────────────────────────────────────

export function computeBuyerReadiness(
  activities: BriActivity[],
  leadContext: BriLeadContext,
  timingContext: BriTimingContext = {}
): Omit<BuyerReadinessDto, "buyerId" | "buyerName"> {
  // ── Intent score (0–40) ──────────────────────────────────
  // Počítame hodnotu aktivít, cap na 40
  let rawIntent = 0;
  for (const act of activities) {
    rawIntent += ACTIVITY_INTENT[act.type] ?? 1;
  }
  // Bonus za viaceré obhliadky (engagement signal)
  const showingCount = activities.filter((a) => a.type === "Obhliadka").length;
  if (showingCount >= 2) rawIntent += 8;
  if (showingCount >= 3) rawIntent += 5;

  const intentScore = Math.min(rawIntent, 40);

  // ── Fit score (0–30) ─────────────────────────────────────
  // Stav pipeline + DB skóre
  const statusPoints = STATUS_FIT[leadContext.status] ?? 5;
  // DB skóre normalizujeme na 0–12 bodov
  const dbScorePoints = Math.round((Math.min(leadContext.score, 100) / 100) * 12);
  const fitScore = Math.min(statusPoints + dbScorePoints, 30);

  // ── Timing score (0–30) ──────────────────────────────────
  const daysSince = getDaysSince(
    leadContext.lastContactAt ?? timingContext.lastActiveAt
  );
  let timingScore: number;
  if (daysSince <= 1)       timingScore = 30;
  else if (daysSince <= 3)  timingScore = 22;
  else if (daysSince <= 7)  timingScore = 14;
  else if (daysSince <= 14) timingScore = 7;
  else                      timingScore = 2;

  // Penalizácia za veľmi starý lead bez aktivity
  const ageDays = getDaysSince(timingContext.firstSeenAt ?? leadContext.createdAt);
  if (ageDays > 60 && activities.length === 0) timingScore = Math.max(timingScore - 5, 0);

  // ── Total ────────────────────────────────────────────────
  const total = Math.min(intentScore + fitScore + timingScore, 100);

  // ── Segment ──────────────────────────────────────────────
  const segment = resolveSegment(total, leadContext.status);

  // ── Reasons ──────────────────────────────────────────────
  const reasons = buildReasons(
    intentScore,
    fitScore,
    timingScore,
    leadContext,
    showingCount,
    daysSince
  );

  return { totalScore: total, intentScore, fitScore, timingScore, segment, reasons };
}

// ─── Helpers ─────────────────────────────────────────────────

function getDaysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function resolveSegment(total: number, status: string): BriSegment {
  if (status === "Ponuka" || total >= 85)  return "HOT_NOW";
  if (total >= 70)                          return "HIGH_PRIORITY";
  if (total >= 50)                          return "NURTURE";
  return "LOW_INTENT";
}

function buildReasons(
  intent: number,
  fit: number,
  timing: number,
  ctx: BriLeadContext,
  showings: number,
  daysSince: number
): string[] {
  const reasons: string[] = [];

  if (ctx.status === "Ponuka")
    reasons.push("Je vo fáze Ponuka – blízko uzavretia");
  if (ctx.status === "Obhliadka")
    reasons.push("Naplánovaná obhliadka – vysoká angažovanosť");
  if (ctx.status === "Horúci")
    reasons.push("Označený ako Horúci – najvyššia priorita");

  if (showings >= 2)
    reasons.push(`${showings} obhliadky – silný záujem`);

  if (intent >= 30)
    reasons.push("Vysoká aktivita – časté interakcie");
  else if (intent >= 15)
    reasons.push("Stredná aktivita – pravidelný kontakt");

  if (daysSince === 0 || daysSince === 1)
    reasons.push("Kontaktovaný dnes – optimálne načasovanie");
  else if (daysSince >= 5)
    reasons.push(`${daysSince} dní bez kontaktu – riziko ochladnutia`);

  if (ctx.score >= 85)
    reasons.push(`AI skóre ${ctx.score}/100 – top segment`);

  if (reasons.length === 0)
    reasons.push(`BRI ${intent + fit + timing}/100 – odporúčaný follow-up`);

  return reasons;
}
