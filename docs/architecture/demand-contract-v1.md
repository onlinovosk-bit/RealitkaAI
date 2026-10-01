# Demand Contract v1 (DEMAND-D1)

**Stav:** kód hotový, na PROD **vypnutý** (`DEMAND_EXTRACTION_ENABLED` nie je nastavené).
**Súvisí:** `docs/reports/2026-09-29-demand-os-gap-audit.md` (prečo: 94 % leadov bez dopytu).

## Princíp

> Prázdne pole nie je chyba. Vymyslené pole je chyba.

Každá hodnota nesie dôkaz. Hodnotu navrhne model (Haiku), ale **rozhoduje kód**
(`lib/demand/verify.ts`): hodnota prežije, len ak
1. jej `evidence` je doslovne v texte záujemcu (bez ohľadu na veľkosť písmen,
   diakritiku a medzery), a
2. hodnota sa dá z toho citátu spätne prečítať (číslo v citáte, kľúčové slovo pre
   enum, názov miesta v citáte).

Inak je pole explicitne neznáme a dôvod sa zapíše (`rejected`).

## Polia

| Pole | Typ | Poznámka |
|---|---|---|
| `property_type` | byt · dom · pozemok · chata · komercny · garaz | |
| `location` | text | tak, ako to záujemca napísal; skloňovaný tvar neprejde, ak nie je v citáte |
| `budget_min`, `budget_max` | € | „do X" / „okolo X" → `budget_max` |
| `rooms_min`, `rooms_max` | počet | garsónka = 1, „2+kk" = 2 |
| `area_min`, `area_max` | m² | |
| `disposition` | kupa · prenajom · predaj · prenajimanie | |
| `urgency` | ihned · do_3_mesiacov · neskor | |
| `financing` | hypoteka · hotovost · kombinacia | |

Každé pole: `{ value, confidence, source: "inquiry_text", evidence, rejected? }`.
Neznáme: `{ value: null, confidence: 0, source: null, evidence: null }`.

**Záujem o konkrétny inzerát nie je dopyt.** Referencia na inzerát ostáva v
`leads.note`. Tento kontrakt obsahuje len to, čo záujemca sám napísal.

## Ochrana údajov

- Model dostane iba **text správy** (`ev.inquiryText`), nie celú poznámku.
- Pred odoslaním sa maskujú e-mail, telefón, IBAN, rodné číslo (`lib/ai/sanitize.ts`)
  a meno leadu (`lib/demand/redact.ts`). Citáty sa overujú proti redigovanému
  textu, takže maskovaný údaj sa nemôže vrátiť cez `evidence`.
- **Súčasť tohto PR:** zdieľaný sanitizer doteraz nemaskoval slovenské mobily v tvare
  `0903 123 456`, pretože regex čakal 9 číslic namiesto 10. Chyba sa týkala všetkých
  volaní Claude v aplikácii. Je opravená a pokrytá testom.

## Úložisko

`public.lead_demands` sa len pridáva (append-only) a aktuálny dopyt leadu je
najnovší riadok. Tabuľka `leads` sa **nemení**, takže extrakcia nikdy neprepíše
údaj, ktorý maklér zadal ručne. Zapisuje iba service role. Používateľ vidí len
riadky svojej kancelárie cez `profile_agencies_for_auth()`. `agency_id` je
`NOT NULL`.

Súčasť tohto PR: `acquire/email` prestal leadom dosádzať `property_type = "Byt"`
a `financing = "Hypotéka"`. Na PROD to malo všetkých 42 leadov z portálov a
matching porovnáva `property_type` presne.

## Zapnutie na PROD (GO foundera)

1. **Predpoklad (GDPR):** Anthropic nie je v čl. 6 DPA s Reality Smolko
   (`memory/decisions.md`, 2026-09-29). Extrakcia je nové spracovanie textu
   leadu cez Anthropic. Oznámenie klientovi musí ísť **pred** zapnutím.
   Právny základ je čl. 6 ods. 1 písm. f): oprávnený záujem kancelárie vybaviť
   dopyt, ktorý jej záujemca sám poslal. Do modelu sa posiela minimálny,
   redigovaný text.
2. Backfill gate = PASS (sekcia nižšie) a audit volaní LLM bez otvorených PATCH na živých miestach (`docs/reports/2026-09-29-llm-callsite-pii-audit.md`).
3. Migrácia `20260929120000_lead_demands.sql` na PROD.
4. Vercel env: `DEMAND_EXTRACTION_ENABLED=true` (vyžaduje aj `ANTHROPIC_API_KEY`).
5. Smoke test: nový lead z portálu → log `DEMAND_EXTRACTED` → riadok v `lead_demands`.

Rollback: odstrániť env premennú. Tabuľka ostane, žiadny iný kód z nej nečíta.

## KPI

```sql
-- % nových leadov s platným demand recordom (status 'ok', aj keď sú všetky polia neznáme)
select
  count(*)                                                     as new_leads,
  count(*) filter (where d.status = 'ok')                      as valid_records,
  round(100.0 * count(*) filter (where d.status = 'ok') / nullif(count(*), 0), 1) as pct_valid,
  count(*) filter (where d.known_fields > 0)                   as with_any_demand,
  count(*) filter (where d.core_complete)                      as core_complete
from leads l
left join lateral (
  select status, known_fields, core_complete from lead_demands
  where lead_id = l.id order by created_at desc limit 1
) d on true
where l.created_at >= :enabled_at and l.source like 'portal:%';
```

## Backfill experiment = formálny production gate

`scripts/demand-backfill-experiment.ts` iba číta, žiadne zápisy do DB.

1. `extract --agency <uuid> --sample 100 [--input <priečinok>]` vytvorí
   `tmp-demand-backfill/<run>/labels.csv` (súbor je v gitignore a obsahuje len
   redigovaný text).
   - `--input` (GO D1-BACKFILL-A, 2026-10-01): historické dopytové e-maily z
     portálov (`.eml`, `.mbox` z Google Takeout, `.txt`). Idú **tou istou cestou
     ako produkcia**: `parseEmail` nad predmetom + textom + HTML, potom
     `inquiryText` a meno kontaktu, presne ako ich `acquire/email` posiela do
     extrakcie. Mail, z ktorého by produkcia lead nevytvorila, sa nemeria.
   - Riadky z e-mailov majú id z hashu obsahu (`email:<12 hex>`), nie meno ani
     adresu. `sources.csv` v tom istom lokálnom priečinku ich mapuje na súbor.
   - Ten istý dopyt v DB aj v schránke sa meria raz (deduplikácia podľa
     redigovaného textu).
2. **Gold dataset:** človek vyplní pri KAŽDOM riadku (lead × pole) nezávisle od
   extraktora:
   - `evidence_present` (`y`/`n`): uvádza text toto pole výslovne?
   - `gold_value`: hodnota, ktorú text uvádza
   - `evidence_span`: slová, ktoré ju uvádzajú
3. `score <labels.csv>` rozdelí výsledky na štyri kategórie:
   - `correct`: text hodnotu uvádza, bola vyťažená a sedí
   - `correct_unknown`: text hodnotu neuvádza a výsledok je `null`. **Toto nie je chyba.**
   - `missed`: text hodnotu uvádza, ale nebola vyťažená
   - `false_value`: bola vyťažená iná hodnota, alebo hodnota, ktorú text neuvádza
   Zvlášť sa počíta `unsupported` (vyťažené, hoci text nič neuvádza) a
   `evidence_grounded` (citát extraktora sa prekrýva s `evidence_span` z gold datasetu).

**Gate (návrh foundera, 2026-09-29).** Príkaz skončí s exit kódom 0 iba pri PASS:

| Skupina | Pravidlo |
|---|---|
| lokalita, budget (min+max), typ, izby (min+max), disposition | precision ≥ 95 % |
| každá skupina | aspoň 10 označených vyťažených hodnôt, inak `INSUFFICIENT` (nikdy tichý PASS) |
| celkovo | podiel falošných hodnôt ≤ 2 % |
| celkovo | `unsupported = 0` (hodnota bez dôkazu sa nesmie zapísať) |

**Korpus na PROD (2026-09-29, počty):** 42 leadov z portálov s textom
(priemerne 162 znakov), 39 z Realvia importu, 8 ostatných. Realvia import (439)
má text pri 39 leadoch, zvyšok je bez textu. Tam extrakcia vráti `no_text`
a nič si nevymyslí.

**Prečo `--input` (2026-10-01, agregáty, horná hranica podľa regexu):** jediný
reálny tenant má 61 poznámok ≥ 40 znakov, z toho 39 z Realvia importu bez
dopytových slov. Rozpočet ≤ 8, izby ≤ 6, kúpa/prenájom ≤ 8, typ ≤ 11. Brána so
support ≥ 10 by na samotných PROD dátach skončila `INSUFFICIENT` bez ohľadu na
kvalitu modelu. Demo tenant sa nemeria (vymyslený text).

## Anthropic ako subprocesor — overené z oficiálnych zdrojov (2026-09-29)

| Otázka | Odpoveď | Zdroj |
|---|---|---|
| Tréning na našich dátach | „Anthropic may not train models on Customer Content from Services.“ | Commercial Terms, účinné 17. 6. 2025 |
| DPA | súčasť Commercial Terms odkazom, Anthropic = processor | Commercial Terms; DPA účinné 24. 2. 2025 |
| Prenos mimo EÚ | SCC Module 2 a 3 (processor → processor platí pre nás, lebo Revolis je spracovateľ Smolka), rozhodné právo Írsko | DPA |
| Nový subprocesor Anthropicu | „reasonable notice“ vopred, 15 dní na námietku; zoznam na anthropic.com/subprocessors | DPA |
| Mazanie po skončení zmluvy | do 30 dní | DPA |
| Retencia API vstupov a výstupov počas zmluvy | sekundárne zdroje uvádzajú 30 dní, **oficiálna stránka (privacy.claude.com) bola z prostredia nedostupná, OVERIŤ** | — |
| Miesto spracovania | v DPA neuvedené, **OVERIŤ** (inference_geo / región účtu) | — |

**Kontrola celého reťazca** (Smolko → Revolis → Anthropic):
- **Čl. 6 DPA so Smolkom:** Anthropic chýba (nález z #740).
- **Verejná stránka `/legal/sub-processors`:** uvádza iba OpenAI, Anthropic chýba. Nález z auditu volaní LLM.
- **Právny základ, účel a údaje:** uvedené vyššie v sekcii „Zapnutie na PROD“.

Znenie oznámenia a úpravu verejnej stránky odporúčam prejsť s právnikom. Nie je to
rozhodnutie inžinierstva.
