import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { assertRealviaAdminApi } from '@/lib/realvia/adminAuth';
import { logError } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type HealthPayload = Record<string, unknown>;

function summarizeInfrastructureHealth(payload: HealthPayload): {
  overall_ok: boolean;
  checks_failed: string[];
} {
  const skip = new Set(['checked_at', 'expected_baseline']);

  const failed: string[] = [];
  for (const [k, v] of Object.entries(payload)) {
    if (skip.has(k) || typeof v !== 'boolean') continue;
    if (!v) failed.push(k);
  }

  return { overall_ok: failed.length === 0, checks_failed: failed };
}

/**
 * Validates that production DB includes Realvia objects (migration baseline + follow-ups).
 * Uses service-role RPC — does not widen RLS on Realvia tables to anon JWT.
 */
export async function GET() {
  const gate = await assertRealviaAdminApi();
  if (gate instanceof NextResponse) return gate;

  const sb = createServiceRoleClient();
  if (!sb) {
    return NextResponse.json({ error: 'Service role unavailable' }, { status: 503 });
  }

  try {
    const { data: raw, error } = await sb.rpc('realvia_schema_health');

    if (error) {
      logError('[realvia-schema-status]', error.message);
      return NextResponse.json(
        {
          error: error.message,
          hint: 'Apply migrations through your Supabase flow; ensure 20260512174500_realvia_schema_health_rpc.sql ran',
        },
        { status: 502 },
      );
    }

    const payload = (raw ?? {}) as HealthPayload;
    const summary = summarizeInfrastructureHealth(payload);

    return NextResponse.json({
      summary,
      details: payload,
      operator_note:
        'Reality Smolko: approve only when summary.overall_ok is true OR match manual script scripts/verify-realvia-infrastructure.sql in SQL editor.',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
