# Real-time scoring & auto-tune (deploy + rollback)

## Čo sa zmenilo (skrátene)

- **`POST /api/events`** — `leadId` + `signals` → `calculateLeadScore()`, uloženie skóre leadu, broadcast:
  - **Socket.IO** (`lead:update`), ak beží `node server.mjs`.
  - **`platform_events`** (Supabase service role) → existujúci **`GET /api/events/stream`** (SSE) to isté doručí klientom.
- **`src/lib/ai/scoring-engine.ts`** + **`weights.ts`** (persist `.data/signal-weights.json`).
- **`learning-store`** + **`auto-tune`** — append outcomes (`.data/outcomes.jsonl`), cron upravuje váhy.
- **`POST /api/cron/auto-tune`** — nočný job (HTTP + secret).
- **Hook** `useRealtimeLeadScore` / `useRealtimeLeads` — SSE vždy; Socket.io ak `NEXT_PUBLIC_REALTIME_SOCKET=1`.
- **Lead detail** — „Demo: live signály“ + vizuálny pulz pri zmene skóre.
- **`server.mjs`** — Next + Socket.IO na jednom porte (nie je to štandardný `next start`).

## Presné premenné prostredia

| Premenná | Povinná | Účel |
|----------|---------|--------|
| `CRON_SECRET` | Pre produkčný cron | Tajomstvo pre `POST /api/cron/auto-tune` (header `x-cron-secret` alebo `?secret=`). |
| `NEXT_PUBLIC_APP_URL` | Odporúčané | CORS / absolútne URL (Socket.IO môže využiť v produkcii). |
| `NEXT_PUBLIC_REALTIME_SOCKET` | Voliteľné | `1` = klient sa pripojí aj cez Socket.IO (vyžaduje `dev:ws` / `start:ws`). Bez neho stačí SSE. |
| `SUPABASE_SERVICE_ROLE_KEY` + DB URL | Pre `platform_events` z API | Emit do DB (SSE); bez toho ostáva len lokálne Socket.IO + uložené skóre. |
| Štandardné `NEXT_PUBLIC_SUPABASE_*` | Ako doteraz | Prihlásenie pre `/api/events/stream` a `/api/events`. |

Žiadne nové secrets mimo `CRON_SECRET` a existujúcich Supabase kľúčov.

## Deploy

### A) Vercel (bez vlastného Node servera)

1. Nasadiť ako doteraz: **`next build` + `next start`** (alebo Vercel default).
2. **Socket.IO nebeží** na edge/serverless — OK: realtime ide cez **SSE** + **`platform_events`**.
3. Nastavte `CRON_SECRET`; scheduler (Vercel Cron, GitHub Actions, …) volá denne:
   ```http
   POST https://<váš-host>/api/cron/auto-tune
   x-cron-secret: <CRON_SECRET>
   ```
4. Voliteľne `NEXT_PUBLIC_REALTIME_SOCKET` **nechajte prázdne alebo 0** (iba SSE).

### B) VPS / Docker (plný Socket.IO)

1. `npm run build`
2. `NODE_ENV=production` **+** `node server.mjs` (skript **`npm run start:ws`**).
3. Port z `PORT` (default 3000). Reverse proxy (nginx) → TCP na tento port; WebSocket path **`/socket.io`**.
4. `NEXT_PUBLIC_REALTIME_SOCKET=1` + `NEXT_PUBLIC_APP_URL=https://váš-host`

### Rollback

| Krok | Akcia |
|------|--------|
| 1 | Vráťte deploy na predchádzajúci image/commit. |
| 2 | Odstráňte alebo deaktivujte cron volanie ` /api/cron/auto-tune`. |
| 3 | Zmažte `.data/` na serveri len ak vadí obsah; aplikácia použije defaultné váhy. |
| 4 | Ak problém len so Socket.IO: používajte **`next start`** bez `server.mjs` a unset `NEXT_PUBLIC_REALTIME_SOCKET`. |

## Test plán (manuálny)

1. **Auth**: Prihlásiť sa, otvoriť `/leads/[id]`.
2. **Demo tlačidlo**: „Demo: live signály“ — očakávané: skóre a progress bar sa zmenia do **~1 s**.
3. **SSE**: Bez `dev:ws` — po kliknutí v inom okne Network uvidíte EventSource alebo v UI stále update (poll 2,5 s na stream).
4. **Socket**: `npm run dev:ws`, `.env.local`: `NEXT_PUBLIC_REALTIME_SOCKET=1` — v DevTools → WS pripojenie na `/socket.io`, udalosť `lead:update`.
5. **Cron**: `curl -X POST -H "x-cron-secret: $CRON_SECRET" https://host/api/cron/auto-tune` → `{ ok: true, tuned: { ... } }`.

## Overenie URL (príklad)

Po nasadení (nahraďte host a lead ID):

```bash
curl -sS -X POST "https://YOUR_HOST/api/events" \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>" \
  -d '{"leadId":"YOUR_LEAD_UUID","signals":{"email_open":1,"link_click":0.8}}'
```

Očakávaný JSON obsahuje `ok: true`, `score`, `realtime: true/false`.

## Riziká

- **Dvojité spojenie**: klient má SSE + voliteľne Socket — rovnaká udalosť môže prísť dvakrát; UI je idempotentné (rovnaké skóre).
- **Váhy na disku**: na serverless bez zdieľaného FS sa `.data/` resetuje medzi invokáciami — na Vercel sú efektívnejšie outcomes/weights len v pamäti pre krátke okná, alebo presun do DB neskôr.
- **`rescoreLead`**: `/api/events` **nevolá** full AI rescoring — mení len pole `score` z signálov; klasický PATCH leadu môže znovu spočítať AI skóre.

## Next steps (odporúčanie)

- Uložiť outcomes / weights do Supabase tabuľky namiesto `.data/`.
- Jedna zdieľaná realtime vrstva (jedna subscriptions namiesto SSE+Socket duplicity).
- Metriky: počet `lead:update` / latencia.
