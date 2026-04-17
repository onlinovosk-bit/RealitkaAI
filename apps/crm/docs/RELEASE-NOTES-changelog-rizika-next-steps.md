# Revolis.AI CRM — Changelog · Riziká · Next steps

*(Môžeš skopírovať celý blok do Wordu — odstráň túto poznámku v záhlaví.)*

---

## Changelog (posledné nasadenia — súhrn)

### AI Call Analyzer & Deal Strategy
- **Knižnice:** `analyzeCall`, `generateCallCoaching`, `transcribeCallAudio` (Whisper), `generateDealStrategy` / `prioritizeSteps` / `strategyCloseProbability`.
- **API:** `POST /api/ai/call/analyze`, `POST /api/ai/call/transcribe`, `GET /api/leads/[id]/deal-strategy`.
- **UI:** `/call-analyzer`, karta **AI Deal Strategy** na detaile leadu; navigácia **AI Call Analyzer**.
- **Produkcia:** rate limit na transkripciu (`CALL_TRANSCRIBE_RATE_PER_MIN`), max veľkosť súboru (`CALL_TRANSCRIBE_MAX_BYTES`), odpovede **429** / **413**.
- **E2E:** Playwright `call-analyzer.spec.ts` (mock Whisper + voliteľný skutočný Whisper); projekt `chromium-call-analyzer`; `E2E_BYPASS_AUTH` pre dev E2E bez Supabase loginu.
- **Dokumentácia:** `docs/ai-call-analyzer-deal-strategy.md`.

### AI Asistent (Codai)
- **Landing:** sekcia `#ai-asistent` — Hero, Value, Fear, CTA; A/B test CTA (`CtaAbProvider`, `localStorage` kľúč `revolis_ai_landing_cta_ab_v1`).
- **Dashboard:** `AIAssistBanner`, `AssistantPanel` (resp. lazy `AssistantPanelDynamic`) napojené na **`POST /api/leads/[id]/assistant`** s otázkami z `assistantQuestionForContext`; kontext leadu z `?lead=` / sessionStorage / predvolený lead.
- **Lead detail:** odkaz na `/dashboard?lead=<id>`.
- **Fallback:** pri chýbajúcom API / kľúči statický text (`generateAssistantMessage`).
- **Dokumentácia:** `docs/ai-assistant-codai.md`.

### Performance (audit last deploy)
- **`next.config.js`:** `experimental.optimizePackageImports` pre `lucide-react`, `framer-motion`.
- **Dashboard:** lazy chunk pre AI panel, `AssistantPanelLoading`, `useMemo` pre lead options, `memo` na banner, `AbortController` pri fetchi asistenta.
- **Skript:** `npm run perf:smoke` (`scripts/perf-http-smoke.mjs`).
- **Dokumentácia:** `docs/performance-audit-last-deploy.md`.

### Ostatné opravy v toku
- TypeScript: `monthlyMoney.totalExpectedEur` na dashboarde (`?? 0`).
- Playwright: `chromium` ignoruje `call-analyzer.spec.ts`; samostatný projekt pre call-analyzer.

---

## Riziká

| Oblast | Riziko | Mitigácia |
|--------|--------|-----------|
| **E2E bypass** | `E2E_BYPASS_AUTH=1` len mimo `NODE_ENV=production` | Nikdy na produkčnom deployi; kontrola env v pipeline. |
| **Transkripcia** | Závislosť na OpenAI kvótach a kľúči | Env, rate limit, max veľkosť; fallback manuálny prepis + `/analyze`. |
| **Asistent API** | Vyžaduje `OPENAI_API_KEY` + Supabase lead v DB | Jasná chyba v UI; lokálne mock leady môžu vrátiť 404 z API. |
| **Rate limit (in-memory)** | Pri viacerých inštanciách nie je globálny limit | Dokumentované; prípadne Redis / edge limit. |
| **A/B CTA** | Len `localStorage` — nie konzistentné medzi zariadeniami | Pre produkčné rozhodovanie zvážiť server-side experiment alebo cookie. |
| **optimizePackageImports** | Experimentálna Next funkcia | Sledovať release notes Next; pri build chybe dočasne vypnúť. |
| **Právne** | Marketingové texty vs. skutočné správanie produktu | Zosúladiť s VOP a dostupnosťou funkcií. |

---

## Next steps (odporúčané)

1. **Metriky:** CI job — `npm run build` + `npm run perf:smoke` proti staging URL; archivovať Lighthouse JSON pre `/landing` a `/dashboard`.
2. **Landing:** lazy-load sekcí pod foldom; zvážiť zníženie `framer-motion` na kritických miestach.
3. **Asistent:** telemetria (čas odpovede, chybovosť); voliteľne cache odpovede na krátky čas podľa `leadId+ctx`.
4. **A/B:** napojiť `data-ab-*` na analytiku (GA4 / Plausible); server-side variant pre prihlásených.
5. **Bezpečnosť:** audit `POST /api/leads/[id]/assistant` (autorizácia voči vlastníctvu leadu / tenant).
6. **Dokumentácia:** jedna stránka „Release notes“ v aplikácii alebo link z `docs/` do README deploy tímu.

---

## Ako mi dať obsah z Wordu nabudúce

1. **Najjednoduchšie:** označ všetko v Wordu → skopíruj → prilep sem do chatu.  
2. **Súbor:** ulož ako **.txt** alebo **.md** a prilož do projektu (napr. `docs/navrhy.docx` nefunguje; `docs/navrhy.txt` áno).  
3. **Nepoužívaj len PDF** ako jediný zdroj — kopírovanie textu z Wordu je spoľahlivejšie.

---

*Koniec dokumentu.*
