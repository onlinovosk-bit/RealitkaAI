# Inzerát Generátor — čo zostalo, rozdelené do vĺn

**Cieľová cesta:** `docs/briefs/overnight/2026-08-03-swarm-inzerat-generator.md`
**Dátum:** 3. augusta 2026 · **Základ:** vetva `test/listing-gen-tests-docs`

---

## Čo je hotové (patche 09–12) — NEROBIŤ ZNOVA

| Vrstva | Patch |
|---|---|
| `ai_generations` migrácia + RLS + store + GET/PATCH | 09 |
| POST route ukladá draft, vracia `generationId` a stav kreditov | 09 |
| Stream route: rate limit + kredity + audit | 10 |
| Broker UI: formulár, persony, karty, copy, inline edit, save | 11 |
| Vstup v navigácii | 11 |
| 6 unit testov store + `docs/prompts/inzerat-generator-tab.md` | 12 |
| Oprava odkazu na neexistujúci `ListingGeneratorForm` | 12 |

**Overené:** `check-api-contract.mjs --ci` a `find-dead-exports.mjs --ci` sú
na tejto vetve **zelené** — nový kód nepridal ani jedno porušenie.

---

## ⛔ PRAVIDLÁ PRE VŠETKY VLNY

1. Branch + PR + CI. **Žiadny agent nedeployuje.**
2. **Žiadny agent nespúšťa migráciu na prode.** `20260803120000_ai_generations.sql` aplikuje founder.
3. Testuje sa **výhradne cez test agency**, nikdy cez účet Reality Smolko (`11111111-…`).
4. Jeden agent = jedna branch = vlastnené adresáre. Siahnutie mimo → agent sa zastaví a napíše to do PR.
5. Vlna N+1 až po merge Vlny N.
6. Pred commitom: `node apps/crm/scripts/check-api-contract.mjs --ci` a `find-dead-exports.mjs --ci` musia byť zelené.
7. **Nový scope = stop.** Ak úloha vyžaduje produktové rozhodnutie, agent napíše návrh do PR a nekóduje.

---

## VLNA 1 — overenie a doťahovanie *(2 agenti paralelne)*

### 1A · E2E Playwright happy path
**Branch:** `test/w1a-listing-gen-e2e`
**Vlastní:** `apps/crm/tests/e2e/listing-generator.spec.ts` (nový súbor), `apps/crm/tests/fixtures/`
**Zadanie:** end-to-end cez test agency:
1. prihlásenie → `/inzerat-generator` sa vykreslí
2. formulár odmietne odoslanie bez povinných polí (typ, lokalita, výmera, cena)
3. vyplnenie + „Vygenerovať texty" → objaví sa 5 kariet + SEO chipy
4. úprava textu v karte „Text na portál" → objaví sa tlačidlo „Uložiť úpravy"
5. uloženie → indikátor „Uložené o HH:MM"
6. **obnovenie stránky → `GET /generations` vráti `edited_output`, nie pôvodné AI**
**Akceptačné kritérium:** krok 6 je najdôležitejší — bez neho perzistencia nie je overená.
AI volanie mockni na úrovni siete, nevolaj reálny model v CI.
**NEROB:** nemeň produkčný kód. Ak test odhalí chybu, zapíš ju do PR a nechaj opraviť vo Vlne 2.

### 1B · Kontrola sandbox / demo cesty
**Branch:** `fix/w1b-listing-gen-sandbox`
**Vlastní:** `apps/crm/src/lib/capabilities/listing-generator/`
**Zadanie:** over, či fixture/demo cesta v `lib/capabilities/listing-generator/generate.ts`
nemôže zapísať do `ai_generations` pod reálnu agentúru. Ak áno, oddeľ ju rovnakým
vzorom ako `is_sandbox` pri valuačnom widgete.
**Akceptačné kritérium:** SELECT, ktorý dokáže, že demo generovanie nezapíše
pod `agency_id` platiaceho zákazníka. Výstup do PR.
**NEROB:** neodstraňuj demo cestu — najprv zisti, kto ju používa.

---

## VLNA 2 — rozhodnutia foundera *(sekvenčne, po Vlne 1)*

Tieto tri úlohy **nemôže začať agent** — každá vyžaduje tvoje rozhodnutie.
Sú tu, aby sa nezabudli, nie aby ich niekto robil dnes v noci.

| # | Rozhodnutie | Čo od teba treba | Kto to potom postaví |
|---|---|---|---|
| 2A | **`CREDITS_ENFORCEMENT` na `enforce`** | Povedať to Smolkovi **dopredu**. Dnes má AI úkony zadarmo. | zmena env, nula kódu |
| 2B | **Zápis späť do `properties`** | Má generovaný text prepísať popis nehnuteľnosti, alebo zostať oddelený? Prepis je nevratný, oddelenie znamená dve pravdy. | Swarm, 1 vlna |
| 2C | **Publish CTA** | Odoslanie na portál je integrácia (Realvia / RealSys), nie MVP. | samostatný Build Package |

**Odporúčanie k 2B:** zostať oddelený a do `properties` pridať len odkaz na
`ai_generations.id`. Prepis popisu je nevratný a maklér nemá ako vrátiť pôvodný text.

---

## VLNA 3 — streamovaný draft *(1 agent, po Vlne 2)*

### 3A · Uloženie draftu zo streamu
**Branch:** `feat/w3a-listing-gen-stream-persist`
**Vlastní:** `apps/crm/src/app/api/ai/listing-content/stream/`, `components/listing-generator/`
**Zadanie:** stream dnes vracia surový text, nie parsovaný `ListingContent`, takže
draft neukladá — na rozdiel od POST varianty. Buď (a) klient po dokončení streamu
parsne JSON a pošle ho na nový `POST /generations`, alebo (b) stream si výstup
akumuluje a uloží ho na serveri po `[DONE]`.
**Odporúčam (b)** — klient môže tab zavrieť a draft by sa stratil, čo je presne
tá chyba, ktorú celá táto práca odstraňuje.
**Akceptačné kritérium:** prerušenie streamu v polovici nesmie uložiť neúplný draft.

---

## VLNA 4 — verifikácia *(2 agenti, read-only)*

Títo agenti **nič neimplementujú.** Dostanú diffy vĺn 1–3 a majú predvolene
predpokladať, že práca je zlá.

### 4A · Fresh verifier — tenant izolácia
**Hľadaj:** môže používateľ agentúry A cez `PATCH /generations/:id` zmeniť draft
agentúry B? · vracia `GET /generations` len vlastné záznamy? · je RLS na
`ai_generations` aktívna aj bez explicitného filtra v kóde? · nezapisuje sa
niečo pod `SYSTEM_USAGE_AGENCY_ID`?
**Výstup:** `docs/briefs/overnight/2026-08-03-listing-gen-verifikacia.md`.
**Bez nálezov napíš „bez nálezov" — nevymýšľaj.**

### 4B · Fresh verifier — peniaze a limity
**Hľadaj:** dá sa obísť odpočet kreditov prepnutím z `/stream` na POST alebo naopak? ·
je idempotencyKey stabilný pre ten istý úkon a rozdielny pre iný? · dá sa
rate limit obísť? · minú sa tokeny aj vtedy, keď zákazník nemá kredity?
**Výstup:** doplň do toho istého súboru sekciu „Peniaze a limity".

---

## DAG

```
              patche 09-12 (hotové, merge founder)
                            │
              ┌─────────────┴─────────────┐
        1A E2E Playwright           1B sandbox izolácia
        tests/e2e/                  lib/capabilities/listing-generator/
              └─────────────┬─────────────┘
                      merge (ľudský)
                            │
                 VLNA 2 — rozhodnutia foundera
                   (2A env · 2B properties · 2C publish)
                            │
                 3A stream persist (sám)
                            │
              ┌─────────────┴─────────────┐
        4A tenant izolácia          4B peniaze a limity
              └─────────────┬─────────────┘
                      Ranný report
```

---

## Pre Obsidian Vault

Do `C:\RealitkaAI-Memory\` po merge zapísať:

- **Rozhodnutie:** „Draft AI generovania sa ukladá vždy, `output` sa nikdy neprepisuje;
  `edited_output` drží úpravu makléra. Rozdiel je tréningový signál."
  → `memory/decisions.md`, review dátum 30.9.2026
- **Lesson:** „Feature bez UI nie je feature. KF1 mal hotový prompt, API, testy aj
  kreditovú väzbu — a maklér sa k nemu nevedel dostať." → `brain/lessons/`
- **Registry:** nová capability `listing-generator-ui` s odkazom na
  `docs/prompts/inzerat-generator-tab.md`

## Pre orchestrátorov

Vlna 1 je jediná, ktorú vieš pustiť dnes v noci. Vlna 2 je blokovaná na tebe.
Ak by orchestrátor dostal celý tento dokument, **musí sa zastaviť po Vlne 1** —
inak začne robiť produktové rozhodnutia namiesto teba.
