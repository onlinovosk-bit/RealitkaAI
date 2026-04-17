# E2E test user — overenie voči Supabase

Playwright suite (`chromium` projekt) potrebuje v `apps/crm/.env.local`:

- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (alebo publishable key podľa projektu)

## Rýchle overenie (bez Dashboard)

Z priečinka `apps/crm`:

```bash
npm run verify:e2e-user
```

Skript zavolá `signInWithPassword` rovnako ako `/login`. Exit kód `0` znamená, že účet a heslo sedia s nakonfigurovaným Supabase projektom.

## Manuálne v Supabase

1. [Supabase Dashboard](https://supabase.com/dashboard) → tvoj projekt → **Authentication** → **Users**.
2. Over, že používateľ s `TEST_USER_EMAIL` existuje.
3. Ak nie: **Add user** → zadaj email a heslo (zhodné s `TEST_USER_PASSWORD`).
4. Ak login hlási „Invalid login credentials“:
   - používateľ neexistuje alebo heslo je iné;
   - alebo je zapnuté potvrdenie emailu a účet nie je confirmed — v **Providers** / **Email** uprav nastavenie pre dev alebo v Users daj **Confirm user**.

## Poznámka k prostrediam

Lokálny `npm run dev` musí používať **rovnaký** Supabase projekt ako premenné v `.env.local`. Iný projekt = iní používatelia.
