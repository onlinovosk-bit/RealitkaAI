# QA: Stealth Recruiter (Tichý Náborár) — production smoke

Route: `/akvizieia/zachran-samopredajcu`  
API: `POST /api/stealth-recruiter/scan`, `POST /api/stealth-recruiter/outreach`

## Env

| Env | Účel |
|-----|------|
| `STEALTH_RECRUITER_DEMO=1` | QA-only seed demo prospectov do DB (Preview/staging). **Nepoužívať v produkcii.** |
| `RESEND_API_KEY` | Voliteľné — odoslanie emailu pri `action=send` |

## Predpoklady

- Supabase migrácia `20260527120000_stealth_recruiter_prospects.sql` aplikovaná
- Profil s `agency_id` a tier **protocol_authority** (Reality Monopol)
- Bez demo flagu: scan vracia **503** ak tabuľka pre agentúru nemá dáta

## Manuálny smoke (~5 min)

1. Prihlásenie na Preview / staging s Monopol účtom
2. Otvor `/akvizieia/zachran-samopredajcu`
3. Over paywall pre nižší tier (Market Vision → zamknuté)
4. **Scan:** Network → `POST /api/stealth-recruiter/scan`
   - Monopol + demo env: **200**, `source: "demo"`, badge „Demo režim“
   - Monopol bez demo a bez dát: **503**, `code: SCAN_SOURCE_UNAVAILABLE`
5. **Outreach:** klik na prospect → `POST /api/stealth-recruiter/outreach` → **200**, `outreachText`
6. **Send (voliteľné):** email + záznam v `/activities` (Annex H audit, best-effort)

## Automatizácia (L99)

- Vitest: `src/lib/stealth-recruiter/*.test.ts`, capability gate
- Playwright: `tests/stealth-recruiter.smoke.spec.ts` — API bez session **401**, nie **500**

## PR #2 (externý scraper)

- Napojiť Bazos / Nehnutelnosti signály do `upsertStealthProspects`
- Odstrániť závislosť na `STEALTH_RECRUITER_DEMO`
- Cron / webhook pre pravidelný scan podľa lokality agentúry
