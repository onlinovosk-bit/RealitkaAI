// ================================================================
// Revolis.AI — HERO-CAPTURE-SOURCE: každý `source`, ktorý capture-lead prijme, musí prejsť CHECK-om
//
// Hero formulár na landing stránke posielal `source: "hero_email_capture"`. Route ho akceptovala
// (`validSources`), ale PROD constraint `leads_demo_source_check` ho nepovoľoval → INSERT padol na 23514,
// handler vrátil 500 a lead sa neuložil. Chybu nechytil žiadny test, lebo „route povolí" a „DB povolí"
// sú dve samostatné miesta, ktoré nič nespája.
//
// Tento test ich spája: prehrá migrácie v poradí názvov (ako `supabase db reset`), zistí výsledný zoznam
// povolených hodnôt a overí reťaz klient → route → DB. Parser je zámerne jednoduchý, preto sa najprv
// overuje na umelých vstupoch — test, ktorý by „nič nenašiel", by prešiel aj pri chybe. Skutočné správanie
// SQL (INSERT pred/po, idempotencia) bolo navyše overené na reálnom Postgrese (PGlite) — postup je v PR.
// ================================================================
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC_DIR = resolve(__dirname, '../../src')
const MIGRATIONS_DIR = resolve(__dirname, '../../supabase/migrations')
const ROUTE = join(SRC_DIR, 'app/api/demo/capture-lead/route.ts')
const CONSTRAINT = 'leads_demo_source_check'

function bezKomentarov(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '')
}

/**
 * Prehrá príkazy v poradí súborov a vráti, aké hodnoty `source` povoľuje constraint po poslednej migrácii
 * (`null` = constraint neexistuje, povolené je čokoľvek). V rámci jedného príkazu sa DROP vyhodnotí pred ADD,
 * ako to robí Postgres (`DROP CONSTRAINT IF EXISTS x, ADD CONSTRAINT x CHECK …`).
 */
function povoleneZdroje(subory: Array<{ nazov: string; sql: string }>): string[] | null {
  let povolene: string[] | null = null
  const tabulka = /(?:alter|create)\s+table\s+(?:if\s+(?:not\s+)?exists\s+)?(?:only\s+)?(?:public\.)?"?leads_demo"?(?=[\s(])/i
  const drop = new RegExp(`drop\\s+constraint\\s+(?:if\\s+exists\\s+)?"?${CONSTRAINT}"?`, 'i')
  const pridaj = new RegExp(`constraint\\s+"?${CONSTRAINT}"?\\s+check\\s*\\(+[^;]*?array\\s*\\[([^\\]]*)\\]`, 'i')

  for (const { sql } of [...subory].sort((a, b) => a.nazov.localeCompare(b.nazov))) {
    for (const prikaz of bezKomentarov(sql).split(';')) {
      // Tabuľka sa berie z hlavičky príkazu — samotné meno constraintu `leads_demo_source_check` ju neprezrádza.
      if (!prikaz.includes(CONSTRAINT) || !tabulka.test(prikaz)) continue
      if (drop.test(prikaz)) povolene = null
      const m = prikaz.match(pridaj)
      if (m) povolene = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
    }
  }
  return povolene
}

/** Zoznam `validSources` z route (priamo zo zdroja, aby test sledoval, čo route naozaj akceptuje). */
function zdrojeRoute(zdroj: string): string[] {
  const m = bezKomentarov(zdroj).match(/const\s+validSources\s*=\s*\[([^\]]*)\]/)
  return m ? [...m[1].matchAll(/["']([^"']+)["']/g)].map((x) => x[1]) : []
}

/** `source`, ktorý klient posiela v tele `fetch("/api/demo/capture-lead", …)`. */
function zdrojeKlienta(zdroj: string): string[] {
  const out: string[] = []
  for (const m of bezKomentarov(zdroj).matchAll(/fetch\(\s*["']\/api\/demo\/capture-lead["'][\s\S]*?source:\s*["']([^"']+)["']/g)) {
    out.push(m[1])
  }
  return out
}

function nacitajMigracie(): Array<{ nazov: string; sql: string }> {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((nazov) => ({ nazov, sql: readFileSync(join(MIGRATIONS_DIR, nazov), 'utf8') }))
}

function suboryKlientov(dir = SRC_DIR): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...suboryKlientov(p))
    else if (/\.tsx?$/.test(e.name) && /fetch\(\s*["']\/api\/demo\/capture-lead["']/.test(readFileSync(p, 'utf8'))) out.push(p)
  }
  return out
}

describe('[verification] leads_demo source: parser sa nemýli (umelé vstupy)', () => {
  const create = (hodnoty: string) =>
    `CREATE TABLE IF NOT EXISTS public.leads_demo (
       id uuid,
       source text DEFAULT 'ai_odhadca'::text,
       CONSTRAINT ${CONSTRAINT} CHECK ((source = ANY (ARRAY[${hodnoty}]))),
       CONSTRAINT leads_demo_pkey PRIMARY KEY (id)
     );`

  it('CREATE TABLE s inline constraintom → jeho hodnoty (predvolená hodnota stĺpca sa nepočíta)', () => {
    expect(povoleneZdroje([{ nazov: '1.sql', sql: create(`'a'::text, 'b'::text`) }])).toEqual(['a', 'b'])
  })

  it('DROP + ADD v jednom príkaze → nové hodnoty', () => {
    const r = povoleneZdroje([
      { nazov: '1.sql', sql: create(`'a'::text`) },
      {
        nazov: '2.sql',
        sql: `ALTER TABLE public.leads_demo DROP CONSTRAINT IF EXISTS ${CONSTRAINT}, ADD CONSTRAINT ${CONSTRAINT} CHECK (source = ANY (ARRAY['a'::text, 'c'::text]));`,
      },
    ])
    expect(r).toEqual(['a', 'c'])
  })

  it('samotný DROP → constraint neexistuje (null)', () => {
    const r = povoleneZdroje([
      { nazov: '1.sql', sql: create(`'a'::text`) },
      { nazov: '2.sql', sql: `ALTER TABLE public.leads_demo DROP CONSTRAINT ${CONSTRAINT};` },
    ])
    expect(r).toBeNull()
  })

  it('poradie sa riadi názvom súboru, nie poradím v poli', () => {
    const r = povoleneZdroje([
      {
        nazov: '2.sql',
        sql: `ALTER TABLE public.leads_demo DROP CONSTRAINT ${CONSTRAINT}, ADD CONSTRAINT ${CONSTRAINT} CHECK (source = ANY (ARRAY['z'::text]));`,
      },
      { nazov: '1.sql', sql: create(`'a'::text`) },
    ])
    expect(r).toEqual(['z'])
  })

  it('zakomentovaný príkaz a iná tabuľka sa ignorujú', () => {
    const r = povoleneZdroje([
      { nazov: '1.sql', sql: create(`'a'::text`) },
      { nazov: '2.sql', sql: `-- ALTER TABLE public.leads_demo DROP CONSTRAINT ${CONSTRAINT};` },
      {
        nazov: '3.sql',
        sql: `ALTER TABLE public.leads ADD CONSTRAINT ${CONSTRAINT} CHECK (source = ANY (ARRAY['x'::text]));`,
      },
    ])
    expect(r).toEqual(['a'])
  })

  it('zdrojeRoute a zdrojeKlienta čítajú zoznamy; chýbajúci zoznam = prázdne pole', () => {
    expect(zdrojeRoute(`const validSources = ["a", "b"] as const;`)).toEqual(['a', 'b'])
    expect(zdrojeRoute('const nieco = 1')).toEqual([])
    expect(
      zdrojeKlienta(`await fetch("/api/demo/capture-lead", { method: "POST", body: JSON.stringify({ email, source: "hero" }) })`),
    ).toEqual(['hero'])
    expect(zdrojeKlienta(`fetch("/api/iny", { body: { source: "x" } })`)).toEqual([])
  })
})

describe('[verification] leads_demo source: reálne repo', () => {
  const migracie = nacitajMigracie()
  const route = zdrojeRoute(readFileSync(ROUTE, 'utf8'))
  const db = povoleneZdroje(migracie)

  it('parser v repe niečo nájde (baseline 20260925210000 = pôvodné tri hodnoty)', () => {
    const baseline = migracie.filter((m) => m.nazov === '20260925210000_baseline_prod_only_tables.sql')
    expect(baseline).toHaveLength(1)
    expect(povoleneZdroje(baseline)).toEqual(['ai_odhadca', 'neighborhood_watch', 'digital_twin'])
    expect(route.length).toBeGreaterThan(0)
  })

  it('každý source, ktorý capture-lead prijme, prejde constraintom po všetkých migráciách', () => {
    // null = constraint neexistuje (povolené je čokoľvek) — nie je to chyba tohto testu.
    if (db === null) return
    expect(route.filter((s) => !db.includes(s))).toEqual([])
  })

  it('hero_email_capture (hero formulár na landing stránke) je povolený', () => {
    expect(route).toContain('hero_email_capture')
    expect(db === null || db.includes('hero_email_capture')).toBe(true)
  })

  it('každý klient posiela source, ktorý route akceptuje (inak dostane 200 s „ai_odhadca" namiesto svojho)', () => {
    const subory = suboryKlientov().filter((f) => f !== ROUTE)
    expect(subory.length).toBeGreaterThan(0)
    // Súbor → hodnoty mimo zoznamu route; pri chybe test vypíše, ktorý súbor a ktorá hodnota.
    const nepovolene = Object.fromEntries(
      subory.map((f) => [f.replace(SRC_DIR, 'src'), zdrojeKlienta(readFileSync(f, 'utf8')).filter((s) => !route.includes(s))]),
    )
    expect(Object.values(nepovolene).every((v) => v.length === 0), JSON.stringify(nepovolene)).toBe(true)
    // Súbor, z ktorého parser nič nevyčítal, by prešiel „naprázdno".
    expect(subory.filter((f) => zdrojeKlienta(readFileSync(f, 'utf8')).length === 0)).toEqual([])
  })
})
