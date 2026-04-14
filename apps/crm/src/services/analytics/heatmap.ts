/**
 * Activity Heatmap – distribúcia aktivít podľa hodín dňa.
 * Pure funkcia, žiadne závislosti.
 */

export interface HeatmapResult {
  /** Pole 24 hodnôt – počet udalostí pre každú hodinu (0–23) */
  hourly: number[];
  /** Hodina s najvyššou aktivitou */
  peakHour: number;
  /** Celkový počet udalostí */
  total: number;
}

/**
 * Vypočíta hodinový heatmap aktivít.
 * @param events - pole objektov s `occurredAt` (Date alebo string ISO)
 */
export function buildActivityHeatmap(
  events: { occurredAt: Date | string }[]
): HeatmapResult {
  const hourly = Array.from({ length: 24 }, () => 0);

  for (const ev of events) {
    const hour = new Date(ev.occurredAt).getHours();
    hourly[hour]++;
  }

  const peakHour = hourly.indexOf(Math.max(...hourly));
  const total = events.length;

  return { hourly, peakHour, total };
}

/**
 * Vráti slovný popis peak hodiny pre UI.
 * Napr. peakHour=10 → "10:00 – 11:00"
 */
export function describePeakHour(peakHour: number): string {
  const from = String(peakHour).padStart(2, "0");
  const to = String((peakHour + 1) % 24).padStart(2, "0");
  return `${from}:00 – ${to}:00`;
}
