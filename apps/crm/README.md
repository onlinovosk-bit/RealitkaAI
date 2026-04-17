## Realitka AI CRM

Next.js CRM pre realitný tím s lead managementom, pipeline boardom, matchingom nehnuteľností a Supabase backendom.

## Lokálny štart

1. Nainštaluj závislosti:

```bash
npm install
```

2. Nastav premenné podľa `.env.local.example` do `.env.local`.

3. Spusť development server:

```bash
npm run dev
```

## Povinné premenné

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Produkčné endpointy

- `GET /api/leads`
- `GET /api/leads/[id]`
- `POST /api/leads`
- `PATCH /api/leads/[id]`
- `DELETE /api/leads/[id]`
- `GET /api/properties`
- `GET /api/properties/[id]`

## Vercel native Git integration

Preferovaný deploy flow je priamo cez Vercel Git integration, bez GitHub Actions.

1. Pushni repozitár na GitHub.
2. Vo Vercel otvor `Add New Project` alebo `New...`.
3. Vyber GitHub repo `onlinovosk-bit/realitka-ai-crm`.
4. Framework nastav na `Next.js`.
5. Ak repo smeruje priamo na tento projekt, nechaj `Root Directory` prázdny.
6. Ak bude projekt neskôr vnorený do väčšieho monorepa, nastav `Root Directory` na `realitka-ai-crm`.
7. Skontroluj `NEXT_PUBLIC_SUPABASE_URL` a `NEXT_PUBLIC_SUPABASE_ANON_KEY` vo Vercel Environment Variables.
8. Dokonči import. Každý ďalší push do `main` potom spustí deploy natívne cez Vercel.

GitHub Actions deploy workflow bol z repozitára odstránený, aby sa nasadenie neopieralo o externý CI deploy krok a nepadalo na transientných Vercel deploy chybách v Actions.

## Vercel Cron — `/api/scrape`

V [`vercel.json`](vercel.json) je plánovač (napr. každú hodinu). Endpoint `GET /api/scrape` vyžaduje:

1. Premennú **`CRON_SECRET`** v Environment Variables (Vercel aj lokálne).
2. Podľa [dokumentácie Vercel Cron](https://vercel.com/docs/cron-jobs): ak je `CRON_SECRET` v projekte nastavený, Vercel pri volaní cron jobu **automaticky pošle hlavičku** `Authorization: Bearer <CRON_SECRET>`. Kód v `src/app/api/scrape/route.ts` ju overuje cez `verifyCronAuth`.

Manuálne spustenie (curl): `curl -H "Authorization: Bearer $CRON_SECRET" "https://<tvoja-domena>/api/scrape"`

## Platformový vlastník (admin)

Sekcia **`/admin/*`** je chránená cez env **`PLATFORM_OWNER_EMAILS`** (čiarkou oddelený zoznam e-mailov rovnakých účtov ako prihlásenie cez Supabase). Tenantová rola „owner“ v `profiles` je niečo iné — ide o vlastníka realitky; `PLATFORM_OWNER_EMAILS` je prístup pre architekta / prevádzkovateľa produktu.

### Produkčné nastavenie (Vercel)

1. Vercel → váš projekt → **Settings** → **Environment Variables**.
2. Pridaj **`PLATFORM_OWNER_EMAILS`** = `info@onlinovo.sk` (Production; prípadne aj Preview ak chceš testovať staging).
3. Redeploy, aby sa premenná prejavila.

### Kde je „heslo k admin“?

**Samostatné admin heslo v aplikácii neexistuje.** Po prihlásení sa kontroluje len e-mail oproti `PLATFORM_OWNER_EMAILS`. Prihlásenie je štandardné cez **Supabase Auth** (rovnaké ako pre ostatných používateľov):

- Heslo si nastavíš **pri registrácii** (`/register`) pre daný e-mail, alebo cez **obnovenie hesla** na prihlasovacej stránke.
- Účet môžeš vytvoriť alebo heslo resetovať aj v **Supabase Dashboard** → **Authentication** → **Users** (Add user / Send password recovery).

Ak e-mail `info@onlinovo.sk` ešte nemá účet v Auth, vytvor ho v dashboarde alebo cez registráciu; potom sa s týmto heslom prihlásiš a `/admin` ťa pustí dnu.
