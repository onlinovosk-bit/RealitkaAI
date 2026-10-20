import { describe, it, expect } from 'vitest';
import {
  classifyRealviaFailure,
  tallyRealviaFailures,
  REALVIA_FAILURE_KINDS,
} from './failureKinds';
import { buildMetricsMeta } from './metrics';

describe('classifyRealviaFailure', () => {
  it.each([
    ['Unknown payload structure', 'unknown_payload'],
    ['Agency resolution failed', 'agency_resolution_failed'],
    ['Webhook payload not found', 'webhook_payload_missing'],
    ['DB client unavailable', 'db_unavailable'],
  ] as const)('%s → %s', (text, kind) => {
    expect(classifyRealviaFailure(text)).toBe(kind);
  });

  it('zachytí skutočnú septembrovú hlášku z PROD vrátane názvu indexu', () => {
    // Doslovný text z realvia_processing_queue.error_message (riadok z 2026-09-11).
    const real =
      'duplicate key value violates unique constraint "idx_properties_source_id_unique"';
    expect(classifyRealviaFailure(real)).toBe('duplicate_source_id');
  });

  it('zachytí aj budúci tenantový index, nielen ten dnešný globálny', () => {
    // Repozitár ruší globálny index a zakladá idx_properties_tenant_source_unique
    // (20260617120000). Klasifikátor nesmie po tej migrácii oslepnúť.
    expect(
      classifyRealviaFailure('violates unique constraint "idx_properties_tenant_source_unique"'),
    ).toBe('duplicate_source_id');
  });

  it('prázdne aj neznáme texty padnú do other, nie do výnimky', () => {
    expect(classifyRealviaFailure(undefined)).toBe('other');
    expect(classifyRealviaFailure(null)).toBe('other');
    expect(classifyRealviaFailure('')).toBe('other');
    expect(classifyRealviaFailure('nejaká úplne nová chyba')).toBe('other');
  });

  it('každý vrátený druh je z uzavretej množiny', () => {
    const kinds = ['Unknown payload structure', 'x', '', 'duplicate key'].map(classifyRealviaFailure);
    for (const kind of kinds) expect(REALVIA_FAILURE_KINDS).toContain(kind);
  });
});

describe('tallyRealviaFailures', () => {
  it('počíta len zlyhania a zhlukuje ich po druhu', () => {
    const tally = tallyRealviaFailures([
      { success: true },
      { success: false, error: 'Unknown payload structure' },
      { success: false, error: 'Unknown payload structure' },
      { success: false, error: 'Agency resolution failed' },
      { success: true, error: 'toto sa nepočíta' },
    ]);
    expect(tally).toEqual({ unknown_payload: 2, agency_resolution_failed: 1 });
  });

  it('dávka bez zlyhania dá prázdny súčet', () => {
    expect(tallyRealviaFailures([{ success: true }, { success: true }])).toEqual({});
  });
});

describe('buildMetricsMeta', () => {
  const base = { jobs_processed: 1, jobs_succeeded: 0, jobs_failed: 1, duration_ms: 5 };

  it('zapíše príčiny do meta.failures', () => {
    expect(buildMetricsMeta({ ...base, failures: { unknown_payload: 3 } })).toEqual({
      failures: { unknown_payload: 3 },
    });
  });

  it('čistá dávka necháva meta prázdne, aby `meta <> {}` znamenalo „mám príčinu"', () => {
    expect(buildMetricsMeta({ ...base, jobs_failed: 0, failures: {} })).toEqual({});
    expect(buildMetricsMeta(base)).toEqual({});
  });

  it('REGRESIA: meta sa už nesmie zapisovať natvrdo prázdne, keď zlyhania sú', () => {
    // 1 077 riadkov metrík v PROD má meta = {} práve preto, že to bolo natvrdo.
    const meta = buildMetricsMeta({ ...base, failures: { duplicate_source_id: 1 } });
    expect(meta).not.toEqual({});
  });
});
