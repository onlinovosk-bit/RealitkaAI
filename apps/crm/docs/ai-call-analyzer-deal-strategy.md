# AI Call Analyzer & Deal Strategy

## Call Analyzer

- **UI:** `/call-analyzer` — vloženie prepisu alebo nahratie audio; analýza (heuristiky) alebo **Transkribovať + analyzovať** (Whisper).
- **API:**
  - `POST /api/ai/call/analyze` — JSON `{ "text": "..." }` → skóre, silné/slabé, coaching.
  - `POST /api/ai/call/transcribe` — `multipart/form-data`, pole `file` → prepis (Whisper).

### Env (transkripcia a limity)

| Premenná | Popis |
|----------|--------|
| `OPENAI_API_KEY` | OpenAI API kľúč pre Whisper (`whisper-1`). Bez neho transkripcia zlyhá; manuálny prepis + `/analyze` funguje. |
| `CALL_TRANSCRIBE_MAX_BYTES` | Max veľkosť tela súboru (default 25 MB, zarovnané na limit Whisper API). Pri prekročení: **413**. |
| `CALL_TRANSCRIBE_RATE_PER_MIN` | Max počet transkripcií na IP za minútu (default **10**). Pri prekročení: **429** + hlavička `Retry-After`. |

**Poznámka:** Rate limit je v pamäti procesu; pri viacerých inštanciách (horizontálny scale) je efektívny limit vyšší súčet limitov — pre striktný globálny limit použiť Redis/Upstash alebo edge rate limit (Cloudflare). Veľkosť tela požiadavky obmedzte aj na reverznej proxy / `next.config` (body limit).

### Plánované / rozšírené vylepšenia

**Heuristická analýza (nie plný NLP)**

- Váhované skóre podľa typu nehnuteľnosti a fázy obchodu (nie len kľúčové slová).
- Detekcia intencií (uzavretie kroku, námietka, záujem) cez malý klasifikátor alebo LLM s krátkym promptom len na výstup štruktúry.
- Kalibrácia skóre oproti historickým konverziám (feedback z CRM: lead → obchod).
- Šablóny feedbacku podľa jazyka (SK/CZ) a segmentu (predaj vs. prenájom).

**Transkripcia (OpenAI závislosť)**

- Fallback provider (Deepgram / Azure Speech) cez rovnaké rozhranie v `call-transcript.ts`.
- Fronta a asynchrónna transkripcia pre dlhé súbory + webhook / polling.
- Cache prepisu podľa hash súboru (zníženie nákladov pri opakovanom nahratí).

**Pravdepodobnosť uzavretia (orientačná)**

- Explicitný „confidence interval“ alebo tri pásma (nízka / stredná / vysoká) namiesto jedného čísla.
- Vstupy z histórie (počet kontaktov, posledná aktivita, typ námietky) vážené do modelu.
- A/B validácia oproti skutočným výsledkom leadov (offline metriky).

### E2E (Playwright)

- `tests/call-analyzer.spec.ts` — mock Whisper (`page.route` na `/api/ai/call/transcribe`), reálna analýza cez `/api/ai/call/analyze`.
- Voliteľný test so skutočným Whisper: `E2E_REAL_WHISPER=1` a `OPENAI_API_KEY` (nákladové API volanie).
- Projekt: `chromium-call-analyzer` (bez závislosti na `auth.setup.ts`). Ostatné E2E sú v `chromium` (bez tohto súboru).
- **`E2E_BYPASS_AUTH=1`** (iba `NODE_ENV !== production`): server vráti mock `getCurrentUser` / `getCurrentProfile` — aby šli UI testy bez reálneho Supabase loginu. Playwright `webServer` to nastavuje automaticky; pri `reuseExistingServer` / vlastnom `npm run dev` musíš `E2E_BYPASS_AUTH=1` nastaviť ručne.
- Ak už beží dev server na :3000 bez bypassu, spusti napr. `set PLAYWRIGHT_SKIP_WEBSERVER=1` (PowerShell) a nechaj bežať dev s `E2E_BYPASS_AUTH=1`, alebo uvoľni port a nechaj Playwright spustiť server sám.

Príklad (PowerShell):

```powershell
cd apps/crm
$env:PLAYWRIGHT_SKIP_WEBSERVER="1"; $env:E2E_BYPASS_AUTH="1"; npm run dev
# druhý terminál:
npx playwright test tests/call-analyzer.spec.ts --project=chromium-call-analyzer
```

## Deal Strategy

- **UI:** na detaile leadu — karta „AI Deal Strategy“ (GET `/api/leads/[id]/deal-strategy`).
- Využíva dáta leadu + Sales Brain profil (ak je dostupný).

### Rollback

- Odstrániť položku navigácie `call-analyzer` a stránku `/call-analyzer` ak treba rýchlo skryť funkciu.
- API routy môžete nechať (404 po odstránení) alebo zmazať súbory v `app/api/ai/call/` a `app/api/leads/[id]/deal-strategy/`.
