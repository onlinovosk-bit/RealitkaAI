// ================================================================
// Revolis.AI — logEventClient(): zápis eventu z PREHLIADAČA
//
// EVENTS-WIRE-02 — prečo je to vlastný súbor a nie funkcia v `log-event.ts`:
//
// `log-event.ts` obsahuje serverovú cestu, ktorá si cez
// `await import('@/lib/supabase/server')` dotiahne `next/headers`. Dynamický
// import nie je pre webpack únik: modul sa aj tak dostane do grafu. Keď som
// `logEventClient` zapojil na `leads/[id]/page.tsx` (klientský komponent),
// build spadol na
//
//   You're importing a module that depends on "next/headers". This API is only
//   available in Server Components in the App Router
//
// Import trace: page.tsx → log-event.ts → supabase/server.ts. Prehliadačový
// zapisovateľ pritom zo servera nepotrebuje NIČ — robí jediný `fetch`.
// Oddelenie je teda zároveň oprava buildu a správna hranica.
//
// V tomto súbore nesmie pribudnúť ŽIADNY serverový import. Drží to pin
// v `tests/verification/events-wire.verification.test.ts`.
// ================================================================
import type { EntityType, EventType } from '@/types/events'

export interface LogEventClientOptions {
  entityType: EntityType
  entityId?:  string | null
  eventType:  EventType
  payload?:   Record<string, unknown>
  sessionId?: string
}

/**
 * Zápis eventu z prehliadača cez `/api/events`.
 *
 * EVENTS-WIRE-01 — prečo to už nie je `sendBeacon` a prečo to už nie je ticho:
 *
 * Táto funkcia nemala do 2026-10-02 ani jedného volajúceho, takže prehliadač
 * nezapísal za celú dobu ani jeden event. Pôvodná verzia navyše posielala
 * `sendBeacon` a odpoveď zahodila — a odpoveď je jediné miesto, kde sa dá
 * zistiť, že server telo odmietol. Presne tá nevidieľnosť (tiché `catch`,
 * `ok: true` nad zlyhaným insertom) držala `public.events` prázdnu.
 *
 * Preto `fetch` s prečítaným stavom a varovaním v konzole. Voči UI zostáva
 * fire-and-forget — vracia Promise, ktorý nikto nemusí awaitovať a ktorý nikdy
 * nerejectne — ale zlyhanie už nie je neviditeľné.
 *
 * `keepalive` drží request aj cez navigáciu, čo pokrýva dôvod, pre ktorý tu
 * `sendBeacon` kedysi bol (klik na `tel:` / `mailto:` odnavigoval stránku).
 */
export async function logEventClient(opts: LogEventClientOptions): Promise<boolean> {
  try {
    const res = await fetch('/api/events', {
      method:    'POST',
      body:      JSON.stringify(opts),
      headers:   { 'Content-Type': 'application/json' },
      keepalive: true,
    })
    if (!res.ok) {
      console.warn(
        `[logEventClient] ${opts.eventType} odmietnutý: HTTP ${res.status}`,
      )
      return false
    }
    return true
  } catch (err) {
    console.warn(
      `[logEventClient] ${opts.eventType} neodoslaný:`,
      err instanceof Error ? err.message : String(err),
    )
    return false
  }
}
