// ================================================================
// Revolis.AI — zoznam potlačených adries (odhlásenie, bounce, sťažnosť)
//
// EMAIL-SUPPRESSION-01, tabuľka `email_suppressions`. Ukladá sa iba odtlačok
// adresy, nikdy adresa. Čítanie je fail-closed: keď sa zoznam nedá overiť,
// správa sa neodošle — odoslanie na odhlásenú adresu je horšie než jedno
// zdržané odoslanie.
// ================================================================
import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export type SuppressionReason = 'unsubscribe' | 'hard_bounce' | 'complaint' | 'suppressed'

export const GLOBAL_SCOPE = 'global'

/** `Jan <jan@x.sk>` → `jan@x.sk`, malé písmená, bez medzier. */
export function normalizeEmail(raw: string): string {
  const angle = raw.match(/<([^<>]+)>/)
  return (angle ? angle[1] : raw).trim().toLowerCase()
}

export function hashEmail(raw: string): string {
  return createHash('sha256').update(normalizeEmail(raw)).digest('hex')
}

export type SuppressionCheck =
  | { suppressed: false }
  | { suppressed: true; reason: SuppressionReason | 'lookup_failed' }

/**
 * Je adresa potlačená globálne alebo pre danú agentúru?
 * Chyba čítania = potlačená (`lookup_failed`).
 */
export async function checkSuppression(
  client: SupabaseClient,
  email: string,
  agencyId: string,
): Promise<SuppressionCheck> {
  const { data, error } = await client
    .from('email_suppressions')
    .select('reason')
    .eq('email_hash', hashEmail(email))
    .in('scope_key', [GLOBAL_SCOPE, agencyId])
    .limit(1)

  if (error) {
    console.error('[suppression] čítanie zlyhalo:', error.message)
    return { suppressed: true, reason: 'lookup_failed' }
  }
  const row = (data as { reason: SuppressionReason }[] | null)?.[0]
  return row ? { suppressed: true, reason: row.reason } : { suppressed: false }
}

/** Idempotentné: opakované doručenie webhooku alebo dvojklik nezdvojí riadok. */
export async function addSuppressionByHash(
  client: SupabaseClient,
  input: { emailHash: string; scopeKey: string; reason: SuppressionReason; source: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await client.from('email_suppressions').upsert(
    {
      email_hash: input.emailHash,
      scope_key: input.scopeKey,
      reason: input.reason,
      source: input.source,
    },
    { onConflict: 'email_hash,scope_key,reason', ignoreDuplicates: true },
  )
  if (error) {
    console.error('[suppression] zápis zlyhal:', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export function addSuppression(
  client: SupabaseClient,
  input: { email: string; scopeKey: string; reason: SuppressionReason; source: string },
) {
  return addSuppressionByHash(client, { ...input, emailHash: hashEmail(input.email) })
}
