# Triáž PR backlogu #2 (PR-BACKLOG-TRIAGE-2)

**Dátum:** 2026-10-01 · **Brána:** `GO PR-BACKLOG-TRIAGE-2` · **Referenčný `main`:** `420f4afa`
**Rozsah:** iba meranie. Nič sa nemergovalo ani nezatváralo. Zavrieť/zmergovať je founderov úkon.

## Metóda
Rovnaká ako 28. 9.: mergeovateľnosť cez `git merge-tree --write-tree origin/main <head>` (nie `git diff`),
platnosť cez čítanie kódu na `origin/main`. Prvé kolo meralo na plytkom klone a `merge-tree` vracal
`rc=128` (bez merge-base) — klon som doplnil (`--unshallow`) a meral znova. Čísla nižšie sú z druhého merania.

Otvorených je 25 PR (nie 29 z handoffu; 2 sú dnešné: #775, #776). Triáž z 28. 9. pokrýva #490…#475,
tu sú **zvyšné** + prehodnotené #495/#443.

## Rozpor s handoffom
Handoff tvrdí, že #495 a #443 triáž **neoznačila**. Označila: oba „ČIASTOČNE PREKONANÉ"
(`2026-09-28-pr-backlog-triage.md`). Nižšie ich preverujem znova proti dnešnému `main`.

## A. Opravy, ktoré platia dnes
| PR | zistenie na `main` | merge | odporúčanie |
|---|---|---|---|
| **#495** | `process-lead.ts:95` stále `bri?.new_score ?? 50` → zlyhaný BRI spustí auto-odpoveď (prah 40) | **konflikt** v `process-lead.ts` (zavinil #765) | **nemergovať celok**; vyrezať 1 riadok (`?? 0` + podmienka `!bri`) |
| **#443** | **Korekcia triáže z 28. 9.:** nie sú to „2 riadky". `POST /api/properties` volá `createProperty({...})` **bez** scoped klienta a vracia holý objekt (UI čaká `data.ok`); `matching/action` volá `getProperty`/`getLeadById` bez klienta; `getLeadById(id)` scoped klienta vôbec neprijíma. `PATCH`/`DELETE` sú opravené | konflikt iba `memory/` | **PLATÍ čiastočne (3 miesta)**; preniesť ručne, nie mergovať 135-commitov starú vetvu |
| **#304** | `reset-password/page.tsx` stále robí `exchangeCodeForSession(code)` na klientovi (komentár „legacy"); redirect na `/auth/callback` tam nie je | konflikt v `auth-email-tests/route.ts` (zasiahol #767) | **PLATÍ pre `?code=`**; prenos ručne. Súčasť riešenia (TokenHash šablóna v Supabase) je founderova |

## B. Prekonané / už na `main` — kandidáti na zavretie
| PR | dôkaz |
|---|---|
| **#155** vercel ignore | `apps/crm/vercel.json` na `main` už `ignoreCommand` má (sofistikovanejší) → **ZAVRIEŤ** |
| **#360–#365** (reťaz listing generátora, 6 PR) | `inzerat-generator`, `listing-content/{generations,stream}`, `generations-store.ts` sú na `main`; reťaz je stacked na `feat/listing-gen-variants`, konflikty v code-contract-guard. `listing-variants` na `main` nie je → **štyri štýly sú jediný zvyšok**; reťaz **ZAVRIEŤ**, prípadný variants-feature nová brána |
| **#191** founder metrics M2 | stacked na `feat/founder-metrics`; dashboard je na `main`, `metrics/export` nie → export CSV je jediný zvyšok; **VALIDATE** (platil by ho niekto? Constitution) |
| **#358** dead-export check | `find-dead-exports` na `main` nie je, ale `code-contract-guard.yml` áno; 3 súbory, čistý merge → **rozhodnutie: CI ratchet, merge nízkeho rizika po `prepush-gate`** |

## C. Funkcie, ktoré na `main` nie sú — rozhodnutie je produktové (Constitution gate)
| PR | stav | poznámka |
|---|---|---|
| **#198** DFY order bump | `STRIPE_PRICE_MIGRATION_DFY`, `service_orders` na `main` nie sú; konflikt aj v `checkout-config/route.ts` | Tier-3, platí sa tým až po `CHECKOUT-ENV-01` → **BACKLOG** |
| **#192** notifications inbox | na `main` nie je; konflikt `WorkdeskTopbar.tsx` | 773 commitov za `main` → BACKLOG alebo prepísať |
| **#189** onboarding wizard | na `main` nie je; flag OFF | BACKLOG (aktivácia), 773 za `main` |
| **#186** nehnutelnosti.sk import | parser na `main` nie je (len logá) | **GDPR gate** pred akýmkoľvek mergom (osobné údaje kontaktov), BACKLOG |

## D. Dokumenty / admin (bez kódu)
`#433, #426, #393, #366, #351` — čisté, docs-only (#366 a #433 sú diagnostické správy, #393 write-probe, #426 nočný report, #351 poznámka k IČO). Hodnota minimálna; **#393 ZAVRIEŤ** (write-probe už splnil účel), ostatné zmergovať alebo zatvoriť podľa toho, či report chceš v repe.
`#357` (.cursor rule, čistý), `#326` (VEOS docs, konflikt v `package.json`; VEOS docs na `main` už sú → **ZAVRIEŤ**).

## E. Moje vlastné a dnešné
`#774` MAILBOX-LOG-FIX: konflikt iba `memory/` (rieši sa dorovnaním, vyber kotvu podľa obsahu). `#775` handoff memory: čistý. `#776` CHECKOUT-DIAG-01: tento.

## Zhrnutie
- **Zavrieť (9):** #155, #326, #393 a reťaz #360–#365.
- **Preniesť ručne ako samostatné malé brány (3):** #495 (1 riadok), #443 (3 miesta), #304.
- **BACKLOG / VALIDATE (5):** #198, #192, #189, #186, #191.
- **Docs:** #433, #426, #366, #351, #357, #358 podľa chuti.

## Navrhnutá ďalšia brána
`GO PORT-443` — scoped klient do `POST /api/properties`, `matching/action` a `getLeadById` (v dnešnom prehľade je to
jediná platná chyba, ktorá reálne láme zápis nehnuteľností pod RLS). Alternatíva: `GO PORT-495` (1 riadok, fiktívne BRI).
