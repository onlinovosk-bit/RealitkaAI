# P07 — WORKFLOW DESIGN: Strážca follow-upu (WP-5)

> Stav: NÁVRH. Nič sa nevykonáva. Automatizácia: **Tier 0/1 (zoznam, uzavretie nálezu). Žiadne automatické odosielanie.**
> Vzor: TRIGGER → DETECT → CLASSIFY → REASON → ACT → VERIFY → HANDOFF → LEARN.
> Počet workflowov je zámerne 4 (prompt povoľuje 5–8, ale zakazuje počet pre počet): jedna uzavretá slučka (W2), zvyšné sú jej podmienky a vyhodnotenie.

## 1. Rozhodnutie o umiestnení: REUSE → EXTEND → COMPOSE → BUILD

| Úroveň | Kandidát | Verdikt |
|---|---|---|
| REUSE | Ranný brief `pendingContact` / `staleContacts48h` (`gather.ts`, 06:00) | Nepostačuje: počet bez zoznamu, bez prahu X, `null` kým sa nezapisuje kontakt. Zostáva ako sprievodné číslo. |
| REUSE | Follow-up sweep (22:00) | Nepostačuje: kritérium `updated_at` a dni; navyše generuje návrhy LLM-om. Nemeníme. |
| **EXTEND** | **Guardian**: nové pravidlo vo `src/lib/guardian/rules.ts`, nález v `guardian_findings`, auto-resolve v `runner.ts` | **ZVOLENÉ.** Deterministické, idempotentné (unikátny otvorený nález), má baseline mód a kill (`GUARDIAN_BASELINE_FINDING_KILL`). Cena: Tier 3 migrácia `rule_code CHECK`. |
| COMPOSE | `lead-queues/assemble.ts` (fronta A, dôvod `never_contacted`) + vstup času bez reakcie | Možné neskôr; dnes `assembleQueues` nemá produkčného volajúceho a vyžaduje signály z `lead-signals` (zdroj dát nezapojený). Nepoužité. |
| BUILD | Nový cron + nový agent | **Zamietnuté.** Duplikát Guardiana; LLM netreba. |

Zobrazenie: zoznam v prihlásenom CRM/briefe (mená, telefón). **Nie** do `guardian-digest` e-mailu (len počty, `assertDigestNoPii` zakazuje PII). Pozn.: kód `guardian-digest` hovorí 07:00, `vercel.json` 09:00 (ROZPOR); neovplyvňuje návrh.

Názov: „Strážca follow-upu" kolíduje s existujúcim „Guardian". Navrhnutý je jediný názov pre používateľa („Ranný zoznam: komu zavolať") a technický kód pravidla `NO_FIRST_RESPONSE`.

## 2. Deterministicky najprv: klasifikácia činností

| Činnosť | Trieda |
|---|---|
| Výber leadov kancelárie, cutoff T0, allowlist zdroja, otvorený stav | SQL |
| Určenie prvej ľudskej reakcie (`min(occurred_at)`, stav none/unknown/known) | FUNCTION (`resolveFirstContactAttempt`, existuje) |
| Vek bez reakcie = `now − created_at` | FUNCTION |
| Porovnanie s X, rozhodnutie „zahrnúť" | RULE |
| Radenie (najstarší prvý, tie-break `lead_id`) | RULE |
| Zápis/uzavretie nálezu | API/SQL (cez Control Contract) |
| Vyhodnotenie metrík M0–M4 | SQL / PTC skript |
| Text pre klienta, návrh follow-upu | **REASONING, mimo rozsahu**; rieši existujúci sweep a schvaľuje ho maklér |
| **LLM v strážcovi** | **žiadny** — nie je nutný (nič neinterpretuje, neplánuje ani negeneruje) |

## 3. Workflowy (20 polí)

Skratky: W1 Meranie (Fáza 0) · W2 Ranný zoznam (Fáza 1, jadro) · W3 Zjednotenie zapisovača reakcie (Fáza 1, podmienka) · W4 Vyhodnotenie účinku (po Fáze 1).

| Pole | W1 Meranie | W2 Ranný zoznam | W3 Zapisovač reakcie | W4 Vyhodnotenie |
|---|---|---|---|---|
| BUSINESS OBJECTIVE | Zistiť medián TTFR a pokrytie (P04) | Maklér ráno vie, komu zavolať | Každá ľudská reakcia sa zapíše ako `contact_attempted` | Rozhodnúť o udržaní/vypnutí pravidla |
| USER | Founder | Maklér, vedúci kancelárie | Maklér (nepriamo) | Founder |
| TRIGGER | Ručné GO + okno 4 týždne | Denný cron po `guardian-run` 06:00 (čas OPEN) | Klik Volať/Napísať, schválenie návrhu | Koniec okna merania |
| INPUT | `leads`, `lead_events` | `leads`, `lead_events`, X, T0, allowlist | UI akcia, výsledok odoslania | `guardian_findings`, `lead_events` |
| DETERMINISTIC OPERATIONS | read-only SELECT, M0–M3 | výber, vek, RULE, radenie, insert/resolve | validácia, insert eventu | M0–M4 výpočet |
| REASONING OPERATIONS | žiadne | žiadne | žiadne | žiadne (interpretáciu robí človek) |
| AGENT | žiadny (skript + overovateľ) | žiadny; pravidlo Guardiana | žiadny | žiadny |
| TOOLS | Supabase SELECT | existujúci `runGuardianForAgency` | existujúce API `contact-attempt` | SELECT |
| PERMISSIONS | Tier 0 | Tier 0 (zoznam), Tier 1 (nález) | Tier 1 (zápis eventu, aktér = človek) | Tier 0 |
| STATE | žiadny | `guardian_findings` open/resolved | `lead_events` append-only | žiadny |
| EVENTS | — | E4, E5, E6 (P06) | E1, E2, E3 (P06) | — |
| OUTPUT | tabuľka P04 §6 | zoznam + nález | riadok eventu | rozhodnutie v `decisions.md` |
| HUMAN HANDOFF | founder číta tabuľku | maklér volá | maklér klikol | founder rozhoduje |
| VERIFICATION | nezávislý overovateľ prepočíta | EVAL SUITE (P08), M4 | test pokrytia M0 | opakovaný výpočet iným overovateľom |
| FAILURE MODES | PROD bez substrátu; nízke n; nízke M0 | X nenastavené; falošné pozitíva; PII v logu; baseline záplava | dvojklik; fetch zlyhá; správa odišla, event nie | malé n; artefakt zápisu |
| RECOVERY | predĺžiť okno (max 8 týž.), inak „NEDOSTATOČNÉ DÁTA" | ďalší beh je znova deterministický; kill switch | toast + manuálny pokus; fail-soft | nezverejniť číslo |
| OBSERVABILITY | n, M0 pri každom čísle | `routine_notifications` (počty podľa pravidla); log bez PII | `logEventDetailed` | záznam v `decisions.md` |
| COST | 0 € (SELECT) | LLM 0; Vercel cron už beží; DB čítanie malé (NEMERANÉ) | 1 INSERT na klik | 0 € |
| LATENCY | nezáleží | denná dávka; limit `GUARDIAN_BATCH_LEAD_LIMIT` 500 leadov na beh (existuje) | < 1 s na klik (NEMERANÉ) | nezáleží |
| SUCCESS METRICS | M0, M1, M3 vyplnené | M4; M1 −30 % (cieľ) | podiel reakcií zachytených (ručný audit) | rozhodnutie spravené podľa pre-registrovaného pravidla |

### W2 v slučke

1. **TRIGGER:** denný cron. Kontrola kill switchu a `FIRST_RESPONSE_AFTER_HOURS`; nenastavené ⇒ koniec s `NEKONFIGUROVANÉ`.
2. **DETECT:** SQL výber kohorty E (P04 §4).
3. **CLASSIFY:** pre každý lead stav reakcie `none` / `unknown` / `known`.
4. **REASON:** žiadne (deterministické pravidlo).
5. **ACT:** pre `none` alebo `unknown` s vekom > X vlož nález (alebo ho nechaj otvorený). `known` ⇒ uzavri otvorený nález.
6. **VERIFY:** počty cez `routine_notifications`; porovnanie s predchádzajúcim behom; baseline mód: viac ako `GUARDIAN_BASELINE_FINDING_KILL` nových nálezov v prvom behu ⇒ `runner.ts` zapíše upozornenie pre foundera (text: „Digest zostáva vypnutý — founder review"). Či to kód aj vynucuje, som neoveril.
7. **HANDOFF:** zoznam v UI. Stav `unknown` sa zobrazí ako „čas reakcie chýba", nie ako „bez reakcie".
8. **LEARN:** M4 a rozdiel ručný audit vs CRM.

**Každá mutácia:** POLICY CHECK (kill switch, X, T0) → PERMISSION CHECK (agentúra volajúceho = agentúra leadu) → AUTHORIZATION (registrovaná akcia v `packages/control-contract`; vyžaduje nový záznam, napr. `guardian.finding.record`, kategórie ANALYZE/RECOMMEND, vratná, interná; je to položka implementácie P09, nie hotová vec) → ACTION (insert/resolve) → VERIFICATION (počet po behu) → AUDIT LOG (`guardian_findings` + súhrn). Akcia bez záznamu = FORBIDDEN.

## 4. Poradie nasadenia

| Poradie | Workflow | TIME TO VALUE | REVENUE IMPACT | CUSTOMER VALUE | TECH. RISK | REUSABILITY |
|---|---|---|---|---|---|---|
| 1 | W1 Meranie | 2–4 týždne (najrýchlejšie, aj tak čaká na dáta) | nepriamy: rozhoduje, či stavať | rozhovor = priama spätná väzba | nízke | vysoká (substrát aj pre C1) |
| 2 | W3 Zapisovač | po schválení | nepriamy | zvyšuje pravdivosť všetkého, čo čerpá kontakt | stredné (dotyk UI a approve cesty) | vysoká |
| 3 | W2 Zoznam | po W1 + W3 | NEZNÁME (hypotéza P04) | priamy | stredné (falošné pozitíva) | stredná |
| 4 | W4 Vyhodnotenie | po W2 + ≥ 4 týždne | rozhodnutie o udržaní | — | nízke | vysoká |

| Workflow | VALUE | EFFORT | DEPENDENCIES | RISK | TIME TO MVP | AUTOMATION LEVEL | HUMAN INTERVENTION | PRODUCTION READINESS |
|---|---|---|---|---|---|---|---|---|
| W1 | rozhodnutie podložené dátami | nízky (SELECT + rozhovor) | migrácia `20260924060000` v PROD, T0, X | nízke | NEMERANÉ | 0 (ručne) | founder, overovateľ | pripravené dokumentom, čaká na GO |
| W2 | zoznam komu zavolať | malý (PREDPOKLAD) | W1, W3, X, migrácia CHECK | stredné | NEMERANÉ | Tier 0/1 | maklér volá | NIE (zamknuté) |
| W3 | pravdivé dáta o reakcii | malý až stredný (PREDPOKLAD) | schválená definícia reakcie | stredné | NEMERANÉ | Tier 1 | maklér klikne | NIE |
| W4 | rozhodnutie | nízky | W2 | nízke | — | 0 | founder | NIE |

## 5. Čo workflow výslovne nerobí

- Neodosiela e-mail, SMS ani WhatsApp (Tier 3, WALL-EXTERNAL). `authorizeSend` chráni len dve odosielacie cesty; strážca žiadnu nepridáva.
- Nemení `leads.status`, `updated_at`, `assigned_*`, `score`.
- Nezapisuje do `follow-up-sweep` stavu (`ai_followup_count`, `last_ai_followup_at`).
- Nepočíta lead score ani kvalifikáciu (patrí deterministickým pravidlám).
