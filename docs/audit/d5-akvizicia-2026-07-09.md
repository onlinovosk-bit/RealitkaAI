# D5 — Akvizícia (získavanie ďalších zákazníkov) — 2026-07-09

> Doména D5 z celoplošného auditu (`docs/prompts/audit-revolis-celoplosny-2026-07-08.md`).
> Metóda: read-only SQL (service role) + grep kódu + audit mirror z 2026-07-08.
> Žiadny prod write.

## Tabuľka nálezov

| # | Nález | Dôkaz | Dopad | Effort | Autonómia | Stav |
|---|-------|-------|-------|--------|-----------|------|
| D5-1 | **Žiadny merateľný inbound signál** | `saas_leads` = 14 celkom: 11× `proof` (väčšina garbage/smoke 2026-07-06/07), 2× `Demo request` + 1× `debug` (všetko 2026-03-20, test e-maily) | Akvizícia beží naslepo — žiadny reálny prospect | — | — | Potvrdené |
| D5-2 | **GA4 placeholder** | `apps/marketing/app/layout.tsx` → `G-R1GZQFV42V` (#285, #287 merged 2026-07-10) | Traffic merateľný po deployi | — | **B** | ✅ Kód hotový — Andy: Realtime smoke |
| D5-3 | **Demo request flow technicky OK, dáta prázdne** | `client_onboarding_progress` = 0 riadkov; API existuje | Prvý reálny request ešte neprišiel | — | — | Potvrdené |
| D5-4 | **`demo_bookings` tabuľka neexistuje v prod** | PostgREST probe: `table not found` | Calendly/demo-booking pipeline mŕtvy | 1–2 h | **B** | Potvrdené |
| D5-5 | **Web CTA → Calendly funguje** | landing CTA + `DemoCTA` s gtag events | Jediný živý akvizičný kanál (kód) | — | — | Running |
| D5-6 | **`/proof` funnel živý, len self-testy** | 11 leadov `source=proof` od 2026-07-06 (vrátane `proof-smoke@revolis.test`) | Funnel funguje, dáta nie sú prospects | — | — | Running (bez signálu) |
| D5-7 | **Košice outreach nemerateľný** | tracker v repe nenájdený | Segment B/C bez dôkazu | — | **C** | Neoveriteľné |
| D5-8 | **Blueprint Kit / Lemon Squeezy** | `memory/open-tasks.md`: pending | Distribúcia bez stopy predaja | — | **C** | Neoveriteľné |

## Súhrn

Technické kanály existujú (web, Calendly, `/proof`), ale v DB nie je ani jeden reálny akvizičný signál — všetko sú testy/smoke z marca a júla 2026.

## Odporúčané kroky

| Priorita | Akcia |
|----------|-------|
| P0 | Andy: GA4 Realtime smoke po deployi (`G-R1GZQFV42V`) |
| P1 | ✅ HOTOVO 2026-07-09 — demo tenant B–G Running (end-to-end, vrátane `new_lead` notifikácie 20:15) |
| P2 | Sales tracker pre Košice outreach (`docs/sales/revolis-sales-tracker.xlsx`) |
| P3 | Order 2+ podľa `docs/briefs/acquisition-order-2-10.md` (GO podľa brány v dokumente) |

## Súvisiace súbory

| Súbor | Účel |
|-------|------|
| `docs/audit/celoplosny-audit-2026-07-08.md` | plný audit (riadok #5 = D5) |
| `docs/briefs/acquisition-order-2-10.md` | acquisition orders 2–10 (plný order) |
| `docs/runbooks/demo-onboarding-b-g-draft.md` | demo tenant setup |
