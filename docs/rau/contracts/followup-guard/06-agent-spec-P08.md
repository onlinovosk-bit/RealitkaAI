# P08 — AGENT SPEC: Strážca follow-upu (WP-5)

> Stav: NÁVRH, verzia 0.1.0. Nič sa neregistruje a nič sa nestavia.
> Prompt P08 hovorí: „Nepoužívaj, keď úlohu zvládne skript — agent nie je potrebný."

## 0. Najprv: je to vôbec agent?

**Nie.** Podľa P07 je celé riešenie deterministické (SQL + čisté funkcie + pravidlo). Nič neinterpretuje, neplánuje ani negeneruje. Modelu sa neposiela nič. Bezpečnejšie a lacnejšie je nemať agenta.

Špecifikáciu preto dodávam ako **governance záznam pre deterministickú úlohu** (pravidlo `NO_FIRST_RESPONSE` v Guardiane). Poskytuje tie isté záruky (čo smie, čo nesmie, ako sa to testuje) bez toho, aby sa pretvárala na LLM agenta.

### Register `agent-specs.ts`: konflikt s testom proti driftu (overené čítaním)

`apps/crm/src/lib/agents/agent-specs.ts` má dnes **7** záznamov: 4 Revolis `customer_facing_send` a 3 `ONL-*` `internal_intelligence`. Existujúci Guardian v ňom **nie je**. Test `src/lib/agents/__tests__/agent-specs.test.ts` by revolisového `internal_intelligence` agenta **zhodil na 3 miestach**:

1. Test „non-onlinovo ⇒ `customer_facing_send`" (domain ≠ onlinovo musí mať kind `customer_facing_send`).
2. Vetva `internal_intelligence` hľadá `AGENT_ALLOWED[agentId]` z `packages/mcp-onlinovo/.../guard` (pre revolisové ID je `undefined`).
3. Vetva `internal_intelligence` vyžaduje vo `forbiddenActions` reťazec s `onlinovo.campaign.*` a `BLOCKED`.

Preto platí:
- **Odporúčanie:** strážcu do `agent-specs.ts` **nezapisovať**. Register stráži agentov, „ktorých výstup môže dôjsť ku klientovi"; strážca k nemu nedôjde a ani Guardian tam nie je. Dokument tohto Agent Spec je dostatočný záznam.
- **Ak founder chce zápis** (jeden register, žiadny druhý): vyžaduje to aj zmenu testu (3 miesta vyššie), t. j. kód v P09 a samostatný PR. Návrh záznamu je v prílohe A. Druhý register sa nevytvára.

## 1. Agent Spec (Blueprint §3 L1 + DO-NOT-DO)

| Pole | Obsah |
|---|---|
| **AGENT-ID** | `REVOLIS-FOLLOWUP-GUARD` |
| **VERSION** | 0.1.0 (návrh) |
| **MISSION** | Raz denne zostaviť deterministický zoznam otvorených dopytov kancelárie bez ľudskej reakcie dlhšie než prah ticha X, aby maklér vedel, komu zavolať. Nič nepíše klientovi. |
| **INPUTS** | `leads` (id, agency_id, created_at, status, source, priradený maklér) · `lead_events` typ `contact_attempted` · konfigurácia `FIRST_RESPONSE_AFTER_HOURS` (X), T0, allowlist zdroja · `now` (injektovaný). **Nie:** text správ, obsah e-mailov, externé zdroje. |
| **OUTPUTS** | Riadky `guardian_findings` (`rule_code=NO_FIRST_RESPONSE`, `meta` s prahom a vekom) · zoznam v prihlásenom CRM/briefe · súhrn v `routine_notifications` (počty, bez PII) |
| **TOOLS** | Čítanie `leads`, `lead_events`; zápis `guardian_findings` cez existujúci runner. Žiadny e-mail/SMS klient, žiadny LLM klient. |
| **ALLOWED ACTIONS** | `lead.observe` (existuje v registry: OBSERVE, vratná, interná) · **NAVRH:** `guardian.finding.record` (nová registrovaná akcia: ANALYZE, vratná, interná, bez externého poskytovateľa; zápis/uzavretie nálezu). Nová akcia je položka P09; kým nie je v `packages/control-contract`, zápis nálezu je FORBIDDEN (pravidlo „akcia bez záznamu"). |
| **FORBIDDEN ACTIONS (DO-NOT-DO)** | Pozri §2. |
| **DECISION RIGHTS** | Smie rozhodnúť len: „vek bez reakcie > X ⇒ zaradiť do zoznamu". Nesmie rozhodnúť: kvalifikáciu leadu, skóre, prioritu predaja, či sa lead „stratil", či kontaktovať, obsah/čas správy. |
| **MEMORY POLICY** | Bezstavový. Stav je len v `guardian_findings` (open/resolved). Žiadna voľná pamäť. Odvodenie „reakcia neexistuje" sa neukladá ako fakt o klientovi, len ako otvorený nález, ktorý sa auto-uzavrie, keď sa objaví reakcia. Stav `unknown` sa nikdy nezmení na „bez reakcie". |
| **APPROVAL POLICY** | Nič nevyžaduje schválenie, lebo nič nevychádza mimo kancelárie (Tier 0/1). Každý krok smerom ku klientovi robí človek (maklér volá/píše). |
| **FAILURE POLICY** | X nenastavené ⇒ `NEKONFIGUROVANÉ`, žiadne nálezy. Zdroj reakcií nedostupný (dotaz zlyhá) ⇒ beh končí chybou, nevytvára nálezy „naslepo" a nepíše „0". Prvý beh s viac než `GUARDIAN_BASELINE_FINDING_KILL` nálezmi ⇒ upozornenie foundera. Chyba jedného leadu nezastaví dávku. |
| **ESCALATION CONDITIONS** | Pokrytie M0 pod prahom (P04) · baseline záplava nálezov · nález s lead mimo tenanta · akýkoľvek pokus o odoslanie · pokus meniť X/T0 z kódu stroja. Eskalácia = zápis pre foundera v `routine_notifications` typu `ceo_command` (existujúci vzor v `runner.ts`). |
| **COST LIMIT** | LLM: 0 tokenov, 0 €. DB: `GUARDIAN_BATCH_LEAD_LIMIT` = 500 leadov na beh (existuje). Reálny náklad behu: **NEMERANÉ**. |
| **TIME LIMIT** | Jeden beh na agentúru; presný strop trvania: **NEMERANÉ** (existujúci Guardian zapisuje `durationMs`, takže po prvom behu bude meraný). |
| **SUCCESS CRITERIA** | P04 §5: M1 −30 % pri n ≥ N_min a M0 nezhoršené; M4 sledovaný; kill pri < 10 % zlepšení. Všetko pre-registrované. |
| **EVAL SUITE** | §3. |
| **HANDOFF FORMAT** | §4. |

### TIER každej akcie (Blueprint §8)

| Akcia | Tier | Dôvod |
|---|---|---|
| Čítať leady a eventy kancelárie | 0 | informačná |
| Zostaviť a zobraziť zoznam | 0 | informačná |
| Vložiť nález `NO_FIRST_RESPONSE` | 1 | vratná, interná, auto-uzavretie |
| Uzavrieť nález | 1 | vratná |
| Zapísať súhrn behu do `routine_notifications` | 1 | interný log |
| Zmeniť status/`updated_at`/priradenie leadu | **FORBIDDEN** | bol by Tier 3 „modify customer data" |
| Odoslať správu (e-mail/SMS/WhatsApp) | **FORBIDDEN** | Tier 3, WALL-EXTERNAL |
| Migrácia `guardian_findings.rule_code` | Tier 3, len founder, mimo agenta |
| Zmeniť X, T0, kill switch | Tier 3 konfigurácia, len founder |

## 2. FORBIDDEN ACTIONS (DO-NOT-DO)

Povinný základ `NEVER` z `agent-specs.ts` (dedí sa doslovne) plus špecifické:

1. send without a human approval (a strážca nemá žiadnu odosielaciu cestu)
2. send while AGENT_KILL_SWITCH is on
3. decide lead score or qualification (deterministic rules own that)
4. write outside the lead's agency
5. odoslať akúkoľvek správu klientovi; pripraviť text správy (to robí sweep + maklér)
6. zmeniť `leads.status`, `updated_at`, `score`, `assigned_*`, `last_contact`, `last_contact_at`
7. považovať `last_contact_at`, `auto_response_sent_at`, AI návrh, zmenu statusu alebo `updated_at` za reakciu
8. zapísať `contact_attempted` v mene človeka (aktér je vždy `actor_profile_id` človeka; `source` nikdy nepredstiera `manual`)
9. zobraziť stav `unknown` ako „bez reakcie" alebo „0 čakajúcich"; nemerané sa nezobrazí ako číslo
10. použiť zabudovanú predvolenú hodnotu X; nastaviť, zmeniť alebo „naučiť" X, T0 či allowlist zdroja
11. nazvať veľkosť čakania „SLA", „porušenie" ani zobraziť percento plnenia navonok (`lead-revenue-engine-v1.md` §8)
12. zahrnúť lead zo zdroja mimo allowlistu alebo vzniknutý pred T0 (importy, demo, testy)
13. poslať PII (meno, telefón, e-mail) do e-mailu, logu, notifikácie alebo modelu
14. zavolať LLM (nie je zapojený; pridanie LLM = nová verzia špecifikácie a P13 Red Team)
15. rozširovať vlastné oprávnenia, vypínať kill switch, meniť governance alebo registry
16. vytvoriť druhý register agentov alebo druhú tabuľku nálezov
17. zapisovať do `follow-up-sweep` stavu (`ai_followup_count`, `last_ai_followup_at`)
18. po vypnutí kill switchu pokračovať vo vyhodnocovaní (pravidlo musí prestať žiariť, nálezy sa auto-uzavrú)
19. zobrazovať per-maklér rebríčky/hodnotenie výkonu (mimo rozsahu; zamestnanecký rozmer, P06 §6)
20. zahrnúť do textov meno referenčného klienta

## 3. EVAL SUITE (pozitívne aj na ZAKÁZANÉ správanie)

Testovacie súbory ešte **neexistujú**. Toto je zoznam prípadov, ktoré musí P09 doručiť. Stav: NAVRH (nič nebolo spustené). Každý prípad je overiteľný príkazom `npm run test` v `apps/crm`.

**Žiadúce správanie**

| ID | Prípad | Očakávanie |
|---|---|---|
| E-P1 | Lead vznikol pred 5 h, bez eventov, X = 4 | v zozname, vek 5 h |
| E-P2 | Lead pred 5 h, `contact_attempted` pred 1 h (ľudský aktér) | nie v zozname; otvorený nález sa uzavrie |
| E-P3 | Lead pred 3 h, X = 4 | nie v zozname |
| E-P4 | Viac leadov | najstarší prvý; pri zhode vek podľa `lead_id` (úplné poradie) |
| E-P5 | `contact_attempted` bez `occurred_at` | stav `unknown`, zobrazené „čas reakcie chýba", nie „bez reakcie" |
| E-P6 | Dvojklik (2 eventy) | použije sa `min(occurred_at)`, žiadny dvojitý nález |
| E-P7 | Opakovaný beh s rovnakým `now` | rovnaký výsledok (idempotentné, unikátny otvorený nález) |
| E-P8 | Terminálny status (Uzavretý/Stratený/Neaktívny/Archivovaný) | nie v zozname |
| E-P9 | Zoznam bez pokrytia (žiadny zapisovač reakcií) | „Reakcie sa zatiaľ nezaznamenávajú", nikdy „0" |

**Zakázané správanie (musí zlyhať/odmietnuť)**

| ID | Prípad | Očakávanie |
|---|---|---|
| E-F1 | `FIRST_RESPONSE_AFTER_HOURS` nenastavené | pravidlo nežiari, hlási `NEKONFIGUROVANÉ`, 0 nálezov |
| E-F2 | Lead s `auto_response_sent_at` = `last_contact_at`, žiadny event | **stále bez reakcie** (auto-potvrdenie nie je reakcia) |
| E-F3 | Len zmena `updated_at`/status/AI skóre | stále bez reakcie |
| E-F4 | Lead vzniknutý pred T0 (import) | vylúčený |
| E-F5 | Lead zo zdroja mimo allowlistu | vylúčený |
| E-F6 | Lead inej agentúry | nikdy v zozname ani v náleze (tenant) |
| E-F7 | Kód strážcu sa pokúsi zavolať odosielaciu funkciu | test statickej kontroly: žiadny import `send`/`resend`/`approve-draft`; zlyhá |
| E-F8 | Kód sa pokúsi zapísať `leads` (status, updated_at) | test: žiadny `.update` na `leads`; zlyhá |
| E-F9 | Výstup digestu/logu/notifikácie obsahuje meno/telefón/e-mail | `assertDigestNoPii`-štýl test zlyhá |
| E-F10 | Použitie slova „SLA"/percento plnenia v UI texte | test na zakázané reťazce zlyhá |
| E-F11 | Kill switch zapnutý | žiadne nové nálezy, otvorené sa uzavrú |
| E-F12 | Akcia `guardian.finding.record` nie je v registry | zápis odmietnutý (FORBIDDEN) |
| E-F13 | Dotaz na `lead_events` zlyhá | beh skončí chybou; nezapíše „0" ani nálezy |
| E-F14 | `contact_attempted` s `actor_profile_id = NULL` (systém) | nepočíta sa ako ľudská reakcia |
| E-F15 | Pokus o zápis cez agenta `contact_attempted` | odmietnuté |
| E-F16 | Importovanie LLM klienta v module pravidla | test na zakázaný import zlyhá |

Plus **RLS test tenant izolácie** pre `guardian_findings` (centrálny `rls-tenant-isolation.test.ts`, AP-002) a **Red Team** (P13), ak pôjde o HARDENED.

## 4. HANDOFF FORMAT

Každé odovzdanie (PR, beh, vyhodnotenie) má tvar: **TASK · STATUS · CHANGES · EVIDENCE · TESTS · CHECKS NOT RUN · RISKS · BLOCKERS · NEXT ACTION**. Pre ranný beh sa „EVIDENCE" zhoduje so súhrnom v `routine_notifications` (počty podľa pravidla, `mode`, `durationMs`, `openAfterRun`), vždy bez PII.

## Príloha A — návrh záznamu pre `agent-specs.ts` (iba ak founder chce register)

Platí len po úprave testu (§0). Je to dokumentačný návrh, nie kód na vloženie.

```text
agentId:        REVOLIS-FOLLOWUP-GUARD
kind:           internal_intelligence
domain:         revolis                     // dnes typ AgentDomain pozná "revolis" | "onlinovo"
version:        0.1.0
mission:        Daily deterministic list of open enquiries with no human reaction for longer than X hours.
trigger:        Vercel cron (po guardian-run); kill switch FOLLOWUP_GUARD_DISABLED (NÁVRH názvu)
inputs:         leads (open, after T0, source allowlist), lead_events contact_attempted, FIRST_RESPONSE_AFTER_HOURS
outputs:        guardian_findings NO_FIRST_RESPONSE, in-app list, routine_notifications summary (no PII)
allowedActions: [lead.observe, guardian.finding.record]   // druhá akcia zatiaľ NEEXISTUJE v control-contract
forbiddenActions: [...NEVER, ...§2]
promptVersion:  none (deterministic; LLM not wired)
model:          none (deterministic; LLM not wired)
approvalPolicy: Recommends only; every step towards a client is a human act.
memoryPolicy:   Stateless; state only in guardian_findings.
failurePolicy:  see §1
evaluationSuite:[ NAVRH súbory z §3 — musia existovať, test "its evaluation suite and code files exist" ]
owner:          founder
code:           [ src/lib/guardian/rules.ts, src/lib/guardian/runner.ts ]
```

Poznámka: `NEVER` v súbore je dnes neexportovaná konštanta; nový záznam v tom istom súbore ju môže použiť.
