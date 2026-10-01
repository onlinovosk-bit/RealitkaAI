# Seed evidence — `2026-09-16-typecheck-paydown-loop`

Zmerané **15. 9. 2026** príkazom `npx tsc --noEmit -p tsconfig.json`
na `origin/main @ c8d24b407c6ea1fa4cc2de98da534713317901c1`.
Worker toto **nepremeriava** — berie ako zmrazený vstup. Odchýlku zapíše do `.ai/bus/inbox/`.

**Spolu: 69 chýb v 21 súboroch.**

---

## 1. Front práce — 17 súborov, 44 chýb

Poradie je záväzné: najprv testy (najnižšie riziko), potom skripty, nakoniec produkčný `src`.

| # | chýb | tier | súbor |
|---:|---:|---|---|
| 1 | 16 | T1 | `apps/crm/src/lib/acquisition/sync/persist/__tests__/persist-sync.test.ts` |
| 2 | 4 | T1 | `apps/crm/src/lib/moat-capture/__tests__/moat-capture.test.ts` |
| 3 | 1 | T1 | `apps/crm/src/app/(public)/buyer-onboarding/__tests__/actions.test.ts` |
| 4 | 1 | T1 | `apps/crm/src/app/api/acquisition/audit-log/__tests__/route.test.ts` |
| 5 | 1 | T1 | `apps/crm/src/app/api/onboarding/session/__tests__/route.test.ts` |
| 6 | 1 | T1 | `apps/crm/src/lib/__tests__/billing-store.test.ts` |
| 7 | 1 | T1 | `apps/crm/src/lib/acquisition/credentials.test.ts` |
| 8 | 1 | T1 | `apps/crm/src/lib/acquisition/sync/keywords.test.ts` |
| 9 | 1 | T1 | `apps/crm/src/lib/acquisition/sync/metrics.test.ts` |
| 10 | 1 | T1 | `apps/crm/src/lib/acquisition/sync/search-terms.test.ts` |
| 11 | 1 | T1 | `apps/crm/src/lib/inbound/__tests__/gmail-pull.test.ts` |
| 12 | 1 | T1 | `apps/crm/src/lib/realvia/processQueue.agency-scope.test.ts` |
| 13 | 10 | T2 | `apps/crm/scripts/inbound-auto-response-smoke-v1.ts` |
| 14 | 1 | T3 | `apps/crm/src/app/api/billing/plan/route.ts` |
| 15 | 1 | T3 | `apps/crm/src/app/api/guardian/open-summary/route.ts` |
| 16 | 1 | T3 | `apps/crm/src/components/revolis/SmolkoChatbotPanel.tsx` |
| 17 | 1 | T3 | `apps/crm/src/lib/demo/synthetic-leads.ts` |

## 2. Mimo slučky — 4 súbory, 25 chýb

| chýb | dôvod | súbor |
|---:|---|---|
| 13 | **FROZEN** — čaká rozhodnutie foundera | `apps/crm/src/app/api/cron/stealth-recruiter-ingest/route.ts` |
| 10 | **FROZEN** — čaká rozhodnutie foundera | `apps/crm/src/app/api/stealth-recruiter/outreach/route.ts` |
| 1 | **FROZEN** — čaká rozhodnutie foundera | `apps/crm/src/app/api/stealth-recruiter/scan/route.ts` |
| 1 | **DEFERRED** — 5 otvorených notification vetiev | `apps/crm/src/app/api/cron/notification-digest/route.ts` |

---

## 3. Rozdelenie podľa typu chyby

| kód | počet | čo to typicky je |
|---|---:|---|
| `TS2345` | 22 | argument nesedí s parametrom — najčastejšie mock vs. skutočný typ |
| `TS2339` | 13 | vlastnosť neexistuje na type (často `never` z prázdneho generika) |
| `TS18047` | 12 | hodnota môže byť `null` — chýba guard |
| `TS2322` | 8 | priradenie nekompatibilného typu |
| `TS18048` / `TS18046` | 6 | `undefined` / `unknown` bez zúženia |
| ostatné | 8 | `TS2556`, `TS2769`, `TS2741`, `TS2739`, `TS2493`, `TS2353` |

`TS18047` a `TS18046` sú takmer vždy opraviteľné pridaním guardu — **ale 12 z nich
je v stealth-recruiter súboroch**, ktoré sú mimo slučky.

---

## 4. Dve položky, na ktoré si dať pozor

### `src/lib/demo/synthetic-leads.ts:149` — nie je to typová oprava

```
TS2739: Type '{ Nový; Teplý; Horúci; Obhliadka; Ponuka }' is missing
        the following properties from 'Record<LeadStatus, string[]>':
        Uzavretý, Stratený
```

Doplnenie tých dvoch kľúčov **zmení dáta**, ktoré funkcia vracia. To je
produktové rozhodnutie o demo obsahu, nie oprava typu.
→ iterácia musí skončiť `BLOCKED` s otázkou, **nie** vymyslenými hodnotami.

### `src/app/api/billing/plan/route.ts:57` — dotýka sa platieb

```
TS2345: Argument of type 'ResolvedBillingPlan' is not assignable
        to parameter of type 'PlanKey | "free"'
```

Billing je citlivá plocha. Ak oprava vyžaduje čokoľvek viac než zúženie typu,
`BLOCKED`. Slučka nemá mandát meniť, ako sa určuje plán.

---

## 5. Kontext, ktorý platí aj pre tento beh

| fakt | dôsledok |
|---|---|
| `next.config.js` má `ignoreBuildErrors: true` | tých 69 chýb dnes nikto nevidí; build ich prehltne |
| `main` má 36 známych zraniteľností (2 critical, 18 high) | **nie je to úloha tejto slučky** — žiadne `npm audit fix` |
| CI guard proti stealth lead-gen nepokrýva `recruiter` v `apps/crm/src` | preto tie 3 súbory vôbec existujú; rozhodnutie je founderovo |
| za 30 dní do 14. 9.: 88 zmergovaných PR vs. 3 nové aktivity v produkcii | dôvod, prečo je `MAX_OPEN_PRS = 3` a nie „koľko stihneš" |
| `ruflo@latest` = `3.41.4` = `alpha` | pravdepodobná príčina dvoch zlyhaní `swarm_init` |

---

## 6. Čo tento balík zámerne nemeria

- neoveril, či sa niektorá oprava typu dotkne správania za behu — to je práca testov v acceptance
- nepremeral znova 36 zraniteľností `npm audit` (posledné meranie 15. 9.)
- neoveril, či je `#554` zmergovaný — **to je prvý krok W0**
