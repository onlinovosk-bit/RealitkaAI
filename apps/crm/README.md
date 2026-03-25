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
