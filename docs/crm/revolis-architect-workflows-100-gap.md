# Revolis SaaS CRM Architect – medzery do 100 % (W1–W4)

Referenčná špecifikácia: štyri „money“ workflowy (batch triage, follow-up stroj, call summary → CRM, deal health). Nižšie je stav oproti súčasnému `apps/crm` kódu a čo doplniť, aby sa správanie zhodovalo s playbookom.

### Jazyková konvencia (slovenčina)

- **`leads.ai_priority`** – v DB len tri kanonické hodnoty (CHECK / enum): **`Vysoká`**, **`Stredná`**, **`Nízka`**. (Žiadne anglické `HIGH` / `MED` / `LOW` v produkčných dátach.)
- **`leads.ai_reason`** – krátky dôvod **v slovenčine** (maklérovi zrozumiteľná veta, bez anglicizmov ak sa dá).
- **Prompt pre Haiku (W1)** – systémový a užívateľský text inštrukcie **slovensky**; model musí vracať `priority` ako presne jednu z: `Vysoká` | `Stredná` | `Nízka` + `reason` po slovensky. Pri parsovaní v kóde mapovať neznáme/halucinované hodnoty na `Stredná` + log varovania.
- **W2 generované správy** – telo follow-upu predvolene **slovensky** (tón mäkší/tvrdší tiež opísať po slovensky v prompte).
- **W3 summary / next steps** – výstup z LLM **slovensky** pred zápisom do CRM (zodpovedá súčasnému `call-analysis` kontextu SK trh).

---

## Súhrnná matica

| WF | Názov | Stav dnes (skrátene) | Čo chýba do „100 %“ playbooku |
|----|--------|----------------------|--------------------------------|
| **W1** | Lead → Deal triage | Heuristické skóre, `DailyActionPanel`, `rescore-lead` + insight; Morning Brief (iný produkt). | Batch Haiku triage, stĺpce `ai_priority` / `ai_reason`, dedikovaný ranný cron, UI **„Dnešných 10“** + override. |
| **W2** | Follow-up machine | `dead-lead-campaign` (mŕtve / zamietnuté, admin schválenie) + `multi-channel-sender`. | Nightly cron na **otvorené** stagnujúce leady, pravidlá (X dní + stage), limity/guardrails, voliteľný draft-only režim. |
| **W3** | Call summary → CRM | `analyzeCall` + UI s paste; call coach stream. | Zapojený ASR alebo webhook od providera (`/api/ai/call/transcribe` dnes 501), po analýze **atomický** zápis note + task do CRM. |
| **W4** | Deal health (majiteľ) | Forecasting KPI, pipeline, benchmarky. | Explicitné „missed actions“ / health skóre dealu, väzba na úlohy bez splnenia deadline (ak tasks existujú v modeli). |

---

## W1 – Lead → Deal triage (Top 10 + dôvod z LLM)

### Playbook cieľ

- Ranný job: otvorení leadi → kompaktný stav → **batch Haiku** (10–20 naraz) → priorita **`Vysoká` / `Stredná` / `Nízka`** + krátky dôvod v slovenčine.
- Persist do CRM: polia typu `ai_priority`, `ai_reason` (a ideálne `ai_triage_at`).
- UI: **„Dnešných 10“** + možnosť **override** (maklér nie je uväznený v AI).

### Súčasný kód (orientačné odkazy)

- Heuristiky: `src/lib/ai-scoring.ts`, `src/lib/ai-engine.ts`, `src/components/dashboard/DailyActionPanel.tsx`
- Morning Brief (iný tok): `src/app/api/cron/morning-brief/route.ts`, `src/lib/morning-brief/*`
- Rescore: `src/lib/rescore-lead.ts`

### Medzery → konkrétne dodávky

| # | Položka | Návrh |
|---|---------|--------|
| W1-1 | DB | Migrácia: `leads.ai_priority` **TEXT** + `CHECK (ai_priority IN ('Vysoká','Stredná','Nízka') OR ai_priority IS NULL)`; `leads.ai_reason` (text, SK); voliteľne `leads.ai_priority_overridden_at` / `leads.ai_priority_manual` ak chcete BI bez zmazania AI. |
| W1-2 | Cron | Nový route napr. `src/app/api/cron/lead-ai-triage/route.ts` + zápis do `vercel.json` (napr. raz denne pred prac. dobou). Auth: `CRON_SECRET` ako ostatné cron joby. |
| W1-3 | Logika | Modul napr. `src/lib/ai/lead-triage-batch.ts`: načítanie otvorených leadov po agentúre, zostavenie kompaktného JSON payloadu, `callClaude` + `CLAUDE_HAIKU`, parsovanie výstupu, `update` po batchoch. |
| W1-4 | UI | Sekcia na dashboarde alebo `/leads`: **10 leadov** zoradených podľa priority (najprv `Vysoká`), zobrazenie `ai_reason`, akcia „Prepíš prioritu“ (výber/zadanie stále iba `Vysoká|Stredná|Nízka`) → update `leads`. |
| W1-5 | SLO / náklady | Limit veľkosti batchu, timeout (existujúci pattern `withAiTimeout`), metriky (počet leadov / deň). |

**Navrhovaný PR:** `feat(crm): lead AI triage cron + DB columns` (samostatný); druhý PR `feat(crm): Dnešných 10 UI + override priority (SK)`.

---

## W2 – Follow-up stroj (stenujúce **otvorené** leady)

### Playbook cieľ

- Cron (nočný): leady bez aktivity **X dní** a v určitom **stage**.
- LLM: jedna funkcia „generate_followup_message(state)“, tón (**mäkký / priamy** – prompt po slovensky), či CC makléra alebo auto.
- Text správy pre klienta predvolene **slovensky** (W2, pozri konvencia hore).
- Odoslanie cez existujúcu bránu alebo **draft**; anti-spam limity.

### Súčasný kód

- `src/lib/ai/dead-lead-campaign.ts` – batch Haiku + message; cieľové statusy sú skôr „mŕtvi“ ako otvorený pipeline.
- `src/lib/multi-channel-sender.ts` – odosielanie (Haiku tam tiež figuruje v častiach kanála).
- API: `src/app/api/ai/dead-lead-campaign/route.ts`

### Medzery → konkrétne dodávky

| # | Položka | Návrh |
|---|---------|--------|
| W2-1 | Výber leadov | Nový modul + cron `src/app/api/cron/follow-up-sweep/route.ts`: dotaz na leady `status NOT IN (closed...)` + `last_contact_at < now() - interval 'X days'` + voliteľne cap na počet / agentúru. |
| W2-2 | LLM | Buď rozšíriť dead-lead prompt pre „open stale“, alebo nový `src/lib/ai/open-followup-generator.ts` (lepšia čitateľnosť ako zmiešať dva use cases). |
| W2-3 | Guardrails | Tabuľka alebo stĺpce: `last_ai_followup_at`, `ai_followup_count`; env `FOLLOWUP_MAX_PER_LEAD_PER_WEEK`; respektovať `email` unsub / DNC ak máte. |
| W2-4 | Režim | Env `FOLLOWUP_MODE=draft|send`; pri `draft` uložiť do `activities` alebo `draft_messages` bez `sendMessage`. |
| W2-5 | Audit | Každý návrh + odoslanie log do `activities` / events (už máte `events` pre BRI – zvážiť konsolidáciu). |

**Navrhovaný PR:** najprv `feat(crm): follow-up sweep query + rate limits (DB)`; potom `feat(crm): cron + Haiku generator`; potom `feat(crm): draft vs send wiring`.

---

## W3 – Call summary + next steps → CRM

### Playbook cieľ

- Transkript z providera → LLM summary + kroky → zápis **note + tasks**.

### Súčasný kód

- Analýza: `src/lib/ai/call-analysis.ts`, API `src/app/api/ai/call/analyze/route.ts`
- Transkript: `src/app/api/ai/call/transcribe/route.ts` vracia 501
- UI: `src/components/call-analyzer/call-analyzer-client.tsx`

### Medzery → konkrétne dodávky

| # | Položka | Návrh |
|---|---------|--------|
| W3-1 | Vstup transkriptu | Implementácia jednej cesty: (A) Twilio recording + callback webhook, alebo (B) AssemblyAI/Deepgram + `transcribe/route.ts` bez 501. |
| W3-2 | Persist | Rozšíriť `POST /api/ai/call/analyze` o `lead_id` (a `agent_id`): po `analyzeCall` volať existujúce `createActivity` + vytvorenie taskov (API alebo store), transakčne kde sa dá. |
| W3-3 | UI | Po analýze ponúknuť „Uložiť do leada“ s výberom leada ak chýba `lead_id`. |
| W3-4 | GDPR | Flag súhlasu s nahrávkou na lead / call session (mimo scope čistého CRUD – legal). |

**Navrhovaný PR:** `feat(crm): transcribe provider X` oddelene od `feat(crm): analyze persists activity+tasks`.

---

## W4 – Deal health (majiteľ)

### Playbook cieľ

- Viditeľnosť: pravdepodobnosť dealu + **zmeškané akcie**.

### Súčasný kód

- `src/app/(dashboard)/forecasting/page.tsx`, `src/lib/forecasting-store.ts`

### Medzery → konkrétne dodávky

| # | Položka | Návrh |
|---|---------|--------|
| W4-1 | Metrika | Dotaz: leady vo vysokých stage + otvorené tasks po termíne alebo bez tasku X dní od poslednej aktivity. |
| W4-2 | UI | Nový widget na forecasting alebo samostatná sekcia „Riziká / zmeškané kroky“. |
| W4-3 | Zdroj pravdy | Jednotná definícia „task“ (Supabase tabuľka vs. in-app) – najprv konsolidovať, potom metriku. |

**Navrhovaný PR:** `feat(crm): deal health missed-actions query + panel` (jedna logická zmena).

---

## Odporúčané poradie PR (L99)

1. **W1-DB** – migrácia stĺpcov + typy v `leads-store` / select listoch.
2. **W1-cron+lib** – Haiku batch triage + cron.
3. **W1-UI** – Dnešných 10 + override (SK hodnoty).
4. **W2-DB** – limity / `last_ai_followup_at` (alebo events).
5. **W2-cron** – sweep + generovanie + draft/send.
6. **W3-transcribe** – jeden provider.
7. **W3-persist** – analyze + activity + tasks.
8. **W4-panel** – missed actions na forecasting.

Medzi každým krokom: preview deploy, smoke na dotknuté route, žiadne miešanie W1+W2 do jedného PR.

---

## Akceptačné kritériá ( smoke )

- **W1:** Po crone majú N leadov vyplnené `ai_priority` ∈ {`Vysoká`,`Stredná`,`Nízka`} a `ai_reason` po slovensky; dashboard zobrazí 10; override mení len na tieto tri hodnoty a voliteľne označí „manual“.
- **W2:** Cron v `draft` len píše návrhy do DB/aktivity; v `send` rešpektuje daily cap; žiadny lead nad limitom.
- **W3:** Nahraný / webhook transkript končí zápisom poznámky + aspoň jedného tasku na `lead_id`.
- **W4:** Majiteľ vidí zoradený zoznam dealov s počtom / flagom zmeškanej akcie; čísla sú konzistentné s raw SQL kontrolou.

---

_Dokument je živý: po implementácii aktualizuj stĺpec „Stav“ v matici alebo prepíš sekciu ako „DONE“._
