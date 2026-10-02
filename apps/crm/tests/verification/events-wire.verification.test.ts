// ================================================================
// Revolis.AI — EVENTS-WIRE-01 verification
//
// Jednotkové testy držia, že `/api/events` validuje a že slovník platí za behu.
// Nedržia ale to, že ich vôbec niekto volá — a práve to bola porucha: helper
// `logEventClient` existoval štyri mesiace bez jediného volajúceho, takže
// `public.events` zostala prázdna a celá AI vrstva s ňou.
//
// Tieto piny preto strážia ZAPOJENIE v zdroji. Keď sa call site odstráni,
// jednotkové testy zostanú zelené a zhasne až toto.
// ================================================================
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const CRM = join(__dirname, '..', '..')
const read = (p: string) => readFileSync(join(CRM, p), 'utf8')

describe('prehliadačový zapisovateľ nesmie ťahať server', () => {
  const clientLogger = read('src/lib/events/log-event-client.ts')
  const serverLogger = read('src/lib/events/log-event.ts')

  // EVENTS-WIRE-02 — toto zhodilo build. `log-event.ts` si cez
  // `await import('@/lib/supabase/server')` dotiahne `next/headers`, a dynamický
  // import pre webpack nie je únik: klientský komponent, ktorý si odtiaľ vzal
  // `logEventClient`, spadol na „This API is only available in Server
  // Components". Pin drží hranicu, nie formuláciu.
  /**
   * Komentáre sa pred kontrolou odstrihnú. Bez toho pin trafí aj vysvetlenie,
   * ktoré zakázané moduly cituje — a pin, ktorý zhasne na komentári, nestráži
   * hranicu, stráži formuláciu.
   */
  const codeOnly = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('klientský modul neimportuje nič serverové', () => {
    const code = codeOnly(clientLogger)
    // Jediná povolená závislosť je typová.
    // `\s*` by zhltlo aj predchádzajúce prázdne riadky (\s matchuje \n), preto
    // sa každý zásah ešte otrimuje.
    const imports = (code.match(/^[^\S\n]*(?:import|export)\s[^\n]*from\s[^\n]*$/gm) ?? [])
      .map((line) => line.trim())
    expect(imports).toEqual(["import type { EntityType, EventType } from '@/types/events'"])
    // A ani dynamický import — pre webpack to nie je únik z grafu.
    expect(code).not.toMatch(/\bimport\s*\(/)
    expect(code).not.toMatch(/require\s*\(/)
  })

  it('serverový modul už prehliadačovú funkciu nevyváža', () => {
    expect(serverLogger).not.toContain('export async function logEventClient')
    expect(serverLogger).not.toContain('export function logEventClient')
  })
})

describe('prehliadač zapisuje eventy', () => {
  const leadPage = read('src/app/(dashboard)/leads/[id]/page.tsx')

  it('detail leadu loguje lead_viewed cez logEventClient z klientského modulu', () => {
    expect(leadPage).toContain('logEventClient')
    expect(leadPage).toContain('@/lib/events/log-event-client')
    expect(leadPage).not.toMatch(/import \{ logEventClient \} from "@\/lib\/events\/log-event"/)
    expect(leadPage).toMatch(/eventType:\s*"lead_viewed"/)
  })

  it('lead_viewed ide s entityType lead a s id leadu', () => {
    // Bez entityId sa BRI neprepočíta (route to vyžaduje), takže pin drží oboje.
    const call = leadPage.slice(
      leadPage.indexOf('void logEventClient({'),
      leadPage.indexOf('}, [id]);', leadPage.indexOf('void logEventClient({')),
    )
    expect(call).toMatch(/entityType:\s*"lead"/)
    expect(call).toMatch(/entityId:\s*id/)
  })

  it('demo tlačidlo už neposiela vymyslené signály na /api/events', () => {
    // Pôvodné telo route ignorovala a tlačidlo aj tak tvrdilo „nové skóre".
    //
    // Pin je na VLASTNOSŤ, nie na literál signálov: táto stránka už na
    // `/api/events` nič neposiela (jediný event ide cez `logEventClient`)
    // a prepočet skóre volá skutočný endpoint. Pin na literály by inak
    // trafil aj komentár, ktorý ich cituje.
    expect(leadPage).not.toContain('fetch("/api/events"')
    expect(leadPage).not.toContain("fetch('/api/events'")
    expect(leadPage).toContain('/api/leads/bri-recompute')
  })
})

describe('server zapisuje eventy tam, kde vie fakt', () => {
  const contactAttempt = read('src/app/api/leads/[id]/contact-attempt/route.ts')

  it('kontaktný pokus loguje event service-role klientom', () => {
    expect(contactAttempt).toContain('logEventDetailed')
    expect(contactAttempt).toContain('createAdminClient()')
  })

  it('netvrdí doručenie ani odpoveď', () => {
    // Route o výsledku nevie nič (viď jej vlastnú zmluvu), takže `call_completed`
    // ani `message_sent` tu nesmú byť — to by bolo vymyslené číslo vo funneli.
    expect(contactAttempt).toContain('"call_initiated"')
    expect(contactAttempt).toContain('"message_initiated"')
    expect(contactAttempt).not.toContain('"call_completed"')
    expect(contactAttempt).not.toContain('"message_sent"')
  })

  it('zlyhanie zápisu eventu nezhodí zaznamenaný pokus, ale ani sa nezahodí', () => {
    expect(contactAttempt).toContain('eventLogError')
  })
})

describe('/api/events nepretypováva telo', () => {
  const route = read('src/app/api/events/route.ts')

  it('validuje cez uzavretý slovník, nie cez `as`', () => {
    expect(route).toContain('validateBody')
    expect(route).toContain('z.enum(ENTITY_TYPES)')
    expect(route).toContain('z.enum(EVENT_TYPES)')
  })

  it('už neobsahuje pretypovanie tela, ktoré poruchu umožnilo', () => {
    expect(route).not.toMatch(/await\s+request\.json\(\)\s+as/)
  })

  it('zlyhanie zápisu nekončí ok:true', () => {
    expect(route).toContain('logEventDetailed')
    expect(route).toMatch(/if\s*\(logError\s*\|\|\s*!eventId\)/)
  })
})

describe('slovník je runtime zdroj, nie len typ', () => {
  const types = read('src/types/events.ts')

  it('EVENT_TYPES a ENTITY_TYPES sú `as const` polia', () => {
    expect(types).toMatch(/export const ENTITY_TYPES = \[[\s\S]*?\] as const/)
    expect(types).toMatch(/export const EVENT_TYPES = \[[\s\S]*?\] as const/)
  })

  it('typy sú z nich derivované, takže sa nedajú rozísť', () => {
    expect(types).toContain('export type EntityType = (typeof ENTITY_TYPES)[number]')
    expect(types).toContain('export type EventType  = (typeof EVENT_TYPES)[number]')
  })
})
