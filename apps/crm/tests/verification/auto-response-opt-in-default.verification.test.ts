// ================================================================
// Revolis.AI — AUTO-RESPONSE-OPTIN-DEFAULT: nová agentúra nezačína so zapnutou auto-odpoveďou
//
// Auto-odpoveď leadovi odchádza v mene agentúry. Stĺpec `agencies.auto_response_enabled` mal od
// 20260713150000 predvolenú hodnotu `true` (opt-out), takže každá nová agentúra by ju dostala
// zapnutú bez svojho vedomia. Tento test prejde všetky migrácie v poradí názvov (ako
// `supabase db reset`) a overí, že výsledná predvolená hodnota je `false`.
//
// Parser je zámerne jednoduchý, preto sa najprv overuje na umelých vstupoch — test, ktorý by
// "nič nenašiel", by prešiel aj pri `true`. Skutočné správanie SQL (nový riadok = false, starý
// ostane) bolo navyše overené jednorazovo na reálnom Postgrese (PGlite) — postup je v PR.
// ================================================================
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const MIGRATIONS_DIR = resolve(__dirname, '../../supabase/migrations')
const COLUMN = 'auto_response_enabled'

type Stav = { existuje: boolean; predvolena: 'true' | 'false' | null }

function bezKomentarov(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '')
}

/** Prehrá ALTER TABLE ... agencies v poradí súborov a vráti, čo platí pre `auto_response_enabled`. */
function predvolenaHodnota(subory: Array<{ nazov: string; sql: string }>): { stav: Stav; chyby: string[] } {
  const stav: Stav = { existuje: false, predvolena: null }
  const chyby: string[] = []
  const alter = /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?"?agencies"?\s+([^;]*);/gi

  for (const { nazov, sql } of [...subory].sort((a, b) => a.nazov.localeCompare(b.nazov))) {
    for (const m of bezKomentarov(sql).matchAll(alter)) {
      // Klauzuly oddelené čiarkou; každá sa posudzuje zvlášť.
      for (const klauzula of m[1].split(/,(?![^(]*\))/)) {
        const pridaj = klauzula.match(
          new RegExp(`add\\s+column\\s+(?:if\\s+not\\s+exists\\s+)?"?${COLUMN}"?\\s[^;]*?default\\s+(true|false)`, 'i'),
        )
        if (pridaj) {
          if (!stav.existuje) {
            stav.existuje = true
            stav.predvolena = pridaj[1].toLowerCase() as 'true' | 'false'
          }
          continue
        }
        const nastav = klauzula.match(
          new RegExp(`alter\\s+column\\s+"?${COLUMN}"?\\s+set\\s+default\\s+(true|false)`, 'i'),
        )
        if (nastav) {
          if (!stav.existuje) chyby.push(`${nazov}: ALTER COLUMN ${COLUMN} pred ADD COLUMN`)
          stav.predvolena = nastav[1].toLowerCase() as 'true' | 'false'
          continue
        }
        if (new RegExp(`alter\\s+column\\s+"?${COLUMN}"?\\s+drop\\s+default`, 'i').test(klauzula)) {
          if (!stav.existuje) chyby.push(`${nazov}: DROP DEFAULT pred ADD COLUMN`)
          stav.predvolena = null
        }
      }
    }
  }
  return { stav, chyby }
}

/** Migrácia, ktorá by hromadne zmenila hodnotu existujúcich agentúr. */
function hromadnyUpdate(sql: string): boolean {
  const s = bezKomentarov(sql)
  return new RegExp(`update\\s+(?:only\\s+)?(?:public\\.)?"?agencies"?\\s+set[^;]*${COLUMN}`, 'i').test(s)
}

function nacitajMigracie(): Array<{ nazov: string; sql: string }> {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((nazov) => ({ nazov, sql: readFileSync(join(MIGRATIONS_DIR, nazov), 'utf8') }))
}

describe('[verification] auto-response opt-in: parser sa nemýli (umelé vstupy)', () => {
  const pridaj = (v: string) =>
    `ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS ${COLUMN} boolean NOT NULL DEFAULT ${v};`

  it('ADD COLUMN true → true', () => {
    expect(predvolenaHodnota([{ nazov: '1.sql', sql: pridaj('true') }]).stav).toEqual({
      existuje: true,
      predvolena: 'true',
    })
  })

  it('SET DEFAULT false po ADD COLUMN true → false', () => {
    const r = predvolenaHodnota([
      { nazov: '1.sql', sql: pridaj('true') },
      { nazov: '2.sql', sql: `ALTER TABLE public.agencies ALTER COLUMN ${COLUMN} SET DEFAULT false;` },
    ])
    expect(r.stav.predvolena).toBe('false')
    expect(r.chyby).toEqual([])
  })

  it('poradie sa riadi názvom súboru, nie poradím v poli', () => {
    const r = predvolenaHodnota([
      { nazov: '2.sql', sql: `ALTER TABLE public.agencies ALTER COLUMN ${COLUMN} SET DEFAULT false;` },
      { nazov: '1.sql', sql: pridaj('true') },
    ])
    expect(r.stav.predvolena).toBe('false')
  })

  it('SET DEFAULT pred ADD COLUMN je chyba (v reálnom Postgrese by migrácia padla)', () => {
    const r = predvolenaHodnota([
      { nazov: '1.sql', sql: `ALTER TABLE public.agencies ALTER COLUMN ${COLUMN} SET DEFAULT false;` },
      { nazov: '2.sql', sql: pridaj('true') },
    ])
    expect(r.chyby).toHaveLength(1)
    expect(r.stav.predvolena).toBe('true')
  })

  it('SET DEFAULT true po false → true (návrat k opt-out sa nesmie prehliadnuť)', () => {
    const r = predvolenaHodnota([
      { nazov: '1.sql', sql: pridaj('false') },
      { nazov: '2.sql', sql: `ALTER TABLE public.agencies ALTER COLUMN ${COLUMN} SET DEFAULT true;` },
    ])
    expect(r.stav.predvolena).toBe('true')
  })

  it('DROP DEFAULT → žiadna predvolená hodnota', () => {
    const r = predvolenaHodnota([
      { nazov: '1.sql', sql: pridaj('false') },
      { nazov: '2.sql', sql: `ALTER TABLE public.agencies ALTER COLUMN ${COLUMN} DROP DEFAULT;` },
    ])
    expect(r.stav.predvolena).toBeNull()
  })

  it('zakomentovaný príkaz sa ignoruje', () => {
    const r = predvolenaHodnota([
      { nazov: '1.sql', sql: pridaj('true') },
      { nazov: '2.sql', sql: `-- ALTER TABLE public.agencies ALTER COLUMN ${COLUMN} SET DEFAULT false;` },
    ])
    expect(r.stav.predvolena).toBe('true')
  })

  it('iná tabuľka alebo iný stĺpec sa nepočíta', () => {
    const r = predvolenaHodnota([
      { nazov: '1.sql', sql: pridaj('true') },
      { nazov: '2.sql', sql: 'ALTER TABLE public.leads ALTER COLUMN auto_response_enabled SET DEFAULT false;' },
      { nazov: '3.sql', sql: 'ALTER TABLE public.agencies ALTER COLUMN plan SET DEFAULT false;' },
    ])
    expect(r.stav.predvolena).toBe('true')
  })

  it('hromadný UPDATE agencies.auto_response_enabled sa rozpozná', () => {
    expect(hromadnyUpdate(`UPDATE public.agencies SET ${COLUMN} = true;`)).toBe(true)
    expect(hromadnyUpdate(`update agencies set name = 'x', ${COLUMN} = false where id = 'a';`)).toBe(true)
    expect(hromadnyUpdate(`-- UPDATE public.agencies SET ${COLUMN} = true;`)).toBe(false)
    expect(hromadnyUpdate(`UPDATE public.leads SET ${COLUMN} = true;`)).toBe(false)
  })
})

describe('[verification] auto-response opt-in: reálne migrácie', () => {
  const migracie = nacitajMigracie()

  it('parser v reálnom repe niečo nájde (pôvodná migrácia 20260713150000 = true)', () => {
    const povodna = migracie.filter((m) => m.nazov === '20260713150000_inbound_auto_response.sql')
    expect(povodna).toHaveLength(1)
    expect(predvolenaHodnota(povodna).stav).toEqual({ existuje: true, predvolena: 'true' })
  })

  it('po všetkých migráciách je predvolená hodnota false (opt-in), bez chýb v poradí', () => {
    const { stav, chyby } = predvolenaHodnota(migracie)
    expect(chyby).toEqual([])
    expect(stav).toEqual({ existuje: true, predvolena: 'false' })
  })

  it('žiadna migrácia hromadne nemení auto_response_enabled existujúcich agentúr', () => {
    const nazvy = migracie.filter((m) => hromadnyUpdate(m.sql)).map((m) => m.nazov)
    expect(nazvy).toEqual([])
  })
})
