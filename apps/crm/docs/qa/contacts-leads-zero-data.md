# QA: Moji klienti / Leads — 0 záznamov pri živých dátach

**Dátum:** 2026-05-27  
**Fix vetva:** `fix/contacts-leads-zero`

## Symptóm

- `/contacts` (Moji klienti) alebo `/leads` ukazuje 0 príležitostí.
- Kokpit môže stále zobrazovať mená v AI Priority Strip (klient načítaný v prehliadači cez `getLeads()`).

## Root cause

Rovnaký incident ako nehnuteľnosti (pozri `docs/incidents/crm-zero-data-audit.md`):

1. SSR `listLeads(createClient())` často vráti **0** pri RLS bez platnej session v RSC.
2. Starý `LeadsModule` mal len **podmienený** browser fallback (`leads.length === 0` pri mounte), nie vždy refresh ako `PropertiesPageClient`.
3. `/contacts` robil `redirect` na `/leads` — URL a titulok „Moji klienti“ sa stratili.

## Náprava

- `LeadsPageClient` — vždy načíta leads/teams/profiles v prehliadači; záloha `GET /api/leads/inventory`.
- `resolveProfileForAuthUser()` — `auth_user_id` **alebo** legacy `profiles.id`.
- `/contacts` renderuje rovnaký client s titulkom **Moji klienti** (bez redirectu).
- Banner pri `profileMissingAgency` + hint na `GET /api/crm/tenant-health`.

## Skutočná príčina (RLS + profil) — 2026-05-27

Ak `GET /api/crm/tenant-health` ukazuje `counts.leads: 0`, **nie sú to filtre** — Supabase RLS nevidí agentúru.

1. `profile_agencies_for_auth()` vracia `agency_id` len ak `profiles.auth_user_id = auth.uid()` **alebo** `profiles.id = auth.uid()`.
2. Profil Smolko často existuje pod e-mailom, ale **`auth_user_id` je prázdne** → RLS vráti 0 riadkov.
3. Kokpit **AI Priority Strip** pri 0 leadoch zobrazuje **demo mená** (Lucia Šimko…) — nie živú databázu.

**Náprava:** `linkProfileToAuthUser()` pri prihlásení, layoute, `/api/leads/inventory` a tenant-health doplní `auth_user_id`.

## Filtre vs. 0 v zozname (iba ak tenant-health > 0)

- Ak `counts.leads` > 0 ale UI ukazuje 0, skontrolujte banner „Filtre skryli…" a Min. BRI.
- Placeholder BRI `70` bol UX problém (#75), nie root cause pri API = 0.

## Smoke

1. Prihlásenie tenant Smolko.
2. `GET /api/crm/tenant-health` → `counts.leads` > 0 ak DB má dáta.
3. `/contacts` a `/leads` — rovnaký počet ako tenant-health.
4. Kokpit AI strip — reálne signály (nie len placeholder), ak `counts.leads` > 0.
5. `/contacts` → **Vymazať filtre** → počet Príležitostí = tenant-health `counts.leads`.
6. Iniciály v hlavičke: z `full_name` alebo e-mailu (nie vždy „RV").
