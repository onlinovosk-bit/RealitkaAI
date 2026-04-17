import type { SalesBrainSignals } from "./signals";

/**
 * Time-to-close — heuristický odhad dní do pravdepodobného uzavretia.
 */
export function predictTimeToClose(signals: SalesBrainSignals): number {
  let days = 30;

  if (signals.scheduledViewing) days -= 10;
  if (signals.responded) days -= 5;
  if (signals.propertyViews > 5) days -= 5;

  if (signals.daysSinceLastContact > 5) days += 10;
  if (signals.daysSinceLastContact > 14) days += 8;

  return Math.max(1, Math.round(days));
}

export function timeToCloseHint(days: number): string {
  if (days <= 7) return "Kritické okno: teraz";
  if (days <= 14) return "Krátky horizont — drž kontakt";
  return "Dlhší cyklus — plánuj follow-up";
}
