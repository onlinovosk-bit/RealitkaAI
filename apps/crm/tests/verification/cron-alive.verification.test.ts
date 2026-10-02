// ================================================================
// CRON-ALIVE — 401 vetva cronu nesmie byt ticha
//
// Helper `recordUnauthorizedCronRun` je otestovany jednotkovo, ale sam o sebe
// nic nestrazi: ked ho z 401 vetvy niekto odstrani, jednotkove testy ostanu
// zelene a prazdna `cron_runs` bude znova nerozlisitelna od „cron nebezal".
// Tento pin drzi prave to zapojenie.
// ================================================================
import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const CRM_ROOT = path.resolve(__dirname, '../..')

const ROUTES = ['recompute-bri', 'morning-brief']

describe('cron 401 nechava stopu', () => {
  for (const job of ROUTES) {
    it(`${job}: 401 vetva zapisuje, ked prisel Vercel cron`, () => {
      const src = fs.readFileSync(
        path.join(CRM_ROOT, `src/app/api/cron/${job}/route.ts`),
        'utf8',
      )

      // Rozlisovac musi byt hlavicka, nie dohad o volajucom.
      expect(src).toContain('vercelCronSchedule(request.headers)')
      // A zapis musi byt v tej istej vetve, ktora vracia 401.
      expect(src).toContain('recordUnauthorizedCronRun(')

      const authBranch = src.slice(
        src.indexOf('const cronSecret'),
        src.indexOf("status: 401"),
      )
      expect(
        authBranch.includes('recordUnauthorizedCronRun('),
        `${job}: zapis nie je vnutri 401 vetvy`,
      ).toBe(true)
    })
  }
})
