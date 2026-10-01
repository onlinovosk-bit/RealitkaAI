// ================================================================
// Revolis.AI — SCHEMA-GAP-RATCHET: kód nesmie volať tabuľku, ktorú nezakladá migrácia
//
// Tri vrstvy dôkazu, každá pre inú otázku:
//
//   1. Reálny repozitár: platí brána dnes? (a nie je prázdna — harness, ktorý
//      nič nenašiel, by prešiel aj pri medzere)
//   2. Skener vs. TypeScript AST nad každým skenovaným súborom: nemá skener
//      falošný negatív? Dependency-free regex skener je zámerne jednoduchý;
//      toto je poistka, že ho nezmiatol regex literál, šablóna či JSX apostrof.
//   3. Mutačné dôkazy: skript sa spúšťa ako podproces nad umelým stromom, takže
//      sa overuje to, čo naozaj pobeží v CI. Test, ktorý nikdy nepadol, je prianie.
//
// Parser migrácií bol navyše overený jednorazovo proti reálnemu Postgresu
// (všetkých 127 migrácií prehraných, 146 objektov v `public`, 0 rozdielov) —
// postup a čísla sú v PR; do CI sa nedá bez Dockera.
// ================================================================
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import * as ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  findFromCalls,
  listCodeFiles,
  scanCode,
  scanMigrations,
} from '../../scripts/check-schema-gap.mjs'

const SKRIPT = resolve(__dirname, '../../scripts/check-schema-gap.mjs')
const REPO = resolve(__dirname, '../../../..')

// ---------------------------------------------------------------
// 1. Reálny repozitár
// ---------------------------------------------------------------
describe('[verification] schema-gap: reálny repozitár', () => {
  it('brána prejde — žiadna nová medzera, žiadna zhnitá výnimka', () => {
    const vystup = execFileSync('node', [SKRIPT, '--ci'], { cwd: REPO, encoding: 'utf8' })
    expect(vystup).toMatch(/NOVÝCH medzier:\s+0/)
  })

  it('skener niečo našiel — prázdny vstup by prešiel vždy', () => {
    const kod = scanCode(undefined, REPO)
    const { relations, files } = scanMigrations(undefined, REPO)
    // Namerané 2026-10-01: 125 tabuliek, 146 objektov, 127 migrácií, 1440 súborov.
    // Spodné hranice sú hrubé; majú chytiť „skener nič nevidí“, nie rast.
    expect(kod.tables.size).toBeGreaterThan(100)
    expect(relations.size).toBeGreaterThan(100)
    expect(files).toBeGreaterThan(100)
    expect(kod.files).toBeGreaterThan(500)
  })

  it('skener rozlíšil všetky .from(výraz) — slepá škvrna nerastie nepozorovane', () => {
    expect(scanCode(undefined, REPO).dynamic).toEqual([])
  })

  it('tabuľka s medzerami a bodkou v názve sa rozpozná v kóde aj v migrácii', () => {
    // `AI AGENT AUTOMAT ONBOARDING no.2.01` je v PROD bez vlastnej migrácie;
    // zakladá ju až baseline migrácia. Naivný split na „.“ by ju rozbil.
    const meno = 'AI AGENT AUTOMAT ONBOARDING no.2.01'
    expect(scanCode(undefined, REPO).tables.has(meno)).toBe(true)
    expect(scanMigrations(undefined, REPO).relations.has(meno)).toBe(true)
  })
})

// ---------------------------------------------------------------
// 2. Skener vs. TypeScript AST
// ---------------------------------------------------------------
const NON_DB = new Set([
  'Buffer', 'Array', 'ArrayBuffer', 'Int8Array', 'Uint8Array', 'Uint8ClampedArray',
  'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array', 'Float32Array',
  'Float64Array', 'BigInt64Array', 'BigUint64Array', 'Readable', 'Observable',
  'Iterator', 'AsyncIterator', 'storage',
])
const VERBS = new Set(['select', 'insert', 'update', 'upsert', 'delete'])

function astVolania(rel: string, text: string) {
  const kind = rel.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : rel.endsWith('.jsx')
      ? ts.ScriptKind.JSX
      : /\.[cm]?js$/.test(rel)
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, kind)
  const literal: string[] = []
  const other: string[] = []
  const visit = (n: ts.Node): void => {
    if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      n.expression.name.text === 'from' &&
      n.arguments.length === 1
    ) {
      const recv = n.expression.expression
      const recvName = ts.isIdentifier(recv)
        ? recv.text
        : ts.isPropertyAccessExpression(recv)
          ? recv.name.text
          : ''
      if (!NON_DB.has(recvName)) {
        const a = n.arguments[0]
        const parent = n.parent
        const verb =
          ts.isPropertyAccessExpression(parent) &&
          parent.expression === n &&
          VERBS.has(parent.name.text)
        if (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) literal.push(a.text)
        else if (verb) other.push(a.getText(sf).replace(/\s+/g, ' '))
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return { literal, other }
}

describe('[verification] schema-gap: skener sa zhoduje s TypeScript AST', () => {
  it('rovnaké .from() volania v každom skenovanom súbore (žiadny falošný negatív)', () => {
    const rozdiely: string[] = []
    let literalov = 0
    for (const rel of listCodeFiles(undefined, REPO)) {
      const text = readFileSync(join(REPO, rel), 'utf8')
      const ast = astVolania(rel, text)
      const sken = findFromCalls(text)
      const a = JSON.stringify([ast.literal.slice().sort(), ast.other.slice().sort()])
      const s = JSON.stringify([
        sken.literal.map((c: { table: string }) => c.table).sort(),
        sken.other.map((c: { expr: string }) => c.expr).sort(),
      ])
      literalov += ast.literal.length
      if (a !== s) rozdiely.push(rel)
    }
    expect(rozdiely).toEqual([])
    // bez tejto hranice by test prešiel aj nad prázdnym zoznamom súborov
    expect(literalov).toBeGreaterThan(500)
  }, 120_000)
})

// ---------------------------------------------------------------
// 3. Mutačné dôkazy nad umelým stromom
// ---------------------------------------------------------------
let koren: string

function subor(rel: string, obsah: string) {
  const p = join(koren, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, obsah)
}
const kod = (rel: string, obsah: string) => subor(`apps/crm/src/${rel}`, obsah)
const migracia = (nazov: string, sql: string) =>
  subor(`apps/crm/supabase/migrations/${nazov}`, sql)

function vynimky(missingTable: object[] = [], dynamicSites: object[] = []) {
  subor('apps/crm/scripts/schema-gap-allowlist.json', JSON.stringify({ missingTable, dynamicSites }))
}
const vyplnena = (table: string) => ({
  table,
  cause: 'test: migrácia chýba',
  resolution: 'test: pridať migráciu',
})

function spusti(): { kod: number; vystup: string } {
  try {
    const vystup = execFileSync('node', [SKRIPT, '--ci'], {
      cwd: koren,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { kod: 0, vystup }
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string }
    return { kod: e.status ?? 1, vystup: `${e.stdout ?? ''}${e.stderr ?? ''}` }
  }
}

const ZAKLAD = 'create table public.leads (id uuid primary key);\n'

beforeEach(() => {
  koren = mkdtempSync(join(tmpdir(), 'schema-gap-'))
  migracia('20260101000000_base.sql', ZAKLAD)
  vynimky()
})
afterEach(() => rmSync(koren, { recursive: true, force: true }))

describe('[verification] schema-gap: brána naozaj zastaví medzeru', () => {
  it('tabuľka založená migráciou prejde', () => {
    kod('a.ts', 'await sb.from("leads").select("*")')
    expect(spusti().kod).toBe(0)
  })

  it('NOVÁ tabuľka bez migrácie zhodí CI a vypíše tabuľku aj súbor', () => {
    kod('a.ts', 'await sb.from("zzz_neexistuje").select("*")')
    const { kod: k, vystup } = spusti()
    expect(k).toBe(1)
    expect(vystup).toContain('zzz_neexistuje')
    expect(vystup).toContain('apps/crm/src/a.ts:1')
  })

  it.each([
    ['jednoduché úvodzovky', `await sb.from('zzz').select('*')`],
    ['backtick', 'await sb.from(`zzz`).select("*")'],
    ['generikum', 'await sb.from<Row>("zzz").select("*")'],
    ['optional chaining', 'await sb?.from("zzz").select("*")'],
    ['viac riadkov', 'await sb\n  .from(\n    "zzz"\n  )\n  .select("*")'],
    ['konštanta v súbore', 'const T = "zzz"\nawait sb.from(T).select("*")'],
    ['konštanta s as const', 'const T = "zzz" as const\nawait sb.from(T).insert({})'],
    ['člen objektovej konštanty', 'const TBL = { a: "zzz" } as const\nawait sb.from(TBL.a).select("*")'],
    [
      'helper s parametrom `table` volaný s literálom',
      'async function cnt(sb, table) { return sb.from(table).select("*") }\nawait cnt(sb, "zzz")',
    ],
    [
      'helper vo viacerých súboroch cez exportovanú konštantu',
      'import { T } from "./b"\nawait sb.from(T).select("*")',
    ],
  ])('chytí aj: %s', (_nazov, zdroj) => {
    kod('a.ts', zdroj)
    kod('b.ts', 'export const T = "zzz"')
    const { kod: k, vystup } = spusti()
    expect(k).toBe(1)
    expect(vystup).toContain('`zzz`')
  })

  it('helper volaný s názvom, ktorý sa nedá určiť, je pomenovaná slepá škvrna, nie ticho', () => {
    kod('a.ts', 'async function cnt(sb, table) { return sb.from(table).select("*") }\nawait cnt(sb, pick())')
    const { kod: k, vystup } = spusti()
    expect(k).toBe(1)
    expect(vystup).toContain('NEW_DYNAMIC_SITE')
  })

  it('pomenovaná slepá škvrna v dynamicSites prejde — a zhnije, keď zmizne volanie', () => {
    kod('a.ts', 'async function cnt(sb, table) { return sb.from(table).select("*") }\nawait cnt(sb, pick())')
    vynimky([], [{ file: 'apps/crm/src/a.ts', expr: 'table' }])
    expect(spusti().kod).toBe(0)

    kod('a.ts', 'await sb.from("leads").select("*")')
    const { kod: k, vystup } = spusti()
    expect(k).toBe(1)
    expect(vystup).toContain('STALE_DYNAMIC_SITE')
  })

  it('testy a mocky sa neskenujú — v teste môže byť tabuľka, ktorú produkcia nemá', () => {
    kod('__tests__/a.test.ts', 'await sb.from("zzz").select("*")')
    kod('b.spec.ts', 'await sb.from("zzz").select("*")')
    kod('c.ts', 'await sb.from("leads").select("*")')
    expect(spusti().kod).toBe(0)
  })

  it('nie je dotaz do databázy: Buffer/Array.from, komentáre, reťazce', () => {
    kod(
      'a.ts',
      [
        'const b = Buffer.from("abc")',
        'const c = Array.from("abc")',
        '// sb.from("v_komentari").select("*")',
        '/* sb.from("v_bloku").select("*") */',
        'const d = Buffer.from(x, "base64")',
        'const url = "https://example.com/x" // toto nie je regex ani komentár tabuľky',
      ].join('\n'),
    )
    expect(spusti().kod).toBe(0)
  })

  it('Storage API nie je tabuľka: supabase.storage.from("bucket")', () => {
    kod('a.ts', 'await sb.storage.from("avatars").upload("a.png", f)\nawait supabase.storage.from("docs").remove(["x"])')
    kod('b.ts', 'await sb.from("leads").select("*")')
    expect(spusti().kod).toBe(0)
  })

  it('regex literál s úvodzovkami nezožerie nasledujúce volanie', () => {
    // Zle rozpoznaný reťazec by skryl `.from("zzz")` — falošný negatív, najhorší typ chyby brány.
    kod('a.tsx', 'const re = /["\']/g\nawait sb.from("zzz").select("*")')
    expect(spusti().kod).toBe(1)
  })

  it('apostrof v JSX texte nezožerie nasledujúce volanie', () => {
    kod('a.tsx', 'const x = <p>Don\'t panic</p>\nawait sb.from("zzz").select("*")')
    expect(spusti().kod).toBe(1)
  })

  it('volanie v `${}` šablóny sa nestratí', () => {
    kod('a.ts', 'const s = `x ${await sb.from("zzz").select("*")} y`')
    expect(spusti().kod).toBe(1)
  })
})

describe('[verification] schema-gap: čo sa počíta za „založené migráciou“', () => {
  const volaj = (t: string) => kod('a.ts', `await sb.from(${JSON.stringify(t)}).select("*")`)

  it.each([
    ['CREATE TABLE IF NOT EXISTS public.x', 'create table if not exists public.zzz (id int);'],
    ['CREATE TABLE bez schémy', 'CREATE TABLE zzz (id int);'],
    ['CREATE VIEW', 'create view public.zzz as select 1;'],
    ['CREATE OR REPLACE VIEW', 'create or replace view zzz as select 1;'],
    ['MATERIALIZED VIEW', 'create materialized view public.zzz as select 1;'],
    ['tabuľka v tele DO bloku', "do $$ begin if not exists (select 1) then create table public.zzz (id int); end if; end $$;"],
    ['RENAME TO', 'create table public.stara (id int);\nalter table public.stara rename to zzz;'],
    ['viac príkazov na jednom riadku', 'select 1; create table zzz (id int); select 2;'],
  ])('počíta sa: %s', (_n, sql) => {
    migracia('20260102000000_x.sql', sql)
    volaj('zzz')
    expect(spusti().kod).toBe(0)
  })

  it('názov v úvodzovkách s bodkou a medzerami', () => {
    migracia('20260102000000_x.sql', 'create table if not exists public."Moja tabuľka no.2.01" (id int);')
    volaj('Moja tabuľka no.2.01')
    expect(spusti().kod).toBe(0)
  })

  it.each([
    ['DROP TABLE v neskoršej migrácii', ['create table zzz (id int);', 'drop table if exists public.zzz;']],
    ['DROP so zoznamom', ['create table zzz (id int);', 'drop table a, zzz cascade;']],
    ['RENAME preč zo starého názvu', ['create table zzz (id int);', 'alter table zzz rename to ina;']],
    ['SET SCHEMA mimo public', ['create table zzz (id int);', 'alter table zzz set schema archiv;']],
  ])('už sa nepočíta: %s', (_n, [a, b]) => {
    migracia('20260102000000_a.sql', a)
    migracia('20260103000000_b.sql', b)
    volaj('zzz')
    const { kod: k, vystup } = spusti()
    expect(k).toBe(1)
    expect(vystup).toContain('zzz')
  })

  it.each([
    ['dočasná tabuľka', 'create temp table zzz (id int);'],
    ['dočasná tabuľka (TEMPORARY)', 'create temporary table zzz (id int);'],
    ['tabuľka v inej schéme', 'create table auth.zzz (id int);'],
    ['komentár s CREATE TABLE', '-- create table zzz (id int);\n/* create table zzz (id int); */'],
    ['reťazec s CREATE TABLE', "select 'create table zzz (id int);';"],
    ['telo funkcie', "create function f() returns void language plpgsql as $$ begin create table zzz (id int); end $$;"],
  ])('nepočíta sa: %s', (_n, sql) => {
    migracia('20260102000000_x.sql', sql)
    volaj('zzz')
    expect(spusti().kod).toBe(1)
  })

  it('SQL mimo adresára migrácií sa nepočíta (poučenie z event_store)', () => {
    // 002_event_store.sql leží v src/infra/db/migrations/, kam `supabase db reset` nesiaha.
    subor('apps/crm/src/infra/db/migrations/002_x.sql', 'create table zzz (id int);')
    subor('apps/crm/supabase/volny.sql', 'create table zzz (id int);')
    volaj('zzz')
    expect(spusti().kod).toBe(1)
  })

  it('migrácia v poradí: tabuľka zrušená a znova založená existuje', () => {
    migracia('20260102000000_a.sql', 'create table zzz (id int);')
    migracia('20260103000000_b.sql', 'drop table zzz;')
    migracia('20260104000000_c.sql', 'create table zzz (id int);')
    volaj('zzz')
    expect(spusti().kod).toBe(0)
  })
})

describe('[verification] schema-gap: výnimky viazané na príčinu', () => {
  beforeEach(() => kod('a.ts', 'await sb.from("zzz").select("*")'))

  it('tabuľka s platnou výnimkou prejde a výstup nesie príčinu', () => {
    vynimky([vyplnena('zzz')])
    const { kod: k, vystup } = spusti()
    expect(k).toBe(0)
    expect(vystup).toContain('test: migrácia chýba')
  })

  it('keď príčina zanikne (migrácia pribudla), výnimka je neplatná a CI žiada jej zmazanie', () => {
    vynimky([vyplnena('zzz')])
    migracia('20260102000000_fix.sql', 'create table zzz (id int);')
    const { kod: k, vystup } = spusti()
    expect(k).toBe(1)
    expect(vystup).toContain('STALE_CAUSE_RESOLVED')
    expect(vystup).toContain('20260102000000_fix.sql')
  })

  it('po zmazaní záznamu prejde; návrat medzery (migrácia zmizne) je opäť NOVÁ medzera', () => {
    migracia('20260102000000_fix.sql', 'create table zzz (id int);')
    vynimky()
    expect(spusti().kod).toBe(0)

    rmSync(join(koren, 'apps/crm/supabase/migrations/20260102000000_fix.sql'))
    const { kod: k, vystup } = spusti()
    expect(k).toBe(1)
    expect(vystup).toContain('NEW_GAP')
  })

  it('výnimka pre tabuľku, ktorú kód už nevolá, zhnije nahlas', () => {
    kod('a.ts', 'await sb.from("leads").select("*")')
    vynimky([vyplnena('zzz')])
    const { kod: k, vystup } = spusti()
    expect(k).toBe(1)
    expect(vystup).toContain('STALE_NO_CALLER')
  })

  it('výnimka bez príčiny alebo bez toho, čo ju zruší, je len vypnutá kontrola', () => {
    vynimky([{ table: 'zzz' }])
    const { kod: k, vystup } = spusti()
    expect(k).toBe(1)
    expect(vystup).toContain('ENTRY_INCOMPLETE')
  })

  it('výnimka pre jednu tabuľku neodpustí inú', () => {
    kod('b.ts', 'await sb.from("ina").select("*")')
    vynimky([vyplnena('zzz')])
    const { kod: k, vystup } = spusti()
    expect(k).toBe(1)
    expect(vystup).toContain('`ina`')
  })
})

describe('[verification] schema-gap: harness bez vstupu nie je dôkaz', () => {
  it('bez migrácií skript zlyhá hlasno (exit 2), nie zelene', () => {
    rmSync(join(koren, 'apps/crm/supabase/migrations'), { recursive: true })
    mkdirSync(join(koren, 'apps/crm/supabase/migrations'), { recursive: true })
    kod('a.ts', 'await sb.from("leads").select("*")')
    expect(spusti().kod).toBe(2)
  })

  it('bez zdrojákov skript zlyhá hlasno (exit 2)', () => {
    expect(spusti().kod).toBe(2)
  })
})
