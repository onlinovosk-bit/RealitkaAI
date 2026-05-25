// Resolve Revolis agency UUID from Realvia auth headers (stored on agencies row).

import type { SupabaseClient } from '@supabase/supabase-js';

import { createServiceRoleClient } from '@/lib/supabase/admin';
import { logWarn, logInfo } from '@/lib/logger';

type RpcResolveResult =
  | { kind: 'resolved'; agencyId: string }
  | { kind: 'no_row' }
  | { kind: 'rpc_unavailable' };

/** Niektoré prostrední Realvie posielajú identifikátory s obklopujúcimi [ ] — zarovnaj na DB pár. */
export function normalizeRealviaIdentifikatorHeaderValue(raw: string): string {
  return raw.replace(/^\[|\]$/g, '').trim();
}

/**
 * Headers used by Realvia push API; pair must match an agencies row when both set.
 * When only X-Revolis-Secret is used (dev / alternate mode), callers should use defaultAgencyId fallback.
 *
 * Primary match: Postgres RPC trims + compares case-insensitively so DB pasted values tolerate spacing/casing.
 * Legacy fallback: strict .eq columns for older deployments before RPC migration landed.
 */
export async function resolveAgencyIdFromRealviaHeaders(
  identifikator: string,
  identifikator2: string,
): Promise<string | null> {
  const id1 = normalizeRealviaIdentifikatorHeaderValue(identifikator);
  const id2 = normalizeRealviaIdentifikatorHeaderValue(identifikator2);

  if (!id1 || !id2) {
    return defaultAgencyIdFromEnv();
  }

  const sb = createServiceRoleClient();
  if (!sb) {
    logWarn('[realvia-agency] Supabase service role unavailable — cannot resolve agency');
    return defaultAgencyIdFromEnv();
  }

  const rpc = await tryResolveViaRpc(sb, id1, id2);
  if (rpc.kind === 'resolved') {
    return rpc.agencyId;
  }

  return resolveViaLegacyEq(sb, id1, id2);
}

async function tryResolveViaRpc(
  sb: SupabaseClient,
  id1: string,
  id2: string,
): Promise<RpcResolveResult> {
  try {
    const { data: rpcUuid, error: rpcErr } = await sb.rpc('resolve_agency_id_for_realvia', {
      p_ident1: id1,
      p_ident2: id2,
    });

    if (rpcErr) {
      logWarn('[realvia-agency] RPC resolver unavailable — falling back to legacy eq()', {
        message: rpcErr.message,
        code: rpcErr.code,
      });
      return { kind: 'rpc_unavailable' };
    }

    const resolved = coerceUuid(rpcUuid);
    if (resolved) {
      logInfo('[realvia-agency] Resolved agency via RPC (trim/case tolerant)', {
        agencyId: resolved,
      });
      return { kind: 'resolved', agencyId: resolved };
    }

    return { kind: 'no_row' };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    logWarn('[realvia-agency] RPC resolver threw — falling back to legacy eq()', { message });
    return { kind: 'rpc_unavailable' };
  }
}

async function resolveViaLegacyEq(
  sb: SupabaseClient,
  id1: string,
  id2: string,
): Promise<string | null> {
  const { data, error } = await sb
    .from('agencies')
    .select('id')
    .eq('realvia_identifikator', id1)
    .eq('realvia_identifikator2', id2)
    .maybeSingle();

  if (error) {
    logWarn('[realvia-agency] Legacy agency lookup failed', { message: error.message });
    return defaultAgencyIdFromEnv();
  }

  if (data?.id) {
    logInfo('[realvia-agency] Resolved agency from Realvia headers (legacy eq)', { agencyId: data.id });
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

function coerceUuid(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw) return null;
  const t = raw.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t)
    ? t
    : null;
}

function defaultAgencyIdFromEnv(): string | null {
  const raw = process.env.REALVIA_DEFAULT_AGENCY_ID?.trim();
  return raw &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)
    ? raw
    : null;
}
