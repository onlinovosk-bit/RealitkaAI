# Performance audit — posledné nasadenie (CRM)

## Rozsah

- **Landing** `/landing` (vrátane `#ai-asistent`, framer-motion hero, A/B CTA).
- **Dashboard** `/dashboard` (lazy `AssistantPanel`, `useSearchParams`, fetch asistenta).

---

## Bottlenecky (identifikované)

| Oblast | Príčina | Dopad |
|--------|---------|--------|
| **JS bundle** | Veľké knižnice (`framer-motion`, `lucide-react`) importované celoplošne | Vyšší First Load JS na stránkach, ktoré ich používajú |
| **Dashboard** | `AssistantPanel` (Suspense + fetch + kontext) v tom istom chunku ako celá stránka | Väčší počiatočný JS pre `/dashboard` |
| **Asistent** | Rýchle prepínanie Hovor/Obchod/Prehľad spúšťalo paralelné `fetch` | Zbytočná sieťová práca, race conditions |
| **Re-render** | `leads.map(...)` nové pole pri každom renderi v props | Zbytočné re-rendery dieťaťa |

---

## Quick wins (implementované)

1. **`experimental.optimizePackageImports`** pre `lucide-react` a `framer-motion` v `next.config.js` — menší klientsky strom importov.
2. **`next/dynamic`** cez `AssistantPanelDynamic` — samostatný chunk pre panel, rýchlejší prvý paint zvyšku dashboardu.
3. **`AssistantPanelLoading.tsx`** — ľahký skeleton bez ťažkej logiky v hlavnom bundle.
4. **`useMemo`** pre `assistantLeadOptions` a `assistantDefaultLeadId` na dashboarde.
5. **`React.memo`** na `AIAssistBanner`.
6. **`AbortController`** pri fetchi asistenta — zrušenie predchádzajúcej požiadavky pri zmene kontextu/leadu.

---

## Deep fixes (neschválené v tejto iterácii)

- Lazy-load sekcí pod foldom na `/landing` (Intersection Observer / dynamic import).
- **Route Segment Config** + edge cache len pre verejné stránky (opatrne kvôli osobným údajom).
- **Redis** / CDN pre statické assety; obrázky do `next/image` s rozmermi.
- Rozdelenie **framer-motion** len do kritických sekcií alebo ľahší CSS animation fallback.
- Server Components: presun ďalších blokov z client boundary (už čiastočne: Value/Fear pod RSC).

---

## Metriky pred / po

### Ako merať lokálne

1. **Build (veľkosť bundle)**  
   `cd apps/crm && npm run build`  
   Porovnaj výstup Next.js (čas kompilácie, prípadne `.next/static/chunks` pred/po v git diff alebo zálohe).

2. **HTTP latencia (smoke)**  
   So spusteným serverom (`npm run dev` alebo `npm start`):  
   `npm run perf:smoke`  
   Voliteľne: `set PERF_BASE_URL=https://váš-host && npm run perf:smoke` (PowerShell: `$env:PERF_BASE_URL="..."`).

3. **Lighthouse (Chrome)**  
   ```bash
   npx lighthouse http://127.0.0.1:3000/landing --only-categories=performance --output=json --output-path=./lighthouse-landing.json
   npx lighthouse http://127.0.0.1:3000/dashboard --only-categories=performance --output=json --output-path=./lighthouse-dashboard.json
   ```  
   (Na `/dashboard` treba byť prihlásený alebo použiť produkčnú URL s session.)

### Zaznamenané po implementácii (referenčné prostredie)

| Kontrola | Výsledok |
|----------|----------|
| `npm run build` | Úspešný TypeScript + static generation (build ~2 min na dev PC) |
| `npm run perf:smoke` | Príklad (lokálny `next dev` / hot): `/landing` ~7 s (prvý request / cold), `/login` ~160 ms; priemer uvedený skriptom ~3,6 s. Opakovaný request na `/landing` býva výrazne rýchlejší. |

**Poznámka:** Absolútne čísla (ms, Lighthouse skóre) závisia od CPU, siete a dát v DB — ukladaj baseline v CI alebo pred každým release commitom. **Pred/po** v zmysle A/B: ulož výstup `npm run build` + `npm run perf:smoke` do PR alebo `docs/performance-baseline.txt` pri ďalšom release.

---

## Verifikácia URL

| URL | Očakávanie |
|-----|------------|
| `/landing` | 200, sekcia AI Asistent |
| `/landing#ai-asistent` | Scroll na anchor |
| `/dashboard` | 200 po prihlásení, lazy panel + skeleton |
| `/dashboard?lead=<uuid>` | Panel s kontextom leadu |

---

## Rollback

- Odstrániť `optimizePackageImports` z `next.config.js`.
- V `dashboard/page.tsx` nahradiť `AssistantPanelDynamic` importom `AssistantPanel`.
- Odstrániť `AssistantPanel.dynamic.tsx` a voliteľne `AssistantPanelLoading.tsx` (vrátiť skeleton do `AssistantPanel.tsx`).
