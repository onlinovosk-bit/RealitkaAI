// ================================================================
// Revolis.AI — LEAD-PIPELINE-AFTER: lead pipeline sa vo verejných trasách nesmie spúšťať "do vzduchu"
//
// 2026-10-01 10:14 UTC: lead z widgetu vznikol, ale nemal ai_triage_at ani auto_response_sent_at a
// nezanechal žiadnu stopu — trasy volali `void runInboundLead…()` bez `await`, serverless funkcia sa po
// odpovedi zmrazila. Trasa `acquire/email` ich `await`-uje, preto tam všetko fungovalo.
//
// Táto brána nedovolí, aby sa to vrátilo: každé volanie funkcií lead pipeline pod `src/app` musí byť
// (a) priamo `await`-nuté, alebo (b) vo vnútri `runAfterResponse(...)` (next/server `after()`).
//
// Skener je AST (TypeScript), nie regex, a overuje sa na umelých vstupoch — test, ktorý by nič
// nenašiel, by prešiel aj pri porušení. Skutočné správanie za `after()` strážia route testy
// (`route.after-response.test.ts`).
// ================================================================
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'

const CRM = resolve(__dirname, '../..')
const APP_DIR = join(CRM, 'src/app')

/** Funkcie, ktoré po vytvorení leadu musia dobehnúť (triáž, potvrdenie klientovi, notifikácia, rescore). */
const PIPELINE_FUNCTIONS = new Set([
  'runInboundLeadTriageAndNotify',
  'runInboundLeadAutoResponse',
  'notifyNewBuyerLead',
  'rescoreLead',
])

type Nalez = { subor: string; riadok: number; funkcia: string }

function jeAwaitnute(uzol: ts.Node): boolean {
  let cur: ts.Node = uzol
  for (;;) {
    const p = cur.parent
    if (!p) return false
    if (ts.isParenthesizedExpression(p)) {
      cur = p
      continue
    }
    if (ts.isAwaitExpression(p)) return true
    // `await fn().catch(...)` / `await fn().then(...)` — reťaz nad volaním, ktorá sa nakoniec awaituje.
    if (ts.isPropertyAccessExpression(p) && p.expression === cur) {
      const volanie = p.parent
      if (volanie && ts.isCallExpression(volanie) && volanie.expression === p) {
        cur = volanie
        continue
      }
    }
    return false
  }
}

function jeVnutriRunAfterResponse(uzol: ts.Node): boolean {
  for (let p = uzol.parent; p; p = p.parent) {
    if (ts.isCallExpression(p) && ts.isIdentifier(p.expression) && p.expression.text === 'runAfterResponse') {
      return true
    }
  }
  return false
}

/** Vráti volania lead pipeline a tie z nich, ktoré NIE sú bezpečné. */
export function skenujPipeline(subor: string, text: string): { vsetky: number; nebezpecne: Nalez[] } {
  const sf = ts.createSourceFile(subor, text, ts.ScriptTarget.Latest, true, subor.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  let vsetky = 0
  const nebezpecne: Nalez[] = []
  const navstiv = (n: ts.Node) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && PIPELINE_FUNCTIONS.has(n.expression.text)) {
      vsetky += 1
      if (!jeAwaitnute(n) && !jeVnutriRunAfterResponse(n)) {
        nebezpecne.push({
          subor,
          riadok: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1,
          funkcia: n.expression.text,
        })
      }
    }
    ts.forEachChild(n, navstiv)
  }
  navstiv(sf)
  return { vsetky, nebezpecne }
}

function zoznamKodu(dir: string): string[] {
  const out: string[] = []
  for (const nazov of readdirSync(dir)) {
    const cesta = join(dir, nazov)
    if (statSync(cesta).isDirectory()) {
      if (nazov === '__tests__' || nazov === 'node_modules') continue
      out.push(...zoznamKodu(cesta))
    } else if (/\.(ts|tsx)$/.test(nazov) && !/\.test\.(ts|tsx)$/.test(nazov)) {
      out.push(cesta)
    }
  }
  return out
}

describe('[verification] lead pipeline: skener rozpozná nebezpečné volania (umelé vstupy)', () => {
  const sken = (kod: string) => skenujPipeline('x.ts', kod)

  it.each([
    ['void bez await', 'void runInboundLeadAutoResponse(a, b, c);'],
    ['holé volanie bez await', 'runInboundLeadTriageAndNotify(a, b, c);'],
    ['.catch bez await', 'notifyNewBuyerLead(x).catch(() => {});'],
    ['.then bez await', 'rescoreLead(id).then(() => {});'],
    ['priradené do premennej a nikdy neawaitnuté', 'const p = runInboundLeadAutoResponse(a, b, c);'],
    ['void v zátvorkách', 'void (runInboundLeadAutoResponse(a, b, c));'],
    ['vnútri inej funkcie bez await', 'function f() { void rescoreLead(id); }'],
  ])('%s → nebezpečné', (_popis, kod) => {
    const r = sken(kod)
    expect(r.vsetky).toBe(1)
    expect(r.nebezpecne).toHaveLength(1)
  })

  it.each([
    ['priamy await', 'async function f() { await runInboundLeadAutoResponse(a, b, c); }'],
    ['await v zátvorkách', 'async function f() { await (runInboundLeadAutoResponse(a, b, c)); }'],
    ['await nad .catch reťazou', 'async function f() { await rescoreLead(id).catch(() => {}); }'],
    ['return await', 'async function f() { return await runInboundLeadTriageAndNotify(a, b, c); }'],
    [
      'vnútri runAfterResponse',
      'runAfterResponse("x", [{ name: "t", run: () => runInboundLeadTriageAndNotify(a, b, c) }]);',
    ],
    [
      'vnútri runAfterResponse (viac krokov)',
      'runAfterResponse("x", [{ name: "a", run: () => notifyNewBuyerLead(x) }, { name: "b", run: () => rescoreLead(id) }]);',
    ],
  ])('%s → bezpečné', (_popis, kod) => {
    const r = sken(kod)
    expect(r.vsetky).toBeGreaterThanOrEqual(1)
    expect(r.nebezpecne).toEqual([])
  })

  it('iná funkcia sa nepočíta (iba pomenované funkcie pipeline)', () => {
    expect(sken('void somethingElse(a); rescoreLeadLater(id);').vsetky).toBe(0)
  })

  it('reťazec s menom funkcie v texte ani v komentári sa nepočíta', () => {
    expect(sken('// void runInboundLeadAutoResponse(a)\nconst s = "rescoreLead(id)";').vsetky).toBe(0)
  })

  it('nahlási riadok a názov funkcie', () => {
    const r = sken('\n\nvoid runInboundLeadAutoResponse(a, b, c);')
    expect(r.nebezpecne).toEqual([{ subor: 'x.ts', riadok: 3, funkcia: 'runInboundLeadAutoResponse' }])
  })
})

describe('[verification] lead pipeline: reálny repozitár (src/app)', () => {
  const subory = zoznamKodu(APP_DIR)
  const vysledky = subory.map((s) => ({ s, r: skenujPipeline(s, readFileSync(s, 'utf8')) }))

  it('skener niečo našiel (harness, ktorý nič nenájde, by prešiel aj pri porušení)', () => {
    const spolu = vysledky.reduce((a, v) => a + v.r.vsetky, 0)
    // valuation/submit 2 + leads/inbound 2 + buyer-onboarding 3 + acquire/email 2 = 9
    expect(spolu).toBeGreaterThanOrEqual(9)
  })

  it('každé volanie lead pipeline je await-nuté alebo vo vnútri runAfterResponse', () => {
    const nebezpecne = vysledky.flatMap((v) => v.r.nebezpecne).map((n) => ({
      ...n,
      subor: relative(CRM, n.subor),
    }))
    expect(nebezpecne).toEqual([])
  })

  it.each([
    'src/app/api/valuation/submit/route.ts',
    'src/app/api/leads/inbound/route.ts',
    'src/app/(public)/buyer-onboarding/actions.ts',
  ])('%s používa runAfterResponse', (rel) => {
    expect(readFileSync(join(CRM, rel), 'utf8')).toContain('runAfterResponse(')
  })

  it.each([
    'src/app/api/valuation/submit/route.ts',
    'src/app/api/leads/inbound/route.ts',
    'src/app/(public)/buyer-onboarding/page.tsx',
  ])('%s má maxDuration >= 30 s (after() beží v jeho rámci)', (rel) => {
    const m = readFileSync(join(CRM, rel), 'utf8').match(/export const maxDuration = (\d+)/)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(30)
  })
})
