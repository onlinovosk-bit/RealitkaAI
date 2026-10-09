# Plán agentných vĺn — 2026-10-09

> Stav: **PLÁN + Vlna 0 (read-only audity) hotová.** Nič z Vlny 1+ sa nespustilo. Žiadny merge, PROD zásah, odoslanie správ ani zápis do Stripe.
> Dôkazy z Vlny 0 sú statická kontrola repa (HEAD `c302e47`). Stav PROD je všade **UNVERIFIED**, kým ho niekto nepreverí read-only dotazom.
> Prompty: RAU P00–P23 (`docs/rau/prompts/`). Leverage track L01–L05 sa nepoužíva (Ústava v2: REJECT, skóre ≈ 2/12).

## 1. Rozhodnutia foundera (2026-10-09)

| Téma | Rozhodnutie |
|---|---|
| Platiaci klienti | **1 platiaca kancelária** (nie 3). Žiadne rozhovory s tromi kanceláriami. |
| Cenník | Platí draft #822 (Start 25 / Team 60 / Kancelária 149 / Sieť 349+, kredity) **ako vstup**. Ceny, Stripe a billing sú **mimo nočných vĺn** (Stena 0 rieši founder s Grok Botom). |
| Rozsah noci | Plán + Vlna 0 read-only. |
| Oblasti | Všetky štyri: vstup (dopyty + Realvia), akcia (AI návrh + follow-up), demand a matching, dôvera (tenant a prehľady). |
| Výskum | WebSearch (Firecrawl je v cloude zablokovaný sieťou). |

## 2. Čo Vlna 0 zistila (skrátene, každé s dôkazom)

### Vstup dopytov + Realvia
- Príjem e-mailu → lead je v kóde (`api/acquire/email/route.ts:236,376`), ale Gmail pull je **vypnutý** kým nie je `GMAIL_INBOUND_PULL_ENABLED=true` (`lib/inbound/gmail-pull.ts:269`). Reálny portálový mail v systéme: **NEZNÁME**.
- `inbound_mail_outcomes` má writera (`mail-outcome.ts:79`), ale **žiadneho readera** mimo testu. Nikto nevidí, prečo mail nevytvoril lead.
- **Realvia nie je zdroj dopytov.** Webhook nesie ponuky (`advert`, `delete`), v `processQueue.ts` nie je lead handler; `/api/realvia/import` len loguje (`route.ts:29-35`). Mapa zdrojov (`master-data-sourcing-map.md:125`) to potvrdzuje. Persistovanie XML importu je preto **BACKLOG**, nie stavba.
- Worker `realvia-process` nemá v repe spúšťač (externý cron, stav **NEZNÁME**).

### Akcia: AI návrh + odoslanie + follow-up
- Triage a draft odpovede sú LIVE; odoslanie ide cez `approve-draft.ts:151` → `authorizeSend` (UNVERIFIED na PROD).
- **Tri cesty obchádzajú `authorizeSend` a kill switch:** `api/ghostwriter/send-email`, `api/playbook/confirm-viewing`, šablónová auto-odpoveď (`lib/acquire/inbound-lead-auto-response.ts:81`, default `autoResponseEnabled = true` napriek zápisu „opt-in“ v decisions.md). Rozhodnutie o auto-odpovedi je foundera.
- Follow-up sweep je LIVE ako **iba návrhy** (`route.ts:44-45`), ale „stale“ = dlho needitovaný lead (`updated_at`), nie dlho nezodpovedaný dopyt. Pole prvej reakcie v kóde **nenašli**. „Strážca follow-upu“ preto dnes neexistuje.
- `agent-specs.ts` má 4 agentov s DO-NOT-DO; ghostwriter, guardian, morning-brief a auto-odpoveď z `lib/acquire` spec **nemajú**.

### Demand a matching
- `lead_demands` + `demand_property_matches`: migrácie a RLS sú v repe (`20260929120000`, `20260930120000`), v PROD podľa STATUS **chýbajú**. Extrakcia a matching sú za flagmi `DEMAND_EXTRACTION_ENABLED` / `DEMAND_MATCHING_ENABLED`; matching je deterministický (`lib/demand/match.ts:178`), UI karta je hotová.
- Dopyt **neprichádza z Realvie**; jediný zdroj je text správy z `acquire/email`, ktorý nemá riadok v mape zdrojov (otvorená neznáma podľa pravidla 4).
- **BRI:** `lib/ai/l99-engine.ts:75-80` nahrádza chýbajúce vstupy konštantou 50. `docs/audit/bri-diagnostic.md` kalibruje **iný** engine (`domain/buyer-readiness`). Kalibrácia voči reálnym obchodom neexistuje; pri 1 kancelárii ju ani nemožno spraviť (n < 30 = indikatívne).
- GDPR: extrakcia ide cez Anthropic, BRI posiela GPT-4o meno leadu. DPA/oznámenie klientovi pred zapnutím je **UNVERIFIED**.

### Dôvera: tenant a prehľady
- **Fiktívne 180 000 €** je stále v `lib/forecasting-store.ts:91` a `lib/workdesk/forecast-signals.ts:56`; fallback 18 400 € v `components/team/TeamActionStrip.tsx:25` (`DEMO_SIGNALS`). Fallback 124 k € v kóde nenašli.
- STATUS hovorí „28 z 40 ciest zavretých“, decisions.md „27 z 40“, **zoznam 40 ciest neexistuje**. Z 232 `route.ts` je ~41 bez rozpoznanej brány (heuristika agenta, nie dôkaz zraniteľnosti).
- Politiky s `agency_id IS NULL` existujú v migráciách (`bri_history_tenant`, `priority_alerts_tenant`, `leads` podselect); PROD stav je UNVERIFIED.
- Retencia 90 dní pre `inbound_mail_outcomes` nebeží (STATUS:31).

### Výskum trhu (WebSearch, bez čítania cieľových stránok)
Produkty: Follow Up Boss, Lofty, Sierra Interactive, Cloze, kvCORE, Reapit, onOffice. Všetky AI tvrdenia sú **marketingové**, ceny z tretích strán sú **NEOVERENÉ**; pred rozhodnutím ich treba overiť u vendora.
- Opakujú sa tri vzory: (1) skórovanie leadov podľa správania, (2) automatický follow-up, (3) AI zhrnutie a automatický záznam komunikácie.
- Pre malú SK kanceláriu pravdepodobne nemá zmysel: round-robin routing, IDX/MLS weby, hromadný outbound (GDPR/ePrivacy).
- Slovenské ani české CRM s natívnou AI **nenašli** (NEZNÁME).
- Reapit tvrdí trénovanie na vlastnej histórii kancelárie, čo je dobrý GDPR argument; nepotvrdené, čo reálne vyšlo.

## 3. Nesedí / čaká na foundera (agenti to nerobia)

1. **Stripe krok C** (ceny na live účte), priorita #1.
2. Gmail: OAuth klient, env (`GMAIL_INBOUND_PULL_ENABLED`, `GOOGLE_GMAIL_INBOUND_*`, `ACQUIRE_SHARED_SECRET`, `CRON_SECRET`), GitHub secrets, štítok + filter, súhlas klienta (DPA dodatok #813).
3. Resend DNS + reply-to + súhlas s odosielaním.
4. Rozhodnutie: auto-odpoveď opt-in vs. opt-out; SLA pre „dopyt bez reakcie“ (otvorené: 4 h?).
5. Oznámenie klientovi o Anthropic/GPT-4o pred zapnutím demand extrakcie.
6. Zosúladiť údaje: **1 platiaca kancelária vs. MRR 597 € z 3 kancelárií** (`DEC-20260925-001`), STATUS „0 z 10 cien“, 27 vs. 28 z 40, a **#822 sa medzi otvorenými PR nenašiel** (over, či existuje a pod akým číslom).
7. Externý cron pre `realvia-process` (kto ho spúšťa?).

## 4. Vlny a pracovné balíky

**Pravidlá pre všetkých:** len vetvy a draft PR; **žiadny merge, PROD zápis, odoslanie, secrets ani Stripe**. Stav dôkazu v odovzdaní je najviac `TESTED`; `VERIFIED` udelí nezávislý P11. Každý balík sa začína write-probe (`git diff --name-only` voči otvoreným PR) a Ústavou v2 (P02); výsledok BUILD/BACKLOG sa zapíše do `decisions.md`. **Navrhované zaradenie nižšie je predbežné, nie formálne 12-otázkové skóre.**

### Vlna 1 (paralelne, párovo disjunktné write-sety)

| ID | Agent | Balík | Prompt stack | Write-set | Hodnota (mechanizmus) |
|---|---|---|---|---|---|
| WP-1 | A | **PRAVDIVÉ-ČÍSLA:** odstrániť 180 000 €, skontrolovať DEMO_SIGNALS; pri chýbajúcich dátach stav „vypočítané z {zdroj}“ | FAST: P00→P01→P03→P10→P11→P15 | `apps/crm/src/lib/forecasting-store.ts`, `apps/crm/src/lib/workdesk/forecast-signals.ts`, `apps/crm/src/components/team/TeamActionStrip.tsx` + ich testy | Platiaci klient nesmie vidieť vymyslené eurá (retencia) |
| WP-2 | B | **SEND-GATE:** ghostwriter a confirm-viewing cez `authorizeSend` + kill switch | STANDARD: P00→P01→P03→P05→P10→P11→P13→P14→P15 | `apps/crm/src/app/api/ghostwriter/send-email/**`, `apps/crm/src/app/api/playbook/confirm-viewing/**` + testy | Jediná brána pre nevratné akcie (Tier 3) |
| WP-3 | C | **MAIL-OUTCOMES-READER:** čitateľ + tenant-gated trasa „prečo mail nevytvoril lead“ | STANDARD: P00→P01→P03→P05→P06→P10→P11→P14→P15 | nové: `apps/crm/src/lib/inbound/mail-outcome-reader.ts`, `apps/crm/src/app/api/inbound/outcomes/**` + testy | Prvý reálny portálový dopyt sa dá diagnostikovať |
| WP-4 | D | **ROUTE-GATES:** skript, ktorý vypíše všetkých 232 trás → stav brány | HARDENED (len čítanie): P01→P14 | `scripts/ops/route-gates.mjs`, `docs/audit/route-gates.md` | Skutočný zoznam namiesto „28 z 40“ |
| WP-5 | E | **FOLLOWUP-GUARD:** len návrh (kontrakty a agent spec), **žiadny kód** | STANDARD: P02→P03→P04→P06→P07→P08 | `docs/rau/contracts/followup-guard/**` | Krok „Lead → Telefonát“: dopyty bez reakcie; vyžaduje odpoveď na SLA |
| WP-6 | F | **PROD-BALÍKY:** SQL + overovací skript, **neaplikovať** (aktivácia demand tabuliek; zatvorenie `agency_id IS NULL` politík; dôkaz pred aj po) | HARDENED: P01→P05→P14, príprava P16/P17 | `docs/ops/prod-packages/**` | Odblokuje demand a tenant bez improvizácie na PROD |

**Dôkaz disjunktnosti (zoznam ciest):** WP-1 (lib/forecasting-store, lib/workdesk, components/team) ∩ WP-2 (api/ghostwriter, api/playbook) ∩ WP-3 (lib/inbound/mail-outcome-reader + api/inbound/outcomes — nové súbory) ∩ WP-4 (scripts/ops, docs/audit) ∩ WP-5 (docs/rau/contracts) ∩ WP-6 (docs/ops) = **∅**. Konflikty s otvorenými PR: #819 (`claude/gmail-connect`), #816 (Realvia credentials), #813 (DPA), #806 (audit platieb), #793 (env), #785 (starter pack). Žiadny balík do ich oblastí nezasahuje; **WP-3 pred štartom overí**, že #819 nepridáva tie isté súbory v `lib/inbound/`.

### Vlna 2 (po tom, čo founder zmerguje príslušné PR Vlny 1)

| ID | Balík | Predpoklad |
|---|---|---|
| WP-7 | **BRI-HONEST-INPUTS:** konštanta 50 → `null`/NEZNÁME; eval harness P12 s predom určenými prahmi, výstup „NEMERANÉ“ pre náklady | WP-1 zmergovaný; kalibrácia pri n=1 kancelárii len indikatívna |
| WP-8 | **FOLLOWUP-GUARD-BUILD:** nový `lib/followup-guard/**`, len návrhy (Tier 0/1) | WP-5 schválený + odpoveď na SLA + rozhodnutie podľa Ústavy v2; write-set sa potvrdí v P09 |
| WP-9 | **RETENCIA-90D:** cron + migrácia pre `inbound_mail_outcomes` | Jediný balík, ktorý smie meniť `vercel.json` (sériovo po WP-8) |
| WP-10 | **ROUTE-GATES-CLOSE:** po 5 trás na PR podľa WP-4, fail-closed, test zakázaného správania | WP-4 zmergovaný |

### Vlna 3
P12 evals, P13 red team a P14 pre WP-8, bránky P15–P17, **P18 DEPLOY len s tvojím výslovným GO**, P22 zápis do pamäte (PREPEND), P23 ďalšia vlna.

### Zámerne BACKLOG (zdôvodnenie)
- Persistencia `/api/realvia/import`: Realvia nie je zdroj dopytov a #816 mení `lib/realvia/`.
- Generátor popisov, staging, preklady: komodita, Realvia ich má (scrape 9. 10.).
- Lead routing, IDX/MLS, hromadný outbound: nesedí pre SK kanceláriu a GDPR.
- Predikcia výsledkov kancelárie („Revenue Control Tower“): nič nehovorí, že niekto zaplatí; max VALIDATE.

## 5. Grok Bot — zadanie

> Si výskumník pre Revolis.AI. Bez prístupu k repu. (1) Over na oficiálnych stránkach dodávateľov (Follow Up Boss, Lofty, Cloze) tieto tvrdenia: ktoré AI funkcie sú v základnej cene, ktoré v príplatku, verejná cena. Každé tvrdenie uveď s URL a dátumom, nezistené označ NEZNÁME. (2) Navrhni 3 varianty textu pre kartu „Dopyty bez reakcie“ (slovensky, začni VÝSLEDKOM pre makléra, bez slova „AI“ v nadpise, bez pomenovania referenčného klienta). (3) Zostaň pri Stene 0 (cenník, draft #822): over, či PR #822 existuje a aké číslo má, a ktoré tri body zostávajú otvorené (onboarding 0/99 €, balíky mesačne vs. jednorazovo, správanie pri minutí kreditu).

## 6. Otvorené otázky

1. Pod akým číslom je PR s cenníkom (#822 medzi otvorenými PR nie je)?
2. SLA pre „dopyt bez reakcie“ (4 h?).
3. Auto-odpoveď: opt-in alebo opt-out?
4. Ktoré PROD údaje (počet leadov, aktívne agentúry, existencia tabuliek) smie WP-6 čítať read-only?

## 7. Výsledky Vlny 1 (2026-10-09, všetko zmergované do `main` na „merguj blok 1")

| WP | PR | Stav | Čo ostáva |
|---|---|---|---|
| WP-1 | #836 | TESTED, v `main` | WP-1b: UI `ForecastRiskStrip`/`pipeline-forecast-panel` ukáže „0 EUR"; `DEFAULT_TARGET_PIPELINE` |
| WP-2 | #838 | TESTED, v `main` | Nové action ID v registri; dvojklik bez claimu |
| WP-3 | #837 | TESTED, v `main` | UI + retencia (Vlna 2); neoverené na živej DB |
| WP-4 | #839 | TESTED, v `main` | Prepočítať po #837 (233 trás); manuálne P14 na 6 + 8 trás |
| WP-5 | #840 | dokumenty, v `main` | Verdikt BACKLOG; rozhodnutie o WP5-FG-0 (merať) |
| WP-6 | #841 | dokumenty, v `main` | `GO VERIFY-PROD` a rozhodnutie o poradí A→B |

Korekcie auditu Vlny 0: prvá reakcia existuje ako `lead_events.contact_attempted`; `agent-specs.ts` má 7 agentov; `engine.ts` follow-upu má natvrdo meno referenčného klienta (porušuje pravidlo 2).
CI nachytalo dve chyby orchestrácie (chýbajúci `incrementUsageMetric`, rozbitý mock v existujúcom teste), obe opravené pred mergom.
