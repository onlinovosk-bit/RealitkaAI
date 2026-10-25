# P03 — EXECUTION CONTRACT: Strážca follow-upu (WP-5)

> Stav: NÁVRH na schválenie. Kontrakt nič neimplementuje. Dve fázy: **Fáza 0** (merať, odporúčané)
> a **Fáza 1** (EXTEND Guardian, ZAMKNUTÁ do splnenia odomykacích podmienok z P02).

## FOUNDER BRIEF (12 riadkov)

1. **Čo:** zistiť, či dopyty čakajú na prvú reakciu dlhšie než X hodín, a až potom rozhodnúť o strážcovi.
2. **Prečo teraz:** zadanie WP-5; ale Ústava v2 Q8 hovorí „príliš skoro" (dáta chýbajú), preto stavba čaká.
3. **Čo je hotové v kóde:** substrát `contact_attempted` + tlačidlá Volať/E-mail na detaile leadu; Guardian s pravidlami a nálezmi.
4. **Čo chýba:** jednotný zapisovač reakcie (Action Queue a schválený návrh ho nezapisujú), overený PROD stav, schválené X.
5. **Cena Fázy 0:** 1 už pripravená migrácia (Tier 3, tvoje GO) + 1 rozhovor s kanceláriou + čítacie dotazy. Čas: NEMERANÉ.
6. **Cena Fázy 1:** odhad malý (PREDPOKLAD), +1 migrácia (`guardian_findings.rule_code`). Nepovolená, kým nie sú podmienky.
7. **Čo sa môže pokaziť:** falošné „bez reakcie" (hovor mimo CRM) a auto-potvrdenie zakryté ako reakcia.
8. **Čo sa NEDEJE:** žiadne odosielanie správ, žiadny nový agent s LLM, žiadne meno referenčného klienta.
9. **Od teba potrebujem:** (1) GO na Fázu 0, (2) hodnotu X alebo „zatiaľ nie", (3) definíciu reakcie (P06 §2), (4) kontakt na kanceláriu pre rozhovor.
10. **Merge a PROD:** vždy zvlášť, zvlášť slovo.
11. **Zastavíme sa:** ak je < N reálnych dopytov (N = tvoje číslo, návrh P04) alebo ak sa substrát nedá overiť.
12. **Dôkaz na konci Fázy 0:** tabuľka z P04 §6 s vyplnenými číslami alebo „NEMERANÉ" s dôvodom.

---

## FÁZA 0 — MERANIE (odporúčaná)

| Pole | Hodnota |
|---|---|
| **ID** | WP5-FG-0 |
| **PROJECT** | `revolis` (`docs/rau/registry.json`, `risk_class: HIGH`) |
| **MODE** | STANDARD (`default_mode` projektu; migrácia je v `founder_approval`) |
| **WALLS** | WALL-PROJECT, WALL-ENV, WALL-DATA, WALL-EXTERNAL, WALL-FOUNDER |
| **OBJECTIVE** | Do 4 týždňov od go-live merania mať pre 1 kanceláriu medián času do prvej ľudskej reakcie a pokrytie merania, alebo čestné „NEMERANÉ" s dôvodom. |
| **SCOPE** | (a) Overiť, či je migrácia `20260924060000` v PROD (read-only). (b) Ak nie a founder dá GO, aplikovať ju jeho cestou (Dashboard SQL Editor). (c) Rozhovor s kanceláriou (P04 §10). (d) Read-only dotazy podľa P04 §6. (e) Zápis výsledku do `memory/decisions.md`. |
| **NON-SCOPE** | Žiadne nové pravidlo Guardiana, žiadna zmena `guardian_findings`, žiadny cron, žiadny agent, žiadny LLM, žiadne odosielanie, žiadna zmena UI, žiadny kód. Žiadne pomenovanie referenčného klienta. |
| **INPUTS** | `lead_events` (`type='contact_attempted'`), `leads` (`created_at`, `source`, `agency_id`), P04 vzorce. |
| **OUTPUTS** | Tabuľka P04 §6, záznam v `decisions.md` (BACKLOG/BUILD + dôvod), odpovede z rozhovoru. |
| **ACCEPTANCE CRITERIA** | A1: stav migrácie v PROD zapísaný ako FAKT s dôkazom (výstup dotazu, čas). A2: každé číslo v tabuľke má zdroj a veľkosť vzorky n, alebo „NEMERANÉ". A3: žiadne číslo bez n. A4: pokrytie (P04 M0) uvedené vedľa mediánu. A5: v dotazoch nie je zápis do PROD okrem schválenej migrácie. |
| **CIEĽOVÝ STAV DÔKAZU** | VERIFIED (meranie vykonané a overené nezávisle). Stavy IMPLEMENTED/TESTED sa týkajú kódu a tu neplatia. PRODUCTION sa netvrdí. |
| **NEZÁVISLÝ OVEROVATEĽ** | Iný agent/model než ten, čo dotazy spustil (skill `kontrolor`); alebo founder pri vzorke dopytov. |
| **TOOLS** | Supabase čítanie (SELECT), `git` na docs; žiadne zápisové nástroje okrem migrácie, ktorú robí founder. |
| **PERMISSIONS** | Tier 0 (čítanie, zoznam), Tier 1 (zápis do `memory/decisions.md`). Migrácia = Tier 3 (len founder). |
| **BUDGET** | Čas: NEMERANÉ. Tokeny: NEMERANÉ. €: 0 mimo mzdy foundera. |
| **TIMEBOX** | Meranie 4 týždne od go-live; ak v týždni 4 nie je n ≥ N, uzavrieť ako NEDOSTATOČNÉ DÁTA (nepredlžovať automaticky). |
| **RISKS** | P0: reakcia mimo CRM → nízke pokrytie (meriame ho, nezakrývame). P1: makléri tlačidlá nepoužívajú → M0 nízke → záver „NEMERANÉ". P2: n príliš malé pre medián. |
| **ROLLBACK** | Migrácia je aditívna (`ADD COLUMN IF NOT EXISTS`); rollback = nepoužívať stĺpce. Docs sa vrátia revertom PR. |
| **STOP CONDITIONS** | Substrát v PROD nie je a founder GO nedá. Zdroj dopytov nie je rozlíšiteľný (P06 U3). Nutnosť PII v mimo-tenantnom výstupe. |
| **APPROVAL GATE** | `GO WP5-FG-0` od foundera. Migrácia: vlastné `GO_CONTACT_EVENT_PROD_MIGRATION`. Merge a PROD zvlášť. |

---

## FÁZA 1 — EXTEND GUARDIAN (ZAMKNUTÁ)

Odomkne sa **iba** ak platí (a) až (d) z P02 Prílohy A a founder dá `GO WP5-FG-1`.

| Pole | Hodnota |
|---|---|
| **ID** | WP5-FG-1 |
| **PROJECT / MODE / WALLS** | `revolis` / **HARDENED** (návrh: pridáva Tier 3 migráciu a čítanie PII; HARDENED pridáva Red Team a Security, P13/P14) / ako Fáza 0 |
| **OBJECTIVE** | Maklér vidí ráno zoznam otvorených dopytov bez ľudskej reakcie dlhšie než X hodín; zoznam je deterministický, bez odosielania. Úspech podľa P04 §7. |
| **SCOPE** | (1) Nové pravidlo v `src/lib/guardian/rules.ts` (návrh kódu `NO_FIRST_RESPONSE`). (2) Migrácia: rozšíriť `guardian_findings.rule_code CHECK`. (3) Zjednotenie zapisovačov reakcie do `contact_attempted` (Action Queue klik, schválený návrh, `source='system-assisted'`). (4) Zobrazenie zoznamu v prihlásenom CRM/briefe (nie v e-maile). (5) Záznam v control-contract registry, ak pravidlo zapisuje nález (P08). |
| **NON-SCOPE** | Odosielanie. Nový agent s LLM. Zmena follow-up sweepu. Zmena `updated_at` logiky. Zoznam v `guardian-digest` e-maile (PII-free kontrakt). Externý SLA text. |
| **INPUTS** | `leads`, `lead_events`, `guardian_findings`, parameter X (P06). |
| **OUTPUTS** | Riadky `guardian_findings` (rule nového kódu), zoznam v UI/briefe, audit záznam (P06). |
| **ACCEPTANCE CRITERIA** | Každé AC overiteľné príkazom: `npm run lint && npm run test && npm run build` v `apps/crm`; EVAL SUITE z P08 zelená vrátane zakázaného správania; test „auto-potvrdenie nie je reakcia"; test „lead pred cutoff nie je v zozname"; test „X nenastavené ⇒ pravidlo nežiari a hlási NEKONFIGUROVANÉ"; test „žiadna cesta k odoslaniu"; RLS test tenant izolácie. |
| **CIEĽOVÝ STAV DÔKAZU** | TESTED v lokále a CI; VERIFIED po nezávislej kontrole; PRODUCTION/PRODUCTION VERIFIED len po vlastnom GO (P17–P19). |
| **NEZÁVISLÝ OVEROVATEĽ** | Iný model než implementátor (HARDENED). |
| **TOOLS / PERMISSIONS** | Tier 0 zoznam, Tier 1 zápis/uzavretie nálezu, **Tier 3 žiadny** (migrácia robí founder). |
| **BUDGET** | Čas: NEMERANÉ (odhad „malé" je PREDPOKLAD). LLM tokeny: 0 (bez LLM). |
| **TIMEBOX** | Navrhnúť po Fáze 0; do tej doby neurčené. |
| **RISKS** | P0 falošné pozitíva; P0 auto-potvrdenie; P1 historické leady; P1 kolízia názvu s Guardianom; P2 PII v UI logu. |
| **ROLLBACK** | Feature flag/kill switch (P08) → pravidlo prestane vyhodnocovať; nálezy sa auto-resolvujú (existujúci runner). Migrácia `CHECK` je rozšírenie (aditívna), spätný krok = nechať nepoužitý kód. |
| **STOP CONDITIONS** | Pokrytie merania M0 < prah z P04; X nepotvrdené; zápis do PROD bez GO; požiadavka na odoslanie. |
| **APPROVAL GATE** | `GO WP5-FG-1`; migrácia, merge a PROD každé zvlášť. |

**Pravidlá:** jedna logická zmena = jeden PR (migrácia, pravidlo, zjednotenie zapisovačov = 3 PR). Žiadne nové scope mimo kontraktu. Kontrakt sa neimplementuje bez approvalu.
