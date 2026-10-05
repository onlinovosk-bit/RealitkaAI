// ================================================================
// Revolis.AI — VERCEL-IGNORE-BUILD-01
//
// Skript rozhoduje, či sa Vercel build vôbec spustí. Jeho zlyhanie nie je
// hlučné: nesprávne `exit 0` znamená, že sa NIČ nenasadí a build ani nezačne,
// takže v GitHube ani v CI nie je čo sčervenať. Práve preto má testy.
//
// Konvencia je obrátená oproti intuícii a je to najčastejší zdroj chyby:
//   exit 0 = build SA PRESKOČÍ
//   exit 1 = build BEŽÍ
//
// Dôvod existencie skriptu: meranie 100 posledných nasadení (2026-10-02) —
// 88 preview vs 12 produkčných, 25 vetiev, jeden agentný workstream sám 30.
// Agentné preview buildy míňali ~88 % denného stropu free plánu a produkčný
// deploy potom čakal 24 h za nimi, pričom `Playwright smoke (Vercel Preview)`
// na nich končil ako `skipped` — teda nekupovali nič.
// ================================================================
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const CRM = join(__dirname, '..', '..', '..', '..')
const SCRIPT = join(CRM, 'scripts', 'vercel-ignore-build.sh')

const SKIP = 0
const BUILD = 1

/**
 * Báza pre krok 3 skriptu (`git diff $BASE HEAD -- .`). Bez nej si skript vezme
 * `HEAD^`, a výsledok potom závisí od toho, kde test beží: CI robí checkout
 * s `fetch-depth: 2` na merge ref PR, takže PR bez zmeny v apps/crm (dokumenty,
 * pamäť) má prázdny diff, skript vyhodnotí „nič sa nezmenilo" a preskočí build.
 * Testy vetiev, ktoré majú dať BUILD, potom zlyhali len v takom PR a lokálne
 * prešli. Koreňový commit nepomáha: v plytkom klone je „koreňom" hranica
 * stiahnutej histórie, nie skutočný prvý commit.
 *
 * Neexistujúca báza je jediná hodnota nezávislá od histórie: skript skončí
 * vetvou „báza nie je dostupná" a buildí (neistota znamená buildovať).
 */
const UNUSABLE_BASE = '0'.repeat(40)
 * Vetvy, ktoré neskáču na vetvový filter, padajú na `git diff HEAD^ HEAD`.
 * Ten závisí od checkoutu: v CI (`refs/pull/N/merge`) je HEAD^ = main a PR bez
 * zmeny v apps/crm dá exit 0 (skip), takže test vtedy zbytočne zčervenie.
 * Nedostupná báza je pre skript tá istá vetva "neistota = build", ale nezávisí
 * od repozitára. Vetvový filter sa vyhodnocuje PRED diffom, takže test o ňom
 * (claude/* = skip) zostáva rozlišovací.
 */
const UNREACHABLE_BASE = '0000000000000000000000000000000000000000'

/** Spustí skript s DANÝM prostredím a vráti jeho exit kód. */
function run(env: Record<string, string>): number {
  try {
    execFileSync('bash', [SCRIPT], {
      cwd: CRM,
      // `stdio: 'pipe'` v tomto preťažení vracia Buffer; `encoding` to zjednoznační.
      encoding: 'utf8',
      stdio: 'pipe',
      // Prostredie sa nededí: test nesmie závisieť od toho, či beží na Verceli.
      // `NODE_ENV` je v tomto projekte v `ProcessEnv` povinné, preto tu je —
      // skript ho nečíta.
      env: {
        PATH: process.env.PATH ?? '',
        HOME: process.env.HOME ?? '',
        NODE_ENV: process.env.NODE_ENV ?? 'test',
        VERCEL_GIT_PREVIOUS_SHA: UNUSABLE_BASE,
        ...env,
      },
    })
    return 0
  } catch (err) {
    const status = (err as { status?: number }).status
    return typeof status === 'number' ? status : -1
  }
}

describe('vercel-ignore-build.sh — produkcia sa NIKDY nepreskakuje', () => {
  it('produkčný build sa nepreskočí ani na vetve s claude/ prefixom', () => {
    // Toto je ten scenár, pre ktorý je poradie podmienok v skripte bezpečnostné:
    // keby sa `claude/*` vyhodnocovalo prvé, produkcia by ticho nenasadila.
    expect(run({ VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'claude/cokolvek' }))
      .toBe(BUILD)
  })

  it('produkčný build na main sa nepreskočí', () => {
    expect(run({ VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'main' })).toBe(BUILD)
  })

  it('main sa nepreskočí ani v preview režime', () => {
    expect(run({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'main' })).toBe(BUILD)
  })
})

describe('vercel-ignore-build.sh — agentné vetvy', () => {
  it('preview na claude/* sa preskočí', () => {
    // Nedostupná báza: keby vetvový filter nefungoval, skript by padol na
    // "báza nie je dostupná" a vrátil BUILD. Bez nej by test prešiel aj s
    // rozbitým filtrom, kedykoľvek je diff v checkoute prázdny (PR bez apps/crm).
    expect(run({
      VERCEL_ENV: 'preview',
      VERCEL_GIT_COMMIT_REF: 'claude/zealous-albattani-2h32y5',
      VERCEL_GIT_PREVIOUS_SHA: UNREACHABLE_BASE,
    })).toBe(SKIP)
  })

  it('prefix musí sedieť presne — claudex/ nie je claude/', () => {
    expect(run({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'claudex/nieco',
      VERCEL_GIT_PREVIOUS_SHA: UNREACHABLE_BASE })).toBe(BUILD)
  })

  it('vetva, ktorá claude len obsahuje, sa nepreskočí', () => {
    expect(run({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'feat/claude-integration',
      VERCEL_GIT_PREVIOUS_SHA: UNREACHABLE_BASE }))
      .toBe(BUILD)
  })

  it('ľudské vetvy sa nepreskakujú', () => {
    expect(run({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'feat/notifications-inbox',
      VERCEL_GIT_PREVIOUS_SHA: UNREACHABLE_BASE }))
      .toBe(BUILD)
  })
})

describe('vercel-ignore-build.sh — neistota znamená buildovať', () => {
  it('bez VERCEL_ENV aj bez vetvy sa buildí', () => {
    // Pôvodný inline príkaz v tomto stave spadol rovno na git diff a vedel
    // build preskočiť. Nenasadiť kvôli chýbajúcej premennej je horší výsledok
    // než jeden build navyše.
    expect(run({})).toBe(BUILD)
  })

  it('prázdne premenné sa správajú ako chýbajúce', () => {
    expect(run({ VERCEL_ENV: '', VERCEL_GIT_COMMIT_REF: '' })).toBe(BUILD)
  })

  it('nedostupná báza pre diff znamená buildovať', () => {
    expect(run({
      VERCEL_ENV: 'preview',
      VERCEL_GIT_COMMIT_REF: 'feat/nieco',
      VERCEL_GIT_PREVIOUS_SHA: '0000000000000000000000000000000000000000',
    })).toBe(BUILD)
  })
})
