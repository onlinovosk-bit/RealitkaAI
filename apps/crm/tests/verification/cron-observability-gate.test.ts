// ================================================================
// Revolis.AI — CRON-RUNS-CI-GATE-01: brána naozaj zastaví nový cron bez denníka
//
// Kontrola, ktorú nikto neoveril, je prianie — presne to napísal autor
// check-api-contract.mjs a presne to platí aj tu. Tento test spúšťa skript
// ako podproces nad umelým stromom v dočasnom adresári, takže overuje to, čo
// naozaj pobeží v CI, nie jeho predstavu.
//
// Skript číta cesty relatívne k CWD, takže stačí podstrčiť mu iný pracovný
// adresár; repo sa pri tom nedotýka.
// ================================================================
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const SKRIPT = resolve(__dirname, '../../scripts/check-cron-observability.mjs')

let koren: string

/** Vytvorí `apps/crm/src/app/api/cron/<meno>/route.ts` s daným obsahom. */
function cronRoute(meno: string, obsah: string) {
  const dir = join(koren, 'apps/crm/src/app/api/cron', meno)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'route.ts'), obsah)
}

function vercelJson(cesty: string[]) {
  writeFileSync(
    join(koren, 'apps/crm/vercel.json'),
    JSON.stringify({ crons: cesty.map((p) => ({ path: p, schedule: '0 1 * * *' })) }),
  )
}

function baseline(entries: string[]) {
  writeFileSync(
    join(koren, 'apps/crm/scripts/cron-observability-baseline.json'),
    JSON.stringify({ entries }),
  )
}

/** Spustí kontrolu. Vracia výstup aj návratový kód. */
function spusti(ci = true): { kod: number; vystup: string } {
  try {
    const vystup = execFileSync('node', [SKRIPT, ...(ci ? ['--ci'] : [])], {
      cwd: koren,
      encoding: 'utf8',
    })
    return { kod: 0, vystup }
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string }
    return { kod: e.status ?? 1, vystup: `${e.stdout ?? ''}${e.stderr ?? ''}` }
  }
}

const S_DENNIKOM = `
import { recordCronRun } from '@/lib/ops/cron-run'
export async function GET() { await recordCronRun(); return new Response('ok') }
`
const BEZ_DENNIKA = `
export async function GET() { return new Response('ok') }
`

beforeEach(() => {
  koren = mkdtempSync(join(tmpdir(), 'cron-gate-'))
  mkdirSync(join(koren, 'apps/crm/scripts'), { recursive: true })
})

afterEach(() => rmSync(koren, { recursive: true, force: true }))

describe('check-cron-observability — brána', () => {
  it('cron s recordCronRun prejde', () => {
    cronRoute('dobry', S_DENNIKOM)
    vercelJson(['/api/cron/dobry'])
    baseline([])

    const { kod } = spusti()
    expect(kod).toBe(0)
  })

  it('NOVÝ cron bez recordCronRun zhodí CI', () => {
    cronRoute('zly', BEZ_DENNIKA)
    vercelJson(['/api/cron/zly'])
    baseline([])

    const { kod, vystup } = spusti()
    expect(kod).toBe(1)
    expect(vystup).toContain('/api/cron/zly')
    expect(vystup).toContain('recordCronRun')
  })

  it('existujúci dlh v baseline CI nezhodí — inak by bola trvalo červená', () => {
    // Poučenie zo schema-governance-guard.yml: trvalo červený beh vytrénoval
    // alarm fatigue a workflow sa musel vypnúť.
    cronRoute('zly', BEZ_DENNIKA)
    vercelJson(['/api/cron/zly'])
    baseline(['/api/cron/zly#observe'])

    expect(spusti().kod).toBe(0)
  })

  it('cron vo vercel.json bez route.ts je nález, nie ticho', () => {
    // Taký cron vracia 404 každý deň a nikto sa to nedozvie.
    vercelJson(['/api/cron/neexistuje'])
    baseline([])

    const { kod, vystup } = spusti()
    expect(kod).toBe(1)
    expect(vystup).toContain('neexistuje')
  })

  it('tá istá route s dvoma rozvrhmi sa počíta raz', () => {
    // `dashboard-insights` je vo vercel.json dvakrát (06:00 a 13:00).
    cronRoute('dvakrat', BEZ_DENNIKA)
    vercelJson(['/api/cron/dvakrat', '/api/cron/dvakrat'])
    baseline([])

    const { vystup } = spusti()
    expect(vystup).toContain('(1 rôznych routes)')
    expect(vystup).toMatch(/NOVÉ porušenia:\s+1/)
  })

  it('bez --ci nezhodí beh, len vypíše — na lokálne pozeranie', () => {
    cronRoute('zly', BEZ_DENNIKA)
    vercelJson(['/api/cron/zly'])
    baseline([])

    expect(spusti(false).kod).toBe(0)
  })
})
