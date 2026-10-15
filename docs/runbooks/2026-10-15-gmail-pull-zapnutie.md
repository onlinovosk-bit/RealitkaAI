# Gmail pull — zapnutie (bod 3)

**Čo to je:** záložná cesta príjmu dopytov. Webhook z portálu chodí v reálnom
čase; Gmail pull je poistka pre portály, ktoré webhook nemajú — prečíta správy
pod jedným štítkom v schránke a pošle ich do `/api/acquire/email`.

## Čo sa zmenilo v repozitári (bod 3)

| Predtým | Teraz |
|---|---|
| Rozvrh nebol vo `vercel.json` — plánovač žil mimo repozitára (externý cron, neoverený) | `/api/inbound/gmail-pull` beží **každú hodinu** (`20 * * * *`) |
| Preskočený beh (chýbajúca konfigurácia) nezapísal nič | Zapíše riadok do `cron_runs` s dôvodom, **najviac raz za 12 h** |

Hodinový rozvrh, nie denný: dopyt doručený o 09:05 by inak čakal na zajtra.
Nie je to sub-hodinový rozvrh — tie `apps/crm/src/app/api/cron/realvia-process/route.ts:5`
označuje na tomto účte za zablokované.

## Prečo to zatiaľ nič nestiahne

Zmerané 2026-10-15 v projekte `realitka-ai` vo Verceli: **ani jedna** z premenných,
ktoré `readGmailInboundConfig()` vyžaduje, tam neexistuje:

- `GMAIL_INBOUND_PULL_ENABLED` (musí byť presne `true`)
- `GOOGLE_GMAIL_INBOUND_CLIENT_ID`
- `GOOGLE_GMAIL_INBOUND_CLIENT_SECRET`
- `GOOGLE_GMAIL_INBOUND_REFRESH_TOKEN`
- `GOOGLE_GMAIL_INBOUND_LABEL_ID`
- `GOOGLE_GMAIL_INBOUND_AGENCY_ID`

(`ACQUIRE_SHARED_SECRET` a `NEXT_PUBLIC_APP_URL` už nastavené sú.)

Kým chýbajú, pull sa každú hodinu korektne preskočí a raz za 12 h o tom nechá
riadok. **To je zámer:** po nasadení uvidíš v `cron_runs`, či Vercel cron vôbec
prichádza — doteraz sa to z prázdnej tabuľky prečítať nedalo.

## Čo musíš urobiť ty

1. V Google Cloud vytvor OAuth klienta (Desktop alebo Web) a povoľ Gmail API.
2. Získaj refresh token **výlučne so scope `gmail.readonly`**. Kód scope
   kontroluje a `gmail.send`, `gmail.compose`, `gmail.modify` a `mail.google.com`
   odmieta (`assertReadonlyScope`) — čítame cudziu schránku, neposielame z nej.
3. V Gmaile založ štítok (napr. `Revolis/Dopyty`), nastav filter, ktorý naň
   smeruje e-maily z portálov, a zisti jeho `labelId` (Gmail API `users.labels.list`).
4. Zisti `agency_id` kancelárie, ktorej tie dopyty patria.
5. Nastav tých šesť premenných vo Verceli (Production) a nasaď.

## Ako overíš, že to beží

```sql
select started_at, status, scanned, eligible, written, failed, first_error, detail
from public.cron_runs
where job = 'gmail-inbound-pull'
order by started_at desc
limit 10;
```

- **žiadny riadok po 12 h** → Vercel cron neprichádza (rozvrh alebo plán účtu),
- **`status='empty'`, `detail.skipped='disabled'`** → cron beží, vlajka je vypnutá,
- **`detail.skipped='missing_oauth_env'`** → chýbajú OAuth premenné,
- **`status='failed'`, `first_error='oauth_refresh_failed:invalid_grant'`** → token vypršal,
- **`status='ok'`, `written > 0`** → dopyty chodia.
