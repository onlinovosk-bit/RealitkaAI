# Revolis.AI — Vlna 1 backlog (PARTIAL/ATRAPA → LIVE)

**Princíp:** 1 PR = 1 logická zmena. Poradie = pomer (zníženie rizika × nízka prácnosť).
Zdroj dôkazov: feature audit 2026-06-03. Odhady = T-shirt z auditu.
**Brána:** feature smie ísť do cenníka/marketingu až keď je jej PR LIVE a otestovaný.

---

## Poradie vykonania

### PR-1 — Dashboard insights: reálny LLM namiesto hardcoded
- **Prečo prvé:** ATRAPA, Vysoké riziko, vidí ju KAŽDÝ používateľ na hlavnej obrazovke; je to pôvod „last 3 contacts" narácie.
- **Čo:** `dashboard/insights/route.ts:34-42` — nahradiť hardcoded SK text + `topHotLeads.slice(0,3)` reálnym LLM zhrnutím z reálnych dát (Haiku/Sonnet), `summary` z DB.
- **Veľkosť:** M (24–40 h)
- **Akceptácia:** insights sa menia podľa reálnych leadov tenanta; prázdny tenant → zmysluplný prázdny stav, nie 3 fiktívne; smoke test s 2 rôznymi agentúrami dáva rôzny výstup.
- **Závislosť:** žiadna.

### PR-2 — Crony do vercel.json (odomyká viac features naraz)
- **Prečo:** XS práca, odblokuje arbitrage, stealth, price-trail naraz.
- **Čo:** `vercel.json` — pridať `arbitrage-scan`, `stealth-recruiter-ingest`, `price-trail` (dnes tam je len pulse/bri/morning-brief/triage/follow-up).
- **Veľkosť:** XS (4–8 h)
- **Akceptácia:** crony bežia v Verceli, logy ukazujú spustenie; DB tabuľky (`arbitrage_matches`, stealth prospects) sa plnia reálnymi dátami.
- **Závislosť:** žiadna (ale je predpoklad pre PR-3).

### PR-3 — Arbitrage akvizícia: useLive + napojenie na engine
- **Prečo:** Vysoké riziko (fiktívni Kováč/Šimko), malá práca, engine už žije.
- **Čo:** `AcquisitionHub.tsx:594-597` `useLive:false→true`; `arbitrage/analyze/route.ts:7-37` napojiť na reálny `/api/arbitrage` (`scan.ts:20-74`); dashboard `ArbitrageDashboard` vystaviť ako `app/` route.
- **Veľkosť:** S (8–16 h)
- **Akceptácia:** akvizícia ukazuje reálne match-e z `arbitrage_matches`, žiadne `DEMO_CANDIDATES`; 0 fiktívnych mien.
- **Závislosť:** PR-2 (cron musí plniť dáta).

### PR-4 — Legacy `/api/scoring` + `/api/scrape` deprecate
- **Prečo:** XS, odstráni ATRAPA scoring cestu a 1-fake-lead scrape (`scrape/route.ts:11-13`).
- **Čo:** `api/scoring/route.ts:10-30` (heuristika `status=SCRAPED`) → deprecovať alebo presmerovať na scoring-v2; `api/scrape` demo scrape odstrániť z user path.
- **Veľkosť:** XS (4–8 h)
- **Akceptácia:** jediná scoring cesta = v2; `/api/scrape` nevracia hardcoded lead v prod.
- **Závislosť:** žiadna.

### PR-5 — Integrity Monitor UI (F#6) + napojenie reconcile-billing
- **Prečo:** backend alert už žije (`integrity-monitor.ts:29-67`), produkt je prázdny shell; mal si to aj tak v pláne.
- **Čo:** `integrity/page.tsx:3-24` — nahradiť statický copy fetchom `integrity_alerts`; audit log + owner notifikácie; napojiť `reconcile-billing.ts` ako cron, ktorý píše alerty.
- **Veľkosť:** M (24–32 h)
- **Akceptácia:** stránka ukazuje reálne alerty z `integrity_alerts`; billing drift sa objaví ako alert.
- **Závislosť:** billing migrácie (`20260602`) nasadené.

### PR-6 — Meta Digital Twin auth fix
- **Prečo:** S, opravuje rozbitú cestu (lookalike volaný bez Bearer cron secret).
- **Čo:** `AcquisitionHub.tsx:684-686` vs `meta/lookalike/route.ts:8-10` — session auth alebo server action; odstrániť `leads_demo` default (`:15,35`).
- **Veľkosť:** S (8–12 h)
- **Akceptácia:** lookalike funguje z UI s reálnym auth; nie `leads_demo`.
- **Závislosť:** žiadna.

### PR-7 — Morning Brief UX (settings page)
- **Prečo:** backend pipeline žije (`assemble.ts`, cron), chýba len UX nastavení.
- **Čo:** vytvoriť `app/` route s `BriefSettings`; onboarding enable; doriešiť `weeklyRevForecast: null` (`gather.ts:175`).
- **Veľkosť:** S (12–20 h)
- **Akceptácia:** owner si v UI nastaví brief; e-mail reálne príde (Resend smoke).
- **Závislosť:** žiadna.

### PR-8 — PredatorModules CTAs
- **Prečo:** tlačidlá bez onClick/API (`PredatorModules.tsx:69-78`).
- **Čo:** napojiť na ghostwriter / stealth / arbitrage routy.
- **Veľkosť:** S (16–24 h)
- **Akceptácia:** každé tlačidlo vedie na funkčnú akciu, nie no-op.
- **Závislosť:** PR-3 (arbitrage live).

---

## Vlna 2 (až po validácii LIVE jadra — NESTAVAŤ špekulatívne)

| Modul | Odhad | Podmienka štartu |
|-------|-------|------------------|
| Leads Engine (produkt end-to-end) | L (80–120 h) | platiaci za seat + dáta o dopyte; až potom zapnúť kreditové spoplatnenie |
| Protocol AI / Competition pipeline | L (60–90 h) | reálny competitor ingest namiesto `DEFAULT_SECTORS`/`SEED_ALERTS` |
| Market Intelligence add-on | M (32–48 h) | živé trhové feedy namiesto seed |

---

## Pravidlo spätnej väzby na pricing/marketing
Po každom PR, ktorý posunie feature na LIVE: feature smie pribudnúť do cenníka (Vetva A) a do marketingu (Vetva B). Dovtedy ostáva v „Roadmap". Kredity za odomykanie sa zapnú až keď je **Leads Engine LIVE** a inštrumentácia potvrdí konverziu unlock→obchod.
