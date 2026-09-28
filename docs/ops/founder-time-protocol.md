# Founder Time Protocol — zrušenie procesnej dane

**Dátum:** 2026-09-18 · **Stav:** NÁVRH + TRIAGE (founder GO 2026-09-18, S8) · **Engineering:** 0 €
**Nadradené:** `docs/sales/gtm-playbook-2026-09-18.md` §2/S8
**Snapshot:** 54 otvorených PR, odčítané z GitHub API 2026-09-18

> Jediný zdroj, ktorý sa nedá kúpiť, je founderov čas. Tento dokument ho vracia do predaja.

---

## 1. Oprava môjho vlastného odporúčania

V playbooku som navrhol *„definovať auto-merge lane"*. **To bolo nepresné — lane už existuje.**

`docs/AUTOMERGE-POLICY.md` v1.0 (2026-06-12) + `.github/workflows/auto-merge-policy.yml`
+ `.github/scripts/automerge-policy.mjs` sú v repe a Tier 1 (okamžitý squash merge) už dnes
pokrýva `docs/**` a `**/*.md`.

**Skutočné hrdlo je inde.** Viď §2 a §3.

---

## 2. Nález A — 44 % otvorených PR sa nedá zmergovať z definície

| Kategória | Počet |
|---|---:|
| Otvorené PR celkom | **54** |
| Z toho **draft** | **24** (44 %) |
| Non-draft | 30 |
| Najstarší otvorený PR | **#155, 2026-06-09** (101 dní) |

Draft PR **nemôže zmergovať ani robot, ani človek** — GitHub to neumožní. Tie PR teda nečakajú
na kapacitu foundera; čakajú na jeden klik „Ready for review", ktorý nikto neurobil.

To je iná diagnóza než „nestíham merge-ovať" a má iné riešenie.

---

## 3. Nález B — tri PR s labelom `automerge` sú otvorené 99 dní

`#189`, `#191`, `#192` nesú label `automerge` od 2026-06-11 a stále sú otvorené.

Znamená to jedno z troch — **a ja neviem ktoré, lebo som ich CI neoveril:**
1. robot nebeží (workflow zlyháva alebo nemá práva),
2. PR nespĺňajú podmienku „up to date s `main`" (po 99 dňoch takmer isté),
3. required check `Lint, test, build` je na nich červený.

**Overenie je jeden pohľad na check-runs týchto troch PR.** Kým sa neurobí, netvrdím,
že robot je pokazený — tvrdím len, že label nestačil.

---

## 4. Triage 54 otvorených PR do troch kôp

> **Varovanie:** triage je urobený z **názvov PR, nie z diffov.** Pred akýmkoľvek hromadným
> konaním over aspoň kopu 1. Toto je návrh poradia, nie rozsudok.

### Kopa 1 — BLOKUJE ZÁKAZNÍKA (18 PR)

Tenant izolácia, strata dát, auth, PII. Toto je jediná kopa, kde omeškanie stojí dôveru
platiaceho klienta.

| PR | Čo rieši | Draft? |
|---|---|:--:|
| #304 | password reset cez `/auth/callback` | — |
| #370 | credits lost-update race (atomic RPC) | **D** |
| #371 | legacy webhook prepisuje platené tiery na free | — |
| #438 | fail-closed proxy auth pri `getUser` timeout | — |
| #439 | uvoľnenie dedup claim pri zlyhaní insertu | — |
| #443 | scoped Supabase do property mutácií | **D** |
| #444 | matching recalculate — strata dát (2 HIGH) | **D** |
| #447 | `agency_id` na profiloch z team invite | — |
| #459 | onboarding MVP — neautentizované PII | **D** |
| #462 | auth-email recovery scope na volajúcu agentúru | **D** |
| #486 | fail-closed HubSpot/analyze tenant gate | **D** |
| #490 | cross-tenant wipe v assignment rules | **D** |
| #495 | fail-closed inbound-lead webhook (tichý drop leadu) | **D** |
| #537 | notification-digest maže unread iným tenantom | **D** |
| #545 | buyer-onboarding — tichý drop tasku | **D** |
| #563 | sales-funnel gate na platform admin (PII) | — |
| #579 | capability-URL session hardening | **D** |
| #582 | fail-closed scheduled-events free/busy | **D** |

**12 z 18 je draft.** To je jadro problému: najkritickejšie opravy sú v stave,
z ktorého sa nedá mergovať.

### Kopa 2 — BLOKUJE PREDAJ (7 PR)

| PR | Prečo je v predajnej ceste | Draft? |
|---|---|:--:|
| #437 | **DB ALTER `leads.last_contact_at`** — bez toho nefunguje ranný zoznam (S6) ani Zhluk 1 | — |
| #189 | onboarding wizard — prvý dojem klienta | — |
| #186 | nehnutelnosti.sk import — segment B integrácia | — |
| #361 | broker UI pre listing generator | — |
| #363 | štyri štýlové varianty inzerátu | — |
| #581 | Concierge W1 exekúcia | **D** |
| #580 | Concierge prompt stacks | **D** |
| #578 | `ignoreCommand` — zmiešané commity sa nebuildujú | **D** |

`#437` je podľa politiky **Tier 3** (migrácie sú na denylist) → merge len ručne, s preflightom.

### Kopa 3 — OSTATNÉ (29 PR) — kandidáti na zatvorenie

`#155 #191 #192 #198 #326 #351 #357 #358 #360 #362 #364 #365 #366 #393 #426 #433 #441 #442
#460 #475 #480 #544 #576 #577 #585 #587 #589`

Prevažne docs, cursor rules, nočné reporty a audity z júna–augusta. Väčšina je historický
záznam, ktorý už splnil účel tým, že vznikol.

**Otázka pre foundera:** čo z kopy 3 má ešte hodnotu otvorené? Predpokladám, že skoro nič —
ale nezatváram nič bez tvojho slova.

---

## 5. Navrhnutý rytmus (nie viac procesu — menej)

| Kedy | Čo | Koľko |
|---|---|---|
| Denne, jedno okno | merge kopy 1 + 2 (nie priebežne počas dňa) | 30 min |
| Týždenne, pondelok | prehodiť draft → ready všetko z kopy 1, čo je hotové | 15 min |
| **Týždenne, blok v kalendári** | **výhradne hovory so zákazníkmi — neprenosné** | **min. 4 h** |
| Mesačne | moat revízia podľa Ústavy §Mesačná revízia | 30 min |

Ten 4-hodinový blok je jediná položka, ktorá priamo plní Prime Directive. Ostatné tri
existujú preto, aby ho chránili.

---

## 6. Čo potrebuje tvoje rozhodnutie

1. **Kopa 3 — zatvoriť?** (áno / vyber výnimky / nie)
2. **Drafty v kope 1 — prehodiť na ready?** 12 PR; ak áno, urobím to v jednej dávke.
3. **Overiť robota** na `#189/#191/#192` — mám sa pozrieť na ich check-runs a zistiť,
   ktorá z troch možností v §3 platí?
4. **`#437`** — je `leads.last_contact_at` migrácia pripravená na PROD? Bez nej stojí S6.

**Nič z toho nevykonávam bez tvojej odpovede.** Hromadné zatváranie PR a prehadzovanie
draft→ready sú akcie s následkami, nie docs.
