# P04 — PRODUCT CONTRACT: Strážca follow-upu (WP-5)

> Stav: NÁVRH. Platí pre Fázu 1 (P03). Metrika a prahy sú **pre-registrované tu, pred meraním**.
> Čokoľvek v tomto dokumente označené NÁVRH schvaľuje founder PRED prvým pohľadom na dáta.
> Zmena prahu po pohľade na číslo je vysvetlenie, nie meranie.
> Referenčný klient sa v texte nepomenúva.

## 1. Zhrnutie 10 polí

| Pole | Obsah |
|---|---|
| **USER** | Maklér (priradený k leadu); vedúci kancelárie (vidí zoznam celej kancelárie). 1 platiaca kancelária (n = 1). |
| **PROBLEM** | Dopyt, na ktorý nikto nezavolal, nikde nesvieti. Dnešný nočný sweep vidí len „dlho needitovaný" lead (`updated_at`, 5 dní), nie „dlho bez reakcie". Maklér nevie ráno, komu zavolať ako prvému. |
| **TRIGGER** | Denný deterministický beh po `guardian-run` (06:00). Presný čas a práca s nocou/víkendom = OPEN QUESTION (pracovné hodiny, P06 §4). |
| **INPUT** | Otvorené leady kancelárie vzniknuté po go-live merania, ich `created_at`, zdroj, priradený maklér, záznamy `contact_attempted`. Žiadny text správy, žiadne PII mimo prihláseného kontextu. |
| **PROCESS** | Deterministicky (P07): vyber → vyhoď neoprávnené → spočítaj vek bez ľudskej reakcie → porovnaj s X → zoraď (najstarší prvý) → ulož nález. Bez LLM. |
| **OUTPUT** | Ranný zoznam: lead, vek bez reakcie v hodinách, zdroj, odporúčaná akcia „zavolať". Žiadny návrh textu, žiadne odoslanie. |
| **BUSINESS VALUE** | §3 (mechanizmus). |
| **SUCCESS METRIC** | §4–§7 (vzorec, zdroj, prah). |
| **FAILURE MODE** | §8. |
| **HUMAN HANDOFF** | Zoznam končí človekom: maklér zavolá a klikne Volať/E-mail (zápis `contact_attempted`). Strážca nikdy nekomunikuje s klientom. Návrh textu rieši existujúci sweep a schvaľuje ho maklér. |

## 2. Texty pre používateľa (začínajú VÝSLEDKOM, `clay-positioning-reframe.md`)

- Nadpis zoznamu: „Dnes ráno: 3 dopyty čakajú na tvoj hovor. Najstarší čaká 7 hodín."
- Prázdny stav: „Všetky nové dopyty majú reakciu. Nič nečaká."
- Nemerateľný stav: „Reakcie sa zatiaľ nezaznamenávajú, zoznam nie je spoľahlivý." (nikdy nie „0 dopytov").
- Zakázané: slovo „SLA", „porušenie", „meškanie v %", časovač v UI. Dôvod: `lead-revenue-engine-v1.md` §8 (`EXTERNAL_SLA = NONE`: vek smie radiť, nesmie sa volať SLA).
- Parameter v kóde a dokumentoch sa volá „prah ticha" / `FIRST_RESPONSE_AFTER_HOURS`, nie SLA.

## 3. BUSINESS VALUE a MECHANIZMUS (hypotéza, nie fakt)

- **Krok reťazca:** Lead → **Telefonát** (čas od vzniku dopytu po prvý pokus o kontakt).
- **Hypotéza H1:** strážca skracuje *chvost* (dopyty čakajúce > X h), a tým medián času do prvej reakcie.
- **O koľko:** NEZNÁME. Baseline je NEMERANÉ. Pre-registrovaný *cieľ* (nie predpoveď): medián −30 % (NÁVRH).
- **Čo sa netvrdí:** vplyv na Obhliadku, Zmluvu, Províziu. Ten sa pri n = 1 kancelárii nedá izolovať a nebol meraný. Čísla z externých štúdií o rýchlosti odozvy som v repe neoveril, takže ich nepoužívam.

## 4. Definície (vzorce) — pred meraním

Kohorta **E** = leady s `agency_id` kancelárie, `created_at ≥ T0` (T0 = čas go-live merania, zapíše founder), zdroj v allowliste skutočných dopytov (P06 U3), a `created_at ≤ now − X h` (vek aspoň X, aby mal lead šancu).

Pre lead *i*:
- `t_created(i) = leads.created_at`
- `t_react(i) = min(lead_events.occurred_at)` pre `type='contact_attempted'`, `actor_profile_id IS NOT NULL`, `source IN ('manual','system-assisted')`, `occurred_at IS NOT NULL` (ľudská reakcia; definícia P06 §2). Stav z `resolveFirstContactAttempt`: `known` / `unknown` / `none`.
- `TTFR(i) = t_react(i) − t_created(i)` v hodinách; záporné hodnoty sú chyba dát, vylúčia sa a spočítajú sa osobitne.

| Metrika | Vzorec | Zdroj | Kedy sa interpretuje |
|---|---|---|---|
| **M0 Pokrytie** | `|{i∈E: state=known}| / |E|` | `lead_events`, `leads` | vždy uvádzať vedľa M1/M2 |
| **M1 Medián TTFR (primárna)** | `median{TTFR(i): i∈E, known}` v hodinách | to isté | len ak M0 ≥ prah a n ≥ N_min |
| **M2 Podiel do prahu** | `|{i∈E: known ∧ TTFR(i) ≤ X}| / |E|` | to isté | len interne (nie v UI, nie navonok, §8 engine) |
| **M3 Bez zachytenej reakcie** | `|{i∈E: state∈{none,unknown}}| / |E|` | to isté | slúži aj ako horný odhad „nezodpovedané" |
| **M4 Účinok zoznamu** | podiel nálezov `NO_FIRST_RESPONSE`, po ktorých nasleduje `contact_attempted` do konca nasledujúceho pracovného dňa | `guardian_findings` + `lead_events` | po Fáze 1 |

**Neprebrať existujúce KPI:** `computeContactedWithin24hPercent` (`src/lib/agents/followup/kpi.ts`) čerpá z `leads.last_contact` (legacy text, „posledný" kontakt, nie „prvý"), takže nie je baseline pre M1/M2 (P02 R24).

**Cenzurovanie:** leady bez reakcie nemajú TTFR, takže M1 nad `known` je podhodnotený voči skutočnosti. Preto sa vždy uvádza M3 vedľa M1. Medián nikdy nestojí sám.

**Kontrola pravdivosti zápisu:** 2-týždňový ručný záznam kancelárie (n_audit leadov, čas prvého hovoru z mobilu) porovnaný s `contact_attempted`. Ak sa líšia, platí ručný záznam a M0 sa interpretuje ako dolný odhad pokrytia.

## 5. Prahy (NÁVRH, schvaľuje founder PRED meraním)

| Parameter | NÁVRH | Poznámka |
|---|---|---|
| X (prah ticha) | **4 h** | PREDPOKLAD z briefu §2.2; OPEN QUESTION; pracovné vs kalendárne hodiny NEZNÁME |
| N_min (min. počet leadov v E) | 20 | Ak sa nenazbiera za 8 týždňov: „NEDOSTATOČNÉ DÁTA", žiadny záver |
| Prah M0 | 80 % | Pod tým sa M1/M2 nepublikujú ako meranie |
| Pravidlo „problém existuje" (odomkne Fázu 1) | M3 ≥ 20 % AND M0 ≥ 80 % AND ručný audit potvrdí | Pri n = 1: indikatívne |
| Cieľ úspechu Fázy 1 | M1 −30 % voči baseline pri n ≥ N_min a M0 nepoklesol | Pre-registrovaný cieľ |
| Kill kritérium | M1 zlepšenie < 10 % po 4 týždňoch a n ≥ N_min → pravidlo sa vypne | Ústava: čo nepreukáže hodnotu, ide preč |
| Kontrola artefaktu | ak M0(guard-on) − M0(baseline) > 10 p.b., zlepšenie M1 sa označí „možný artefakt zápisu" | Observer effect |

## 6. Tabuľka merania (Fáza 0; vypĺňa sa až po zbere)

| Položka | Hodnota | n | Zdroj | Stav |
|---|---|---|---|---|
| Počet leadov v E | NEMERANÉ | — | `leads` | — |
| M0 | NEMERANÉ | — | `lead_events` | — |
| M1 (medián TTFR) | NEMERANÉ | — | `lead_events` | — |
| M2 | NEMERANÉ | — | — | — |
| M3 | NEMERANÉ | — | — | — |
| Ručný audit (zhoda s CRM) | NEMERANÉ | — | rozhovor/záznam | — |

## 7. Pravidlo vyhodnotenia (kto, kedy, čo sa stane)

1. Founder schváli §5 a T0 (zápisom do `memory/decisions.md`).
2. Po uplynutí okna (4 týždne alebo n ≥ N_min, čo nastane neskôr, max 8 týždňov) spustí nezávislý overovateľ read-only dotazy a vyplní §6.
3. Ak M0 < prah alebo n < N_min: záver „NEMERANÉ/NEDOSTATOČNÉ DÁTA". Fáza 1 sa **neodomkne**.
4. Ak „problém existuje" platí: návrh odomknutia Fázy 1 s odporúčaním; GO zvlášť.
5. **n = 1 kancelária:** žiadne štatistické tvrdenie. Pred/po porovnanie je zmätené sezónou, objemom a neprítomnosťou makléra. Výsledok sa uvádza ako indikatívny.

## 8. FAILURE MODE

- Hovor mimo CRM sa nezachytí → falošné „bez reakcie". Mitigácia: M0, ručný audit, tlačidlo „už som volal" (návrh funkcie, nie v rozsahu), zoznam je zoradený a krátky, nie alarm.
- Auto-potvrdenie zakryje dopyt, ak sa reakcia odvodí z `last_contact_at` (R9). Mitigácia: reakcia = len `contact_attempted` s ľudským aktérom (P06 §2).
- Zoznam plný historických leadov: cutoff T0 a allowlist zdroja.
- Maklér zoznam ignoruje: M4 to ukáže; ak M4 nízke, zoznam sa nepredáva ako úspech.
- Zoznam sa vníma ako dohľad nad maklérom: komunikovať ako „komu zavolať", nie hodnotenie výkonu; per-maklér štatistiky nie sú v rozsahu.

## 9. Čo sa DOZVIEME a aké nové vlastné dáta získame (Thiel, Ústava v2 Vrstva 3)

- Rozdelenie času do prvej reakcie podľa zdroja, hodiny dňa, makléra (agregovane): dnes **neexistuje nikde** (R3, R10 v P02).
- Podiel dopytov, na ktoré sa reaguje mimo CRM (rozdiel ručný audit vs CRM): kvalita zápisu.
- Reakcia po zobrazení v zozname (M4): spätná väzba o správaní maklérov (moat = proprietárne dáta zo správania maklérov).
- Čo Revolis o rok vie, čo dnes nevie nikto: skutočný medián reakcie realitnej kancelárie na SK portálové dopyty. Pri n = 1 je to pozorovanie, nie benchmark.

## 10. Otázky pre rozhovor s kanceláriou (Q1, Q2; nie vedenie, ale overenie)

1. Koľko skutočných dopytov dostávate za týždeň a z akých zdrojov?
2. Ako rýchlo na ne zvyčajne voláte a kde to zlyháva (noc, víkend, dovolenka, preposielanie)?
3. Voláte z CRM alebo z mobilu? Klikáte Volať/E-mail v CRM?
4. Zaplatili by ste za ranný zoznam „komu zavolať"? (Q1 Ústavy) Koľko? Čo by ste povedali na 4 hodiny?
5. Ktoré hodiny sú „pracovné" pre odozvu?

## 11. Ak je USER, TRIGGER alebo OUTPUT nejasný

Jasné sú všetky tri na úrovni návrhu. **Nejasné je X a pracovné hodiny** (TRIGGER/prah). Preto Fáza 1 je zamknutá a otázka je v README ako jediná FOUNDER DECISION plus blokéry.
