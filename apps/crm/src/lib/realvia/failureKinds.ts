/**
 * Klasifikácia zlyhaní Realvia fronty na stabilné druhy.
 *
 * Prečo: k 2026-10-18 bolo v PROD 1 287 zlyhaní a príčina ani jedného z nich
 * nebola nikde uložená — `realvia_metrics.meta` bolo prázdne vo všetkých
 * 1 077 riadkoch (worker tam písal natvrdo `{}`) a `error_message` vo fronte
 * existovalo pre 5 z 253 riadkov. Analýza preto končila pri počtoch.
 * Viď `docs/reports/2026-10-18-vlna-a-realvia-zlyhania.md`.
 *
 * Zapisujeme DRUH, nie text chyby: druh je uzavretá množina, dá sa agregovať
 * v SQL a nemôže do metrík prepašovať obsah payloadu (GDPR).
 */
export const REALVIA_FAILURE_KINDS = [
  'probe',
  'agency_resolution_failed',
  'webhook_payload_missing',
  'unknown_payload',
  'duplicate_source_id',
  'db_unavailable',
  'other',
] as const;

export type RealviaFailureKind = (typeof REALVIA_FAILURE_KINDS)[number];

/** Druh → počet v jednej dávke. Len neprázdne druhy sa zapisujú. */
export type RealviaFailureTally = Partial<Record<RealviaFailureKind, number>>;

/**
 * Text chyby → druh. Porovnáva sa na malé písmená a na podreťazce, pretože
 * hlášky z Postgresu aj z fetchu nesú chvosty (názov indexu, kód, detail),
 * ktoré sa menia.
 */
export function classifyRealviaFailure(error: string | undefined | null): RealviaFailureKind {
  const text = (error ?? '').toLowerCase();
  if (text.length === 0) return 'other';

  // Onboardingový {test:true} payload — terminálny, nie je to porucha.
  if (text.includes('probe') || text.includes('onboarding')) return 'probe';

  if (text.includes('agency resolution')) return 'agency_resolution_failed';
  if (text.includes('webhook payload not found')) return 'webhook_payload_missing';
  if (text.includes('unknown payload')) return 'unknown_payload';

  // Jediná septembrová chyba, ktorú máme čiernobielu: globálny unique index na
  // properties.source_id (v PROD stále platí, hoci repozitár ho ruší v
  // 20260617120000 a chce tenantový). Zachytáva aj budúci tenantový názov.
  if (text.includes('duplicate key') || text.includes('source_id_unique') || text.includes('tenant_source_unique')) {
    return 'duplicate_source_id';
  }

  if (text.includes('db client unavailable') || text.includes('client unavailable')) return 'db_unavailable';

  return 'other';
}

/** Spočíta druhy zlyhaní v dávke. Úspechy sa ignorujú. */
export function tallyRealviaFailures(
  results: ReadonlyArray<{ success: boolean; error?: string }>,
): RealviaFailureTally {
  const tally: RealviaFailureTally = {};
  for (const result of results) {
    if (result.success) continue;
    const kind = classifyRealviaFailure(result.error);
    tally[kind] = (tally[kind] ?? 0) + 1;
  }
  return tally;
}
