# Demand OS — gap audit Revolisu na reálnych dátach + kontrola návrhu z ChatGPT

**Dátum:** 2026-09-29 · **Podnet:** founder zdieľal analýzu z ChatGPT
(„Revolis = Demand Operating System", 7-dňový agentický sprint) a označil ju za
pohľad bližší svojej predstave. Sám ChatGPT za podmienku buildu uviedol reálny
gap audit `apps/crm` + Supabase + PROD. Tento dokument je ten audit.

**Metóda:** statický audit kódu (vstupné body, crony vo `vercel.json`, tabuľky,
testy) + **počty z PROD** Supabase (`ypgajkhqtbriqqmyawyv`), iba agregáty, žiadne
osobné údaje.

> **Ako čítať tento PR (audit trail).** Tento dokument je **audit**, nie
> build. Oddelenie:
> - **Nálezy** (fakty s dôkazom): sekcie 1–2 a 4–5.
> - **Rozhodnutia foundera** (2026-09-29): pozri tabuľku nižšie.
> - **Schválený build scope:** iba `GO DEMAND-D1` + `DEMAND-BACKFILL EXPERIMENT`,
>   implementované v **samostatnom PR**. Sekcia 3 (D2–D7) je **plán, nie schválený
>   scope**. Každý ďalší deň potrebuje vlastné GO.
>
> | Rozhodnutie | Stav | Kde |
> |---|---|---|
> | Revolis = systém okolo dopytu (Truth → Intelligence → Automation) | PRIJATÉ | founder, 2026-09-29 |
> | `GO DEMAND-D1` + backfill experiment | SCHVÁLENÉ na build | samostatný implementačný PR |
> | D2 (bezpečnosť + pravdivé čísla) | P0 podľa foundera, **čaká na GO** | — |
> | D3–D7 | plán, **neschválené** | — |
> | MCP, bus runtime, Sentry, veľké command center, Projekt B ako hlavný sprint | ODLOŽENÉ | founder, 2026-09-29 |
> | Merge tohto PR | **nemergovať len preto, že je CI zelené** | founder, 2026-09-29 |
> | #749 (D1) do review/merge pipeline | GO | founder, 2026-09-29 (druhé kolo) |
> | Backfill experiment ako formálny gate (gold dataset, UNKNOWN ≠ chyba, unsupported = 0) | GO | #749 |
> | Audit všetkých volaní LLM na PII (P0 gate) | GO → hotový | #750 |
> | `DEMAND_EXTRACTION_ENABLED=true` na PROD | **WAIT**: až po backfill gate + privacy gate | — |
> | Automatický outbound na 439 starých leadov | **NIE** | — |
> | Pipeline € bez reálneho zdroja rozpočtu | **NIE** | — |
> | Metrika „feature complete“ → Capability Truth Matrix (CODE / VERIFIED / PRODUCTION PROVEN) | PRIJATÉ | `docs/architecture/capability-truth-matrix.md` |

---

## 1. Verdikt k návrhu z ChatGPT

**Smer: ÁNO.** Revolis ako systém okolo dopytu, nie ako 50 modulov; produktové
princípy Proonu (jeden kontext, automatizácia opakovaného, AI vo workflow,
lokálna hĺbka) bez kopírovania kódu, dizajnu a textov; človek ako schvaľovacia
vrstva. To sedí s Ústavou aj s tým, čo Revolis už stavia.

**Opravy faktov a rozsahu (Kontrolór):**

| Tvrdenie | Realita (dôkaz) | Dôsledok |
|---|---|---|
| „Revolis už má buyer prediction, matching, scoring" | PROD: `lead_property_matches` **0**, `lead_scores` **0**, `buyer_intents` **3**, `deal_outcomes` **1** | Je to kód, nie fungujúca funkcia („paper features") |
| Scope 22 položiek LIVE za 7 dní vrátane MCP, event bus, billing entitlements, observability | MCP server (`packages/mcp-crm`) číta **natvrdo zadané falošné leady**; inter-agent bus je nástroj pre vývojových agentov, nie runtime produktu; žiadny Sentry, `healthz` nekontroluje DB | Za 7 dní nereálne; polovica je nová infraštruktúra |
| Command center: „€1,8M demand pipeline" | `lib/forecasting-store.ts:91` dosadí **180 000 €** každému leadu bez rozpočtu; rozpočet nemá **94 %** leadov | Dnes by to bolo **vymyslené číslo** — v rozpore s pravidlom „žiadne falošné čísla" |
| Chýba v návrhu | **94 % leadov (482 z 513) nemá lokalitu ani rozpočet** | Najväčšia medzera nie je AI, ale **zachytenie dopytu**. Bez neho sú scoring, matching aj predikcia prázdne |

**K „500 ubytovaní → Proon je nový projekt":** záver „sú na začiatku" je
pravdepodobný, ale nie z tohto výpočtu. „500+ ubytovaní" skôr znamená 500+
ubytovacích zariadení (objektov), nie 500 nocí, a jeden hotel ich teda
„nespotrebuje". Číslo sa nedá overiť. Silnejšie signály, že sú skorí:
mobilná appka „Čoskoro", podpora Po–Pi 8 h pre biznis, ktorý beží 24/7,
predaj cez konzultáciu, produkt prevádzkuje webová agentúra
(MR. Digital Studio s. r. o.), ktorá cez neho predáva svoje služby
(weby od 490 €, nastavenie portálov od 400 €, fotenie, n8n automatizácie).

## 2. Stav Revolisu — capability matrix (kód + PROD)

**PROD, 2026-09-29:** 513 leadov · 439 z nich je import `realvia_import_smolko`
(všetky staršie ako 90 dní) · **9 nových za 30 dní, 2 za 7 dní** (portály
nehnutelnosti.sk, reality.sk, bazoš, web formulár) · 511 prešlo AI triage ·
0 automatických odpovedí odoslaných.

| Slučka Demand OS | Stav | Dôkaz |
|---|---|---|
| Capture: e-mail z portálov | **Funguje** (endpoint) | `api/acquire/email`, 8 testov; nové leady z portálov prichádzajú |
| Capture: Gmail pull | Kód bez spúšťača | nie je vo `vercel.json`, externý cron nezdokumentovaný |
| Capture: Realvia fronta | Čiastočne | webhook ukladá, worker `cron/realvia-process` bez plánovača v repozitári |
| Normalizácia, deduplikácia | Čiastočne | dedup len podľa e-mailu / acquire kľúča, žiadne spájanie identity naprieč zdrojmi |
| **Extrakcia dopytu** (lokalita, rozpočet, typ) | **CHÝBA** | z textu e-mailu sa nič neextrahuje; `api/leads/inbound:119-122` ukladá prázdne polia **zámerne** — formulár sa na ne nepýta a AP-001 zakazuje vymýšľať |
| Scoring | Čiastočne | heuristika len na tlačidlo; BRI mŕtve (`events` = 0, cron neplánovaný) |
| AI triage (priorita) | **Funguje** | `cron/lead-ai-triage`, 511/513 leadov |
| Buyer prediction | Čiastočne | beží len vo verejnom buyer-onboardingu |
| Matching | Kód, **0 výsledkov** | chýbajú dáta o dopyte; `cron/daily-match` neplánovaný |
| Next best action | Čiastočne | počítané v prehliadači; `/api/daily-actions` bez UI; ranný brief posiela 0 (nastavenia nie sú v UI) |
| Follow-up | **Funguje** so schválením | `cron/follow-up-sweep` → návrh → schválenie cez `authorize-send` + kill switch |
| Reaktivácia | Čiastočne | `cron/seller-rescue` tvorí úlohy; `dead-lead-campaign` bez UI |
| Pipeline / obchody | Čiastočne | kanban nad `leads.status`, tabuľka obchodov neexistuje |
| Agentická vrstva | Čiastočne | `ai_action_audit` (234 riadkov), limity nákladov len na 2 routes |
| MCP | **MOCK** | falošné dáta v pamäti |
| Observability | Slabá | `healthz` vždy „ok", bez Sentry, alerty len z neplánovaného cronu |

**Bezpečnostný nález:** automatická odpoveď na nový lead
(`lib/acquire/send-inbound-auto-response.ts:130`) a ghostwriter `send-email`
**obchádzajú schvaľovaciu bránu** `authorizeSend`. Na PROD sa zatiaľ nič
neodoslalo (0), ale riziko ostáva v kóde.

**Ďalšie čísla, ktoré používateľ vidí a nie sú pravdivé:** počítadlo miest na
landing page („13/20 obsadené", náhodne pribúda), náhodný progress bar v
AcquisitionHub, pevne zadané pravdepodobnosti výhry vo forecaste.

## 3. Upravený 7-dňový Demand sprint — PLÁN, schválený je iba D1

Princíp: **najprv naplniť slučku reálnymi dátami, potom inteligencia.**
Každý krok ide cez PR, CI a GO foundera pred PROD.

| Deň | Blok | Dôkaz hotovosti na PROD |
|---|---|---|
| D1 | **Extrakcia dopytu** z e-mailov z portálov (LLM, Haiku) do `location/budget/property_type/rooms` (len čo je v texte, nič nedopočítavať) + nepovinné polia dopytu vo webovom formulári | nové portálové leady majú vyplnený dopyt (dnes 0 z 9) |
| D2 | **Bezpečnosť:** auto-odpoveď a ghostwriter cez `authorizeSend`; odstrániť falošné počítadlo a náhodné progress bary | test: žiadne odoslanie mimo brány |
| D3 | **Plánovače:** gmail-pull, realvia-process, daily-match do `vercel.json`; `healthz` s kontrolou DB | behy v logoch, fronta Realvia sa spracúva |
| D4 | **Matching na reálnych dátach** (tenant klient v daily engine) | `lead_property_matches` > 0 pre leady s dopytom |
| D5 | **Reaktivácia 439 starých kontaktov — najprv GDPR brána.** Sú importované z Realvie, súhlasov je v systéme **4**. Výstup = segmentácia + návrhy správ na schválenie maklérom, **nič sa neodosiela** | záznam `gdpr-advisor` + zoznam kandidátov |
| D6 | **Command center pravdivo:** namiesto 180 000 € „N leadov bez rozpočtu"; ranný brief (nastavenia do UI); fronta akcií z `daily-actions` | dashboard bez odhadovaných čísel |
| D7 | Red team (RLS sonda, duplicity, zlý vstup, slučky e-mailov) → **GO founder** | CI zelené, výsledok sondy |

**Mimo sprintu (BACKLOG, s dôvodom):** MCP server (bez reálnych dát by len
ovládal prázdnu slučku), inter-agent bus ako runtime produktu, Sentry a
plná observabilita (samostatný blok), tabuľka obchodov.

## 4. Čo si vziať z Proonu pre Revolis (overené z ich webu)

- **AI nevidí osobné údaje:** Proon posiela do AI anonymizované mená
  („Adam R."), bez čísel dokladov a adries. Revolis posiela do LLM celé leady —
  prevziať ako princíp pre D1 (extrakcia dopytu nepotrebuje meno).
- **Marketingová databáza so súhlasom:** zber súhlasov je súčasť toku, nie
  dodatok. Pre nás priamo relevantné pri D5.

## 5. Projekt B — doplnenie z Proon cenníka (overené, text z webu)

PMS **19 €/mes.** + 14 € za každý ďalší apartmán (alebo 1 € za noc) · API
napojenie na portály **+7 €/apartmán/mes.** · rozšírená podpora od 40 €/mes. ·
nastavenie portálov 90 €/h · fakturácia SuperFaktúra, KROS, iDoklad, mPohoda ·
platby Stripe, GoPay · 40+ zámkov (Nuki, TTLock, Igloohome, Yale, Salto, Tedee) ·
kanály Booking, Airbnb, Expedia, Vrbo, Agoda, Trip.com, Hauzi, Google,
Megaubytovanie · doplnkové služby (6 typov cien, 6 jazykov).

Dôsledok pre Projekt B: ich príplatok za API je 7 € za apartmán, náklad cez
Channex je ~0,50 $ za jednotku → priestor na nižšiu cenu je reálny.
Plán Projektu B (`docs/strategy/2026-09-29-projekt-b-str-plan.md`) stále čaká
na GO a tri odpovede foundera.
