# D5 — Akvizícia (získavanie ďalších zákazníkov) — 2026-07-09

> Doména D5 z celoplošného auditu (`docs/prompts/audit-revolis-celoplosny-2026-07-08.md`).
> Metóda: read-only SQL (service role) + grep kódu + audit mirror z 2026-07-08.
> Žiadny prod write.

## Tabuľka nálezov

| # | Nález | Dôkaz | Dopad | Effort | Autonómia | Stav |
|---|-------|-------|-------|--------|-----------|------|
| D5-1 | **Žiadny merateľný inbound signál** | `saas_leads` = 14 celkom: 11× `proof` (väčšina garbage/smoke 2026-07-06/07), 2× `Demo request` + 1× `debug` (všetko 2026-03-20, test e-maily) | Akvizícia beží naslepo — žiadny reálny prospect | — | — | Potvrdené |
| D5-2 | **GA4 pravdepodobne placeholder** | `apps/marketing/app/layout.tsx:18` → `G-REVOLIS2026` | Traffic/conversion neviditeľné | 15 min (Andy, GA4 Admin) | **B** | Neoverené (dashboard) |
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
| P0 | Andy: over GA4 property `G-REVOLIS2026` (existuje? Realtime?) |
| P1 | Dokončiť demo tenant B–G (live 5-min demo = akvizičný asset) |
| P2 | Sales tracker pre Košice outreach (spreadsheet, nie kód) |
| P3 | Acquisition Order 2 z `docs/briefs/acquisition-order-2-10-skeleton.md` až po GO na demo smoke |

## Súvisiace súbory

| Súbor | Účel |
|-------|------|
| `docs/audit/celoplosny-audit-2026-07-08.md` | plný audit (riadok #5 = D5) |
| `docs/briefs/acquisition-order-2-10-skeleton.md` | backlog orders 2–10 |
| `docs/runbooks/demo-onboarding-b-g-draft.md` | demo tenant setup |
