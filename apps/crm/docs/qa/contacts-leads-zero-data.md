# QA: Moji klienti / Leads — 0 záznamov pri živých dátach

**Dátum:** 2026-05-27  
**Fix vetva:** `fix/contacts-leads-zero` (+ hotfix `fix/contacts-leads-zero-hotfix` pre SW cache)

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

## Smoke

1. Prihlásenie tenant Smolko.
2. `GET /api/crm/tenant-health` → `counts.leads` > 0 ak DB má dáta.
3. `GET /api/leads/inventory` → `ok: true`, `inventory.leads.length` > 0.
4. `/contacts` — URL **zostane** `/contacts`, titulok **Moji klienti**, počet > 0.
5. `/leads` — rovnaký počet ako tenant-health.
6. Kokpit AI strip — reálne signály (nie len placeholder), ak `counts.leads` > 0.

## Ak stále vidíš redirect na `/leads`

1. **Tvrdé obnovenie:** Ctrl+Shift+R (alebo vymaž site data pre `app.revolis.ai`).
2. Service Worker: DevTools → Application → Service Workers → **Unregister**, potom reload.
3. Over, že Production deploy je z **`main`** po merge hotfixu (nie starý rebuild z `docs/architecture-layers`).
