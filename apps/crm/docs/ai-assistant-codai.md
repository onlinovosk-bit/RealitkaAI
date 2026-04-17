# AI Asistent (Codai) — rollout

## Cieľ

- **Landing** (`/landing`): blok „AI Asistent Codai“ — hero, value, dôvera, CTA.
- **Dashboard** (`/dashboard`): panel **AssistantPanel** volá **`POST /api/leads/[id]/assistant`** s otázkou z `assistantQuestionForContext()` (`lib/ai/assistant-script.ts`). Odpoveď je **LLM** (gpt-4o-mini) s kontextom leadu z DB (`lib/assistant-chat.ts`).
- **Kontext leadu:** `?lead=` alebo `?leadId=` v URL, **sessionStorage** `assistant_panel_lead_id_v1`, alebo predvolený prvý lead z dashboardu.

## A/B test CTA (landing)

- **50/50** varianta `a` | `b` v `localStorage` (`revolis_ai_landing_cta_ab_v1`).
- **Jeden** variant pre celý blok: `CtaAbProvider` obalí Hero + CTA (`HeroSection`, `CTASection`).
- Atribúty `data-ab-variant`, `data-ab-section`, `data-ab-cta` pre analytiku.

## Env (asistent API)

| Premenná | Popis |
|----------|--------|
| `OPENAI_API_KEY` | Povinný pre `getAssistantAnswer` / panel |
| `NEXT_PUBLIC_SUPABASE_URL` | Lead z tabuľky `leads` |
| `SUPABASE_SERVICE_ROLE_KEY` | Načítanie leadu v API |

Bez `OPENAI_API_KEY` panel zobrazí záložný text (`generateAssistantMessage`) + zoznam zo `getSalesScript()`.

## Nasadiť a overiť

1. `/landing#ai-asistent` — dva varianty CTA (vyčistiť `localStorage` pre opätovný výber).
2. `/dashboard` — panel s výberom leadu (ak existuje viac leadov).
3. `/dashboard?lead=<uuid>` — kontext z URL.
4. `/leads/[id]` — odkaz „AI Asistent (Codai)“ na dashboard s `?lead=`.

## Rollback

- Vrátiť `AssistantPanel` na čisto statické texty; odstrániť `CtaAbProvider` z landing page.

## Test plán

1. S platným `OPENAI_API_KEY` a leadom v Supabase: prepínač Hovor/Obchod/Prehľad mení otázku a odpoveď.
2. Bez kľúča: chybová hláška + záložný text.
3. Vitest: `assistant-codai.test.ts`, `landing-cta-ab` copy.

## Riziká

- Lead musí existovať v **Supabase** `leads` — mock/demo leady len lokálne môžu vrátiť 404 z API.
- `SUPABASE_SERVICE_ROLE_KEY` na serveri — štandardná bezpečná prax pre API route.
