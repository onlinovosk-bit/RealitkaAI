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

## Filtre vs. 0 v zozname (2026-05-27)

- Pole **Min. BRI** malo placeholder `70` — vyzeralo ako aktívny filter.
- Horúci pás „Kto je pripravený kúpiť dnes?" používal filtrovaný zoznam → mohol ukázať klienta (napr. Jozef Test) pri **Príležitosti: 0**.
- Oprava: pás z **všetkých** načítaných klientov, banner „Filtre skryli…", placeholder „Všetky", žiadne demo mená v páske.

## Smoke

1. Prihlásenie tenant Smolko.
2. `GET /api/crm/tenant-health` → `counts.leads` > 0 ak DB má dáta.
3. `/contacts` a `/leads` — rovnaký počet ako tenant-health.
4. Kokpit AI strip — reálne signály (nie len placeholder), ak `counts.leads` > 0.
5. `/contacts` → **Vymazať filtre** → počet Príležitostí = tenant-health `counts.leads`.
6. Iniciály v hlavičke: z `full_name` alebo e-mailu (nie vždy „RV").
