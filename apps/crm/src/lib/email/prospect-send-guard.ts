// ================================================================
// Revolis.AI — spoločná brána pred odoslaním e-mailu na adresu tretej strany
//
// EMAIL-SUPPRESSION-01: `sendApprovedOutreach` už kontroloval zoznam a
// pridával List-Unsubscribe. Ostatné cesty (follow-up, dead-lead, inbound
// approve → multi-channel-sender, ghostwriter, playbook) išli rovnakým
// Resend/OUTREACH_FROM_EMAIL bez kontroly — odhlásenie a tvrdý bounce sa
// ticho obišli. Táto funkcia je jediný fail-closed kontrakt pre všetky
// prospect sendy: potlačenie + podpísaný odhlasovací odkaz.
// ================================================================
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { checkSuppression, hashEmail } from '@/lib/email/suppression'
import { unsubscribeUrl } from '@/lib/email/unsubscribe-token'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.revolis.ai'

export type ProspectSendGuardOk = {
  ok: true
  agencyId: string
  unsubUrl: string
  /** Pätička za schválený text — rovnaký tvar ako v sendApprovedOutreach. */
  footerText: string
  headers: {
    'List-Unsubscribe': string
    'List-Unsubscribe-Post': string
  }
}

export type ProspectSendGuardFail = { ok: false; error: string }

export type ProspectSendGuardResult = ProspectSendGuardOk | ProspectSendGuardFail

/**
 * Fail-closed: bez service role, bez agencyId, pri potlačení alebo bez
 * UNSUBSCRIBE_TOKEN_SECRET sa neodošle nič.
 */
export async function guardProspectEmailSend(input: {
  to: string
  agencyId: string | null | undefined
  /** Voliteľný klient (testy); inak service role. */
  client?: SupabaseClient | null
}): Promise<ProspectSendGuardResult> {
  const agencyId = typeof input.agencyId === 'string' ? input.agencyId.trim() : ''
  if (!agencyId) {
    return {
      ok: false,
      error: 'Agentúra leadu sa nedá overiť — odoslanie zastavené (zoznam odhlásených).',
    }
  }

  const admin = input.client === undefined ? createServiceRoleClient() : input.client
  if (!admin) {
    return {
      ok: false,
      error: 'Chýba service role klient — zoznam odhlásených sa nedá overiť, odoslanie zastavené.',
    }
  }

  const suppression = await checkSuppression(admin as SupabaseClient, input.to, agencyId)
  if (suppression.suppressed) {
    return {
      ok: false,
      error:
        suppression.reason === 'lookup_failed'
          ? 'Zoznam odhlásených sa nepodarilo overiť — odoslanie zastavené.'
          : 'Adresa je na zozname odhlásených alebo nedoručiteľných — odoslanie zastavené.',
    }
  }

  const unsubUrl = unsubscribeUrl(BASE_URL, { t: 'o', h: hashEmail(input.to), a: agencyId })
  if (!unsubUrl) {
    return {
      ok: false,
      error: 'Chýba UNSUBSCRIBE_TOKEN_SECRET — bez odhlasovacieho odkazu sa neodosiela.',
    }
  }

  return {
    ok: true,
    agencyId,
    unsubUrl,
    footerText: `\n\n--\nNechcete dostávať ďalšie správy? Odhlásiť sa môžete tu: ${unsubUrl}`,
    headers: {
      'List-Unsubscribe': `<${unsubUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  }
}
