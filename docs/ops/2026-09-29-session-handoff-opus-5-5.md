# Session handoff — 29.9.2026, prechod na Opus 5.5

Kontext na prenesenie do novej Claude Code session. Skopíruj celý súbor
do prvej správy nového chatu.

**Prečo nový chat a nie prepnutie modelu:** cache je viazaný na model, takže
prepnutie uprostred session zahodí cachovaný prefix a prvý turn zaplatí celú
doterajšiu históriu za plnú vstupnú cenu. Predchádzajúca session bola navyše
veľmi dlhá a história sa posiela znova pri každom turne. Úspora z prepnutia
modelu je ~20 % (Opus 5.5 $4/$20 za 1M vs Opus 5 $5/$25); úspora zo zahodenia
histórie je rádovo väčšia.

**Na sledovanie:** v API má Opus 5.5 default `effort: medium`, kým Opus 5 mal
`high`. Či to Claude Code nastavuje explicitne, nie je overené. Ak budú
odpovede menej dôkladné, kompenzuj to zadaním.

---

## Ako pracujem (z CLAUDE.md, dodržuj)

- **GO brány.** Nezačínam žiadnu úlohu bez explicitného „GO". Na konci turnu
  navrhnem JEDNU ďalšiu úlohu s bránou.
- **Steny, nie skrutky.** Jeden hotový blok naraz, vrátane dôkazu. Žiadne
  priebežné mikro-updaty.
- **Mutation proof je štandard.** Guard sa dokazuje tak, že sa dočasne rozbije
  (červená), potom vráti (zelená). Zelený test sám o sebe nie je dôkaz.
- **Nikdy nemergujem PR.** PR zakladám ako draft; merge robí founder. Žiadny
  force-push, žiadne obchádzanie branch protection.
- **PRIME DIRECTIVE.** Ak funkcionalita nezvyšuje šancu na ďalšieho platiaceho
  klienta alebo retenciu, je to pravdepodobne zlá investícia.
- **Stealth Mode.** Reality Smolko je referenčný klient — nespomínať verejne
  ani v marketingu bez súhlasu, nezdieľať ich dáta externe.
- Vetva na vývoj: `claude/upbeat-davinci-t8zjo8` (plus jednorazovo schválené).

## Bezpečnostné konštanty (nikdy neporušiť)

- `REVOLIS_BUS_TOKEN`, GitHub PAT a `STRIPE_SECRET_KEY` NIKDY do repa, .md,
  OpenAPI, GitHub issue/PR, promptu ani BUS správy. Len env var / host secret
  store.
- Tokeny nikdy ako CLI flag (shell history + process list).
- **Žiadny agent nevytvára Stripe Products/Prices.** Price IDs pochádzajú zo
  Stripe live mode a píše ich founder.

## Čo je hotové (stav 29.9. ráno)

`main` = `0cf2b528`. Trieda **fail-open tenant gate je uzavretá — 14 brán:**

| zdroj | obsah |
| :--- | :--- |
| `#730` (cudzia práca) | 9 brán cez zdieľaný `sameAgency()` v `apps/crm/src/lib/tenant-scope.ts` |
| `#734` | oprava `api/invite/route.ts` (#447) |
| `#736` | 6 per-route testových súborov, 30 testov, asercie na side-effect |
| `#737` | 2 brány, ktoré `#730` minul: `ai/lead-events:55`, `ai/process-lead:48` |

`#734` okrem stampnutia `agency_id` + `auth_user_id` rieši aj: chyba zápisu sa
číta (500 namiesto `ok:true`), 403 pre volajúceho bez agentúry, 409 na e-mail
patriaci inej agentúre, `role` obmedzená na `INVITABLE_ROLES`.

`#447` a `#486` zavreté s odkazmi. Skôr v session: revert rozbitého `#370`,
oprava CI determinizmu.

## Otvorené

1. **CHECKOUT-ENV-01 krok A** — read-only Stripe VERIFY. **GO už dané,
   nezačaté.** Vyžaduje `sk_live_` kľúč → founder-only, agent ho nesmie vidieť.
   Tiket `memory/open-tasks.md:13`, kit `docs/ops/2026-09-21-stripe-verify-kit.md`.
   Jediná vec blokujúca self-service príjem.
2. **`Lint, test, build` nie je required check.** 28.9. sa tri PR zmergovali na
   nesparsovateľný `main`; `#370` prešiel s nepravdivým „24 passed". Fix je
   nastavenie branch protection — agent naň nemá prístup. BRÁNA: founder.
3. **Ratchet hlási „zníž strop 54 → 49"** (`apps/crm/scripts/typecheck-baseline.mjs`).
   Drobnosť.

## Draho zaplatené poučenia — neopakovať

- **`lead_assignment_rules` NEMÁ stĺpec `agency_id`**
  (`20260925210000_baseline_prod_only_tables.sql:234`). `automation/rules/[id]`
  je zámerná výnimka v `ALLOWED` v
  `tests/verification/tenant-failopen-sweep.verification.test.ts`, strážená
  rot-guardom. Migráciu rieši `#490`. **Nesiahať** — pokus o opravu guard
  správne zhodil.
- **Tento repo vyžaduje aktuálnu vetvu pred mergom.** `mergeable_state: "behind"`
  blokuje founderovi merge aj bez konfliktu. Vždy dorovnať cez
  `git merge origin/main` (NIE rebase).
- **`git checkout origin/main -- .` prepíše aj vlastné zmeny**, nielen konflikt.
  Raz to zmazalo hotovú prácu.
- **Zlé rozuzlenie merge konfliktu dvakrát vyrobilo nesparsovateľný `main`**
  (duplicitné `if` s nedovretými zátvorkami). Po každom merge spustiť
  `npm run lint` lokálne, kým sa pushne.
- **Grep nestačí na audit brán.** Raz unikol guard s netypickým názvom
  (`requirePlatformAdmin()`), inokedy bola telemetria (`recommendations/[id]:82`)
  označená za autorizačnú bránu. Čítať súbor.
- **Pred fail-closed overiť nullability v migráciách** — inak 403 na legitímne
  riadky.
- Overovanie v `apps/crm`: `npm run lint`, `npx vitest run <cesty>`,
  `node scripts/typecheck-baseline.mjs`.

## Ďalší krok

CHECKOUT-ENV-01 krok A — pripraviť všetko, čo nevyžaduje live kľúč (checklist
a skript pre foundera + následné zmeny kódu). Samotné VERIFY spúšťa founder.
