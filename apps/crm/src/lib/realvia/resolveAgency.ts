// Resolve Revolis agency UUID from Realvia auth headers (stored on agencies row).

import { createServiceRoleClient } from '@/lib/supabase/admin';
import { logWarn, logInfo } from '@/lib/logger';

/**
 * Headers used by Realvia push API; pair must match an agencies row when both set.
 * When only X-Revolis-Secret is used (dev / alternate mode), callers should use defaultAgencyId fallback.
 */
export async function resolveAgencyIdFromRealviaHeaders(
  identifikator: string,
  identifikator2: string,
): Promise<string | null> {
  const id1 = identifikator.trim();
  const id2 = identifikator2.trim();

  if (!id1 || !id2) {
    return defaultAgencyIdFromEnv();
  }

  const sb = createServiceRoleClient();
  if (!sb) {
    logWarn('[realvia-agency] Supabase service role unavailable — cannot resolve agency');
    return defaultAgencyIdFromEnv();
  }

  const { data, error } = await sb
    .from('agencies')
    .select('id')
    .eq('realvia_identifikator', id1)
    .eq('realvia_identifikator2', id2)
    .maybeSingle();

  if (error) {
    logWarn('[realvia-agency] Agency lookup failed', { message: error.message });
    return defaultAgencyIdFromEnv();
  }

  if (data?.id) {
    logInfo('[realvia-agency] Resolved agency from Realvia headers', { agencyId: data.id });
    return data.id;
  }

  const fallback = defaultAgencyIdFromEnv();
  if (fallback) {
    logWarn('[realvia-agency] No agencies row for identifikator pair — using REALVIA_DEFAULT_AGENCY_ID');
  } else {
    logWarn('[realvia-agency] No agencies row for identifikator pair and no REALVIA_DEFAULT_AGENCY_ID');
  }

  return fallback;
}

function defaultAgencyIdFromEnv(): string | null {
  const raw = process.env.REALVIA_DEFAULT_AGENCY_ID?.trim();
  return raw && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)
    ? raw
    : null;
}
