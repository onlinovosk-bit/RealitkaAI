# P02 — ULTRATHINK: Strážca follow-upu (WP-5)

> Stav: NÁVRH, len dokument. Žiadny kód, žiadny merge, žiadne odoslanie správy.
> Základ: `origin/main` @ `e9ece0f`, 2026-10-09. Čítané z repa, nie z pamäte.
> Značky: FAKT (overené v súbore) · ODVODENÉ · PREDPOKLAD · NEZNÁME · ROZPOR.

## 1. EXECUTIVE VERDICT

**BACKLOG (Strategic Backlog) pre STAVBU. Najbližší krok je MERANIE + 1 rozhovor so zákazníkom, nie kód.**

Dôvod v jednej vete: strážca by dnes strážil dáta, ktoré neexistujú. Pole „prvá reakcia"
neexistuje ako jedno pole, jeho zdroje sú štyri roztrieštené zapisovače a PROD aplikácia
substrátu je neoverená (sekcia 2). VETO Ústavy v2 otázka 8 („príliš skoro" = chýbajú dáta,
Vrstva 2) preto platí bez ohľadu na skóre. Otázka 1 (zaplatila by kancelária) je
neodpovedaná, takže aj bez veta by strop bol VALIDATE.

Dokumenty P03–P08 v tomto balíku sú **kontrakt na poličke** pre chvíľu, keď sa podmienky
odomknú. Nie sú GO na stavbu. (Poznámka k Prime Directive: písanie týchto dokumentov je
samo hodina rizikového kapitálu. Preto sú držané krátke a stavba je zamknutá.)

## 2. REALITY (FAKT / ODVODENÉ / PREDPOKLAD / NEZNÁME / ROZPOR)

| # | Tvrdenie | Značka | Dôkaz |
|---|---|---|---|
| R1 | Follow-up sweep beží 22:00, `mode = "draft"` natvrdo, kandidáta vyberá `updated_at < now − FOLLOWUP_STALE_DAYS` (default 5), cooldown v dňoch | FAKT | `apps/crm/src/app/api/cron/follow-up-sweep/route.ts` (`staleDays`, `.lt("updated_at", cutoff)`, `const mode = "draft"`), `vercel.json` |
| R2 | „Stale" = dlho needitovaný, nie dlho nezodpovedaný. Akákoľvek editácia, AI skórovanie alebo klik v Action Queue posunie `updated_at` | ODVODENÉ | R1 + `DashboardPageClient.tsx:148` (PATCH statusu pri „Volať") |
| R3 | Pole `first_response_at` v repe **neexistuje** | FAKT | grep migrácie + `src`; 0 zhôd |
| R4 | Ekvivalent existuje **v kóde**: `lead_events` + stĺpce `occurred_at`, `actor_profile_id`, `channel`, `outcome`, `source`, typ `contact_attempted` | FAKT | `supabase/migrations/20260924060000_lead_contact_event_substrate.sql`, `src/lib/lead-contact-events/{types,store}.ts` |
| R5 | Migrácia R4 je „PREP ONLY"; v PROD ju aplikuje founder cez Dashboard. Posledný zápis: „bez aplikovania substrát existuje len v kóde, C1 ostáva pending" | FAKT (stav k 2026-09-24) | `memory/decisions.md` ~r. 5610 (`GO_CONTACT_EVENT_PROD_MIGRATION`) |
| R6 | Či je R4 dnes v PROD aplikovaná | **NEZNÁME** | PROD som nečítal (CHECKS NOT RUN) |
| R7 | Zapisovač `contact_attempted` je len UI na detaile leadu (tlačidlá Volať/E-mail) → `POST /api/leads/[id]/contact-attempt` | FAKT | `src/app/(dashboard)/leads/[id]/page.tsx:~242–270`, `src/app/api/leads/[id]/contact-attempt/route.ts` |
| R8 | Ďalšie signály „kontaktu" sú **iné zapisovače**: Action Queue (PATCH `status="Teplý"` + `lastContact` + aktivita „Kontakt"), `leads.last_contact_at` (monotónne, len dopredu) z `markLeadContacted` | FAKT | `DashboardPageClient.tsx:148–160`, `src/lib/leads/mark-contacted.ts`, `src/lib/inbound/approve-draft.ts:235` |
| R9 | **`last_contact_at` zapisuje aj automatické potvrdenie pri vzniku leadu** (`auto_response_sent_at` aj `last_contact_at` = `sentAt`). Použiť ho ako „reakciu" by znamenalo, že šablóna zaráta ako ľudský hovor | FAKT | `src/lib/acquire/inbound-lead-auto-response.ts:~248` |
| R10 | `last_contact_at` bol k 2026-10-02 NULL na 520/520 (a „0 zo 514" v neskoršom zápise) PROD riadkoch; od #800 ho niekto zapisuje | FAKT (historické meranie) | `memory/decisions.md` ~r. 6250, `src/lib/leads/mark-contacted.ts` hlavička |
| R11 | Ranný brief (06:00) už nesie `pendingContact` / `staleContacts48h` ako `number \| null` (nemerané ≠ 0). Je to počet, nie zoznam, a bez prahu v hodinách | FAKT | `src/lib/morning-brief/gather.ts`, `vercel.json` (`0 6 * * *`) |
| R12 | Existuje Guardian: deterministické pravidlá `STALE`, `NO_OWNER`, `NO_PHONE`, `HOT_IGNORED`, tabuľka `guardian_findings` (unikátny otvorený nález, auto-resolve), `guardian-run` 06:00, `guardian-digest` 09:00. `HOT_IGNORED` meria `max(lead_events.created_at, updated_at, created_at)`, teda tá istá chyba ako R2 | FAKT | `src/lib/guardian/{rules,runner,config,digest}.ts`, migrácia `20260727120000_guardian_v1_blok_c.sql` |
| R13 | Guardian na PROD beží len pre agentúry v `GUARDIAN_AGENCY_ALLOWLIST`; digest je default vypnutý (`GUARDIAN_DIGEST_ENABLED`). Či je to dnes zapnuté | **NEZNÁME** | `src/lib/guardian/config.ts`; env som nečítal |
| R14 | ROZPOR (drobný): komentár digestu hovorí 07:00, `vercel.json` má `0 9 * * *` | ROZPOR | `guardian-digest/route.ts` vs `vercel.json` |
| R15 | Príjem e-mailov: 22× `not_a_lead`, 1× `lead_created` z 23, a ten jeden bol **testovací mail z `revolis.ai`**. Skutočných dopytov vo vzorke 0 | FAKT | `docs/STATUS.md` r. 105 |
| R16 | `inbound_mail_outcomes` nemá `lead_id` ani PII; nedá sa joinnúť na `leads` | FAKT | migrácia `20261001100500_inbound_mail_outcomes.sql` |
| R17 | `not_a_lead` nikdy nevytvorí riadok v `leads` → strážca čítajúci `leads` šum z R15 nevidí. Šum hrozí z iného zdroja: 514 historických/importovaných leadov (`created_at` = čas importu, nie dopytu) | ODVODENÉ | R16 + `memory/decisions.md` ~r. 6250 (514 leadov); import: `master-data-sourcing-map.md` Zhluk 8 |
| R18 | `leads.source` je voľný text (default `'Inbound'`), 14 rôznych hodnôt. Zoznam hodnôt = „skutočný dopyt" | NEZNÁME | `src/lib/inbound/process-lead.ts:80`, `decisions.md` ~r. 6250 |
| R19 | Tabuľka `broker_events` má `received_at`/`responded_at` (`message_responded`), ale v `src` ju žiadny kód nezapisuje | FAKT | migrácia `20260426143000_broker_trust_protocol.sql`; grep `src` 0 zhôd |
| R20 | `agent-specs.ts` má **7** špecifikácií, nie 4: 4 Revolis `customer_facing_send` + 3 `ONL-*` `internal_intelligence`. Test proti driftu pre `internal_intelligence` vyžaduje záznam v `AGENT_ALLOWED` z `packages/mcp-onlinovo` a test „non-onlinovo ⇒ customer_facing_send" by revolisového internal agenta zhodil | FAKT | `src/lib/agents/agent-specs.ts`, `src/lib/agents/__tests__/agent-specs.test.ts` |
| R21 | Platí 1 platiaca kancelária (referenčný klient, v texte nepomenovaný). Nájdený zápis z 2026-10-05; zápis z 2026-10-09 som v `decisions.md` nenašiel | FAKT / NEOVERENÝ dátum | `memory/decisions.md` r. 75 |
| R22 | Engine kontrakt: `EXTERNAL_SLA = NONE`; „4 pracovné hodiny" je len PREDPOKLAD; vek smie radiť, nesmie sa volať SLA a v UI nesmie byť „SLA compliance/breach %" | FAKT | `docs/architecture/lead-revenue-engine-v1.md` §8 |
| R23 | Existuje `lead-queues/assemble.ts` (fronta A „ranný zoznam" s dôvodom `never_contacted`), deterministická, bez LLM. Žiadny volajúci mimo `src/lib/lead-queues` ani testov som nenašiel | FAKT | `src/lib/lead-queues/{types,assemble}.ts`; grep `assembleQueues` |
| R24 | Už existuje KPI „podiel leadov s prvým kontaktom do 24 h" (`computeContactedWithin24hPercent`, volané z `/api/followup`), ale počíta z `leads.last_contact` (legacy text), teda **posledný** kontakt ako „prvý", a leady bez parsovateľného času ostanú v menovateli. Neúplný aj skreslený; **nepoužiť ako baseline** | FAKT | `src/lib/agents/followup/kpi.ts`, `src/app/api/followup/route.ts` |

## 3. FAILURE ANALYSIS (najprv zabi plán)

- **Najväčšia neoverená domnienka:** že dopyty vôbec zostávajú bez reakcie dlhšie než X hodín. Nikdy sme to nezmerali (R3, R10). Ak maklér volá do 30 minút mimo CRM (telefón), strážca bude mlčať alebo, horšie, hlásiť falošné „bez reakcie".
- **Najpravdepodobnejší failure mode: falošné pozitíva.** Reakcia mimo CRM sa nezachytí (hovor z mobilu, WhatsApp). Strážca ukáže lead, ktorému maklér už volal. Maklér po 3. takomto zozname zoznam prestane otvárať (rovnaký mechanizmus, ktorý varuje `lead-queues/types.ts`).
- **Druhý failure mode: falošné negatíva z auto-potvrdenia (R9).** Ak sa „reakcia" odvodí z `last_contact_at`, šablóna zakryje každý dopyt a strážca nikdy nezapíska.
- **Najdrahšia chyba:** postaviť rule + migráciu `rule_code CHECK` + nový cron a zistiť, že kancelária má 3 dopyty týždenne. Cena = hodiny + Tier 3 migrácia za zoznam, ktorý maklér vidí aj bez nástroja.
- **Najťažšia závislosť:** jednotný zapisovač reakcie (R7/R8: štyri cesty, jedna kanonická). Bez nej je zdroj pravdy nepoužiteľný.
- **Najsilnejší dôvod NEpokračovať:** Ústava v2 Q8 (dáta chýbajú) + Q1 (nikto sa nepýtal kancelárie).
- **Observer effect:** strážca zvýši logovanie kontaktov v CRM, takže zmeraný čas reakcie sa „zlepší" aj bez skutočnej zmeny správania. Merať treba aj pokrytie (P04 §M0).

## 4. BIGGEST BOTTLENECK

Nie algoritmus (je to jeden SQL/pravidlo), ale **zachytenie reakcie** (P06) a **pravda o dopyte** (R15, R17, R18). Dnes nie je kde čítať „kedy sa prvýkrát reagovalo" bez klamstva.

## 5. FASTEST PATH TO VALUE

1. Aplikovať už hotový substrát (`GO_CONTACT_EVENT_PROD_MIGRATION`, Tier 3, existujúca brána).
2. 2–4 týždne merať prvú reakciu na reálnych dopytoch (čítanie, bez nového kódu).
3. Súbežne **jeden rozhovor s kanceláriou**: koľko skutočných dopytov týždenne a koľko z nich ostane bez hovoru dlhšie než pár hodín. Rieši Q1, Q2 a Customer Avoidance.
4. Až potom rozhodnúť o strážcovi. Ak baseline ukáže problém: **EXTEND Guardian** (jedno nové pravidlo), nie nový agent.

Drabina REUSE → EXTEND → COMPOSE → BUILD:
- REUSE: ranný brief `pendingContact` (počet, null ak nemerané) — nepokrýva zoznam ani prah v hodinách.
- **EXTEND (odporúčané):** Guardian pravidlo (návrh názvu `NO_FIRST_RESPONSE`) + zoznam v CRM/ranný brief. Vyžaduje migráciu `guardian_findings.rule_code CHECK` (Tier 3).
- COMPOSE: `lead-queues/assemble.ts` (fronta A) + jeden nový vstup „čas od vzniku bez reakcie". Možné, ale fronta má ešte nepripojený zdroj dát (R23).
- BUILD: nový cron + nový agent. **Zamietnuté** (duplikuje Guardian, nepotrebuje LLM).
- Nezasúvať do `guardian-digest`: digest je e-mail len s počtami a `assertDigestNoPii` zakazuje mená a telefóny (`digest.ts`). Zoznam „komu zavolať" potrebuje mená, takže patrí do prihláseného CRM/briefu.

## 6. ROI

Prínos: NEMERANÉ (baseline neexistuje). Náklad: Fáza 0 (merať) = 1 Tier 3 migrácia (už pripravená) + 1 rozhovor; Fáza 1 (EXTEND) = odhad malý (PREDPOKLAD, nemeraný), ale s 1 Tier 3 migráciou. ROI sa nedá vyčísliť, kým nie je baseline. Čísla „+X % konverzie" **nevymýšľam**; externé štúdie o rýchlosti odozvy som v tomto repe neoveril.

## 7. RISKS

- **P0:** falošné „bez reakcie" pre reakciu mimo CRM (R7/R8) → strata dôvery v zoznam.
- **P0:** reakcia odvodená z `last_contact_at` zahrnie auto-potvrdenie (R9).
- **P1:** historické/importované leady zaplavia zoznam (R17) → nutný cutoff `created_at ≥ go-live merania`.
- **P1:** názov „Strážca" koliduje s existujúcim Guardianom → zmätok; návrh: pravidlo v Guardiane, nie druhý „strážca".
- **P1:** „X hodín" bez schváleného SLA (R22) a bez definície pracovných hodín.
- **P2:** PII v zozname (mená/telefóny) — len v prihlásenom kontexte, nie v e-mailoch.
- **P2:** retencia/GDPR: vlastné dáta leadov, právny základ v P06 §6.

## 8. OPTIONS (max 3)

| | A: Merať, nestavať (ODPORÚČANÉ) | B: EXTEND Guardian hneď | C: Zahodiť |
|---|---|---|---|
| Dopad | Vznikne prvé meranie prvej reakcie | Zoznam bez baseline | Žiadny |
| Náročnosť | Migrácia (už existuje) + rozhovor | Migrácia substrátu + migrácia `rule_code` + pravidlo + zjednotenie zapisovačov | Nula |
| Riziko | Nízke (substrát je aditívny) | Vysoké: falošné pozitíva, rozbehnuté bez dát | Strata možnej hodnoty |
| Závislosti | `GO_CONTACT_EVENT_PROD_MIGRATION`, makléri používajú tlačidlá | A + schválené X + definícia reakcie | — |
| Čas do hodnoty | 2–4 týždne (tvrdenie o dopyte: NEZNÁME) | Dlhší: stavba, potom aj tak treba dáta | — |
| Ústava | Súlad s Q8 (veto neporušené) | Porušuje veto Q8 | — |

## 9. RECOMMENDED SEQUENCE

0. Founder: rozhodnutie (README, FOUNDER DECISION).
1. `GO_CONTACT_EVENT_PROD_MIGRATION` (existujúca brána) — overiť stav, prípadne aplikovať.
2. Rozhovor s kanceláriou (otázky v P04 §10).
3. 2–4 týždne merania; vyhodnotenie podľa pre-registrovaných pravidiel (P04 §7).
4. Odomknúť Fázu 1 (P03) len ak sú splnené podmienky odomknutia.

## 10. FOUNDER DECISION

Jedno rozhodnutie je v `README.md` (sekcia FOUNDER DECISION), s odporúčaním A.

## 11. NEXT EXECUTION PROMPT

Vyplnený P03 pre možnosť A je v `02-execution-contract-P03.md` (Fáza 0), Fáza 1 je tam ZAMKNUTÁ.

## 12. STOP CONDITIONS

- Founder neschváli X (SLA) ani definíciu reakcie → Fáza 1 sa nezačne.
- PROD overenie ukáže, že substrát nie je aplikovaný a founder migráciu neodobrí → stále len BACKLOG.
- Rozhovor ukáže < N reálnych dopytov (N určí founder; návrh v P04) → záver „nie je problém", REJECT/BACKLOG.
- Akýkoľvek návrh na odosielanie správ zo strážcu → STOP (Tier 3).

---

## Príloha A — Ústava v2, 12 otázok

Skóre píšem iba tam, kde viem odpovedať z dôkazu. Ostatné sú OPEN QUESTION pre foundera.

| # | Otázka | Odpoveď | Základ |
|---|---|---|---|
| 1 | Zaplatil by dnešný klient? (VETO: NIE → max VALIDATE) | **OPEN QUESTION** | Nikto sa kancelárie nepýtal; v repe žiadny dôkaz dopytu. Kým nie je ÁNO, strop = VALIDATE |
| 2 | Zarobí klient viac do 90 dní? | **OPEN QUESTION** | Baseline NEMERANÉ |
| 3 | Skráti Lead → Telefonát? | ÁNO (mechanizmus), veľkosť NEZNÁMA | Strážca cieli presne na krok Lead → Telefonát; efekt nepreukázaný |
| 4 | Posilňuje moat? | **OPEN** (podmienené) | Moat = dáta zo správania maklérov (Vrstva 3); platí len ak sa reakcie zapisujú (R7/R8) |
| 5 | Flywheel? | **OPEN** (podmienené) | Reťazec usage → dáta → lepší produkt nie je doložený |
| 6 | Nové unikátne dáta? | ÁNO | Čas prvej reakcie dnes nikde nie je (R3, R10); väčšina hodnoty však patrí substrátu, nie strážcovi |
| 7 | Vyššie ROI než backlog? | **OPEN QUESTION** | Backlog som nehodnotil; poradie určuje founder |
| 8 | Správny čas? (VETO: príliš skoro → BACKLOG) | **PRÍLIŠ SKORO** (podmienené) | Chýbajú dáta (R5, R6, R10, R15); platí kým nie je substrát aplikovaný a neexistuje aspoň N reálnych dopytov. Definícia Vrstvy 2: „chýba dáta … aby featura fungovala TERAZ" |
| 9 | MVP < 2 týždne? | **OPEN** (odhad, nemeraný) | EXTEND Guardian je malý, ale Tier 3 migrácia a zjednotenie zapisovačov nie sú v odhade |
| 10 | Founder Trap? | **OPEN QUESTION** | Z dôkazu viditeľné: Feature Trap (stavba pred meraním), Technology Bias (agent/LLM bez potreby). Customer Avoidance: vie povedať len founder |
| 11 | Najlepšie využitie času? | **OPEN QUESTION** | Rozhodnutie foundera |
| 12 | Jediná vec tento kvartál? | **OPEN QUESTION** | Rozhodnutie foundera |

**Súčet z dôkazu:** ÁNO 2 (Q3, Q6), preukázané NIE/VETO 1 (Q8), OPEN 9. Súčet sa nedá uzavrieť (aj keby všetky OPEN boli ÁNO, 11/12 = BUILD), preto rozhoduje **veto**: Q8 → BACKLOG; Q1 nepotvrdené → strop VALIDATE.

**Odomykacia podmienka pre Strategic Backlog:** (a) substrát `contact_attempted` overene v PROD a zapisuje reálne reakcie, (b) ≥ N skutočných dopytov nameraných po go-live (N určí founder, návrh v P04), (c) baseline ukáže problém podľa pre-registrovaného pravidla, (d) Q1 = ÁNO od kancelárie.

## Príloha B — DETERMINISTIC vs REASONING

| Činnosť | Trieda |
|---|---|
| Výber otvorených leadov, cutoff, filter zdroja | SQL / RULE |
| Výpočet času od vzniku po prvú ľudskú reakciu | FUNCTION (čistá funkcia) |
| Porovnanie s prahom X | RULE |
| Radenie zoznamu (najstarší bez reakcie prvý) | RULE |
| Vyhodnotenie metriky (medián, pokrytie) | SQL / skript |
| Text návrhu follow-upu | REASONING (LLM) — **mimo rozsahu strážcu**, už rieši existujúci sweep |
