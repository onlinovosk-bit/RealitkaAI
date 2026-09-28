# Náhradný dôkaz za zablokované CI (PR #548 / #549 / #550)

**Dátum:** 2026-09-14  
**Stav CI na GitHub:** zablokované billingom — joby sa nespúšťajú  
**Účel:** lokálny náhradný beh tých istých guardov na tipoch troch HIGH fix vetiev, kým org billing nie je odomknutý.

Poznámka: nadpis pôvodného handoffu spomínal aj #547 (docs ADR Soft Factory). Tento beh meria **tri fix vetvy** (#548 outreach, #549 playbook, #550 profiles). #547 je docs-only a nemá Code Contract Guard ako required code ratchet v tom istom zmysle.

## Diagnóza GitHub CI

Všetky zlyhané checky hlásia to isté:

```
.github:1 The job was not started because your account is locked due to a billing issue.
```

`The job was not started` — runner sa vôbec nespustil, takže žiaden z checkov nikdy nevidel diff. Bude to tak na každom pushi a každom PR, kým sa billing neodomkne. Re-run to nevyrieši a agent to nevyrieši.

## Code Contract Guard / Zmluva kódu (ratchet) — PASS

Presne to, čo beží vo workflowe: `node apps/crm/scripts/check-api-contract.mjs --ci`

| Vetva | Porušení spolu | Baseline | NOVÉ |
|---|---|---|---|
| `fix/outreach-scoped-lead-lookup` (#548) | 532 | 532 | **0** |
| `fix/playbook-confirm-viewing-scoped-lead` (#549) | 532 | 532 | **0** |
| `fix/profiles-patch-scoped-client` (#550) | 533 | 533 | **0** |

Ratchet zlyhá len pri novom porušení — nula na všetkých troch. Outreach a playbook vetva dokonca hlásia `Opravené od baseline: 1`.

Druhý krok (`find-dead-exports.mjs`) sa nespustil, lebo skript v repe nie je — workflow ho preskakuje rovnakou podmienkou (`hashFiles(...) != ''`), takže sedí.

## Memory Engine report — PASS

| Krok | Výsledok |
|---|---|
| `npm run brain:typecheck` | exit 0 |
| `npm run brain:test` | 14 pass / 0 fail |
| `brain/decisions/decisions.md` neexistuje (D-2026-08-17-01) | PASS |
| `npm run brain:ingest -- --brain-root <tmp>` | `valid: true`, `validationIssues: 0` |
| `npm run brain:audit` (advisory) | `errors: 0`, warnings 10, infos 27 |

Audit je vo workflowe `continue-on-error: true`, takže warnings job nezhadzujú.

## CI - Revolis.AI / Lint, test, build — čiastočne

| Krok | Výsledok |
|---|---|
| Guard: n8n exporty bez secrets | PASS |
| Guard: stealth lead-gen legal hold (AP-011) | PASS — vercel.json, src aj marketing route |
| `npm run lint` (celé `apps/crm/src`) | 0 chýb |
| `npm test` (vitest) | 1284 pass / 4 fail — tie isté 4 ako na čistom `main` |
| `tsc --noEmit` | 69 chýb na vetve **aj** na `main` → bez zmeny |
| RLS suite proti efemérnej DB | **NESPUSTENÉ** |
| `npm run build` | **NEDOKONČENÉ** |

Dve veci som nahradiť nevedel a treba ich brať ako neoverené:

**RLS suite.** CI si dvíha lokálnu Supabase cez `supabase start`, čo potrebuje Docker. V tomto sandboxe démon nebeží, takže tri RLS testy padajú na chýbajúcu `TEST_SUPABASE_*` — rovnako ako na čistom `main`. V CI by s efemérnou DB bežali zelené; to ale z tohto behu tvrdiť neviem.

**Build.** `next build` spadol na `Failed to fetch font Inter` z `fonts.googleapis.com` — sandbox tam nemá sieť. Padá to v `src/app/(marketing)/landing/page.tsx`, ktorý žiadna z troch vetiev nemení, a spadlo to pri sťahovaní fontu ešte pred kompiláciou zmenených súborov. Takže to takmer isto so zmenami nesúvisí — ale „takmer isto“ nie je zelený build.

## Zhrnutie

Z troch zlyhaných checkov sú dva lokálne nahradené naplno (Code Contract Guard, Memory Engine) a Lint/test/build z väčšej časti. Nič v tomto behu nenaznačuje, že by diffy CI zhodili. Skutočný blokátor je billing, nie kód.

### Founder next
1. Odomknúť GitHub billing na `onlinovosk-bit`
2. Re-run CI na #548 / #549 / #550
3. Merge po zelenom CI (alebo explicitné founder GO na merge s týmto náhradným dôkazom + vedomým rizikom RLS/build)
