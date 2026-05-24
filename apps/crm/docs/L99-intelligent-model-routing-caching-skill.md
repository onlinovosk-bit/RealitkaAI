# L99 Intelligent Model Routing & Caching Skill

Technický návrh pre nákladovo optimalizované LLM volania v orchestrácii (**Ruflo / MCP / agenti Revolis CRM**). Cieľ: **40–60 %** realizovateľné zníženie nákladov (routing + cache + kompresia kontextu) pri kontrolovanej degradácii kvality cez fallback a TTL.

Souvislé dokumenty: [L99-master-prompt](./L99-master-prompt.md), [RUFLO-ORCHESTRATION](./RUFLO-ORCHESTRATION.md).

---

## 1. Architektúra

```
┌─────────────┐     ┌──────────────────────────────────────┐     ┌─────────────┐
│ Agent /     │────▶│ L99 LLM Gateway Skill                │────▶│ Provider    │
│ Ruflo tool  │     │ • triage (difficulty / risk / length) │     │ OpenAI /    │
│             │◀────│ • route → tier/model                 │◀────│ Anthropic…  │
└─────────────┘     │ • cache get/set (exact → semantic)   │     └─────────────┘
                    │ • log + metrics + budget guard       │
                    └──────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Redis (alebo KV)   │
                    │ + optional pgvector│
                    └───────────────────┘
```

**Vstup (normalizovaný):**

- `messages` / `prompt` (text),
- `metadata`: `taskType`, `quality`, `risk`, `userFacing`, `tenantId`, `traceId`, `maxOutputTokens`, …
- `routingHint` (voliteľné): `force_tier` pre escape hatch.

**Výstup:**

- `text` / `messages`,
- `usage`: model, input/output tokens, cache layer (hit/miss),
- `routing`: chosen tier, reason, fallback chain,
- `latencyMs`, `estimatedCostUsd`.

**Princíp:** všetky produkčné LLM volania agentov smerujú cez **jeden gateway** (HTTP služba alebo MCP tool `llm_complete`), nie priamo z agenta do provider API.

---

## 2. Tier modelov a routing logika

### 2.1 Tier tabuľka (príklad)

| Tier | Účel | Typický model (príklad) | Kedy |
|------|------|-------------------------|------|
| **T0 – cache** | 0 tokenov do providera | — | exact / semantic hit |
| **T1 – cheap-fast** | krátke, nízke riziko | haiku / gpt-4o-mini / malý locálny | summary, classify, extract, krátke odpovede |
| **T2 – mid** | balanced | sonnet / gpt-4o | väčšina CRM asistenta, štruktúrovaný JSON |
| **T3 – premium-reasoning** | zložité, user-facing high impact | opus / o1 / frontier | zmluvy, finančné odporúčania, kritické rozhodnutia |

### 2.2 Heuristický „difficulty / risk“ skóre (bez volania LLM)

Implementácia ako **deterministická funkcia** `scoreRequest(input) -> { difficulty: 0..100, flags }`:

- dĺžka promptu + počet správ v konverzácii (dlhé → vyššie),
- prítomnosť kľúčových slov / intent tagu z agenta (`legal`, `pricing`, `medical` → bump),
- `metadata.risk` / `userFacing` z volajúceho,
- požadovaný `quality: draft | standard | high`,
- jazyk / multijazyk (voliteľne +5 ak preklad do viacerých jazykov).

**Pragmatické pravidlá:**

- `risk === 'high'` **alebo** `quality === 'high'` → minimum **T2**, default **T3** pre customer-facing.
- `taskType in ['triage','classify','summarize_short']` a `tokensIn < 2k` → **T1**.
- Neistota: default **T2** (bezpečnejší default ako T1 na produkcii).

### 2.3 Voliteľný „mini“ klasifikátor (lacný LLM)

Jedno volanie **T1** s obmedzeným výstupom: `{"tier":"T1|T2|T3","confidence":0..1}`.  
Ak `confidence < 0.7` → **prepad na T2** alebo druhá heuristika (konzervatívne).

### 2.4 Fallback reťazec

1. Skús zvolený tier.  
2. Ak **HTTP/timeout/parse error** alebo **self-check** zlyhá (prázdna odpoveď, JSON nevalidný) → **+1 tier**.  
3. Max 2 prechody (T1→T2→T3).  
4. Loguj `fallback_reason`.

---

## 3. Caching

### 3.1 Vrstvy

| Vrstva | Kľúč | Úspora | Riziko |
|--------|------|--------|--------|
| **Exact** | `SHA256(canonicalPrompt + modelId + temperature + responseFormat + systemFingerprint)` | vysoká na opakovaných identických requestoch | zastaraná odpoveď pri zmene systémového promptu |
| **Response** | rovnaký ako exact výstup ukladá sa celý výsledok + usage | tá istá ako exact | TTL striktný |
| **Semantic** | embedding promptu (`text-embedding-3-small`), kľúč namespace + `similarity ≥ threshold` | 15–40 % hitov na podobných dotazoch ak threshold nie príliš agresívny | falšné zhody |

**TTL odporúčanie:**

- exact: **5–30 min** pre dynamické CRM dáta, **24 h** pre čisto šablónové úlohy,
- semantic: **kratšie** (napr. 15–60 min) alebo verzovanie `promptVersion` v kľúči.

### 3.2 Invalidácia

- Prepočítaj **`systemFingerprint`** pri každej zmene systémového promptu alebo nástrojového katalógu.
- Tenant-scoped cache: prefix `tenant:{id}:`.
- Manuálny flush endpoint `POST /cache/invalidate` s tajným tokenom (iba interné).

### 3.3 Redis štruktúra (príklad)

```
llm:exact:{hash}     -> JSON { response, meta, expiresAt }
llm:emb:{tenant}:{id}-> vector payload (alebo použite pgvector s HNSW)
```

Semantic: buď Redis Stack + vector search, alebo **Postgres pgvector** s tabuľkou `(id, tenant_id, embedding, response_redis_key, created_at)` a cleanup jobom.

---

## 4. Konfigurácia (YAML príklad)

```yaml
# llm-gateway.config.yaml
version: 1
providers:
  anthropic:
    apiKeyEnv: ANTHROPIC_API_KEY
  openai:
    apiKeyEnv: OPENAI_API_KEY

tiers:
  T1:
    provider: anthropic
    model: claude-haiku
    maxInputTokens: 8000
    costPerMillionInputUsd: 0.25    # ladenie podľa cenníka
    costPerMillionOutputUsd: 1.25
  T2:
    provider: anthropic
    model: claude-sonnet
    costPerMillionInputUsd: 3.0
    costPerMillionOutputUsd: 15.0
  T3:
    provider: anthropic
    model: claude-opus    # alebo konkurenčný frontier
    costPerMillionInputUsd: 15.0
    costPerMillionOutputUsd: 75.0

routing:
  defaultTier: T2
  maxFallbackSteps: 2
  heuristicWeights:
    lengthPer1kTokens: 8
    userFacingBump: 15
    highRiskMinTier: T3

cache:
  redisUrlEnv: REDIS_URL
  exactTtlSeconds: 600
  semantic:
    enabled: true
    embeddingModel: text-embedding-3-small
    similarityThreshold: 0.92
    ttlSeconds: 900
  systemPromptVersion: "crm-v2026-05-23"  # meniť pri deployi promptov

budget:
  rpmLimitAnthropic: 500
  softCapUsdPerDay: 200
```

JSON je ekvivalent; YAML je čitateľnejší pre ľudí.

---

## 5. API / MCP rozhranie

### 5.1 HTTP (gateway služba)

`POST /v1/chat/completions`

```json
{
  "messages": [{ "role": "user", "content": "…" }],
  "metadata": {
    "taskType": "summarize_lead",
    "quality": "standard",
    "risk": "low",
    "userFacing": false,
    "tenantId": "uuid"
  },
  "options": {
    "maxTokens": 1024,
    "temperature": 0.3,
    "responseFormat": { "type": "json_object" }
  }
}
```

Odpoveď:

```json
{
  "content": "…",
  "routing": { "tier": "T1", "model": "claude-haiku", "reason": "heuristic:short_summarize" },
  "cache": { "layer": "exact", "hit": true },
  "usage": { "inputTokens": 0, "outputTokens": 0 },
  "latencyMs": 12
}
```

### 5.2 MCP tool (pre Ruflo)

- `llm_gateway_complete` — deleguje na vyššie HTTP API (jedna implementácia logiky).

Výhoda: agenti vo viacerých MCP klientoch volajú jeden nástroj; metriky na jednom mieste.

---

## 6. Implementačný plán (L99 – konkrétne kroky)

| Fáza | Akcia |
|------|--------|
| **P0** | Samostatný **Node/TS mikrobalík** (`packages/llm-gateway` alebo `apps/llm-gateway`) s `POST /v1/chat/completions`, čítanie YAML env, Redis client. |
| **P1** | Heuristický router + exact cache + struktúrované logy (**OpenTelemetry alebo stdout JSON**). |
| **P2** | Fallback reťazec + jednoduché **cost accounting** (`estimatedCostUsd`). |
| **P3** | Voliteľný **semantic cache** (pgvector alebo Redis Stack). |
| **P4** | MCP wrapper `llm_gateway_complete`; v Ruflo agents doplniť system prompt „vždy volaj gateway, nie provider priamo“. |
| **P5** | A/B flag v config: `routingMode: baseline|optimized`. |

Integrácia s existujúcim CRM: **postupná** — najskôr nové alebo nákladové ťažké cesty (interné cron summary, klasifikácie), neskôr user-facing chat.

---

## 7. Ukážkové útržky kódu (TypeScript)

### 7.1 Kľúč pre exact cache

```typescript
import { createHash } from 'node:crypto';

function canonicalizeMessages(messages: { role: string; content: string }[]): string {
  return JSON.stringify(
    messages.map((m) => ({ role: m.role, content: m.content.trim() })),
  );
}

export function exactCacheKey(args: {
  messages: { role: string; content: string }[];
  modelId: string;
  temperature: number;
  responseFormat: string;
  systemPromptVersion: string;
  tenantId: string;
}): string {
  const payload = [
    args.tenantId,
    args.systemPromptVersion,
    args.modelId,
    String(args.temperature),
    args.responseFormat,
    canonicalizeMessages(args.messages),
  ].join('|');
  return createHash('sha256').update(payload).digest('hex');
}
```

### 7.2 Jednoduchý výber tieru

```typescript
type Tier = 'T1' | 'T2' | 'T3';
type Metadata = {
  taskType?: string;
  quality?: 'draft' | 'standard' | 'high';
  risk?: 'low' | 'medium' | 'high';
  userFacing?: boolean;
};

export function chooseTier(meta: Metadata, tokenEstimate: number): Tier {
  if (meta.risk === 'high' || meta.quality === 'high') return 'T3';
  if (meta.userFacing && meta.taskType?.includes('recommend')) return 'T2';
  const short = tokenEstimate < 2048;
  const simpleTypes = ['triage', 'classify', 'summarize_short', 'extract'];
  if (short && meta.taskType && simpleTypes.includes(meta.taskType)) return 'T1';
  return 'T2';
}
```

### 7.3 Metriky (pseudo)

```typescript
metrics.increment('llm_gateway_requests_total', { tier, cache: hit ? 'hit' : 'miss' });
metrics.histogram('llm_gateway_latency_ms', latencyMs, { tier });
metrics.increment('llm_gateway_estimated_cost_usd_total', estimatedCostUsd);
```

---

## 8. Optimalizácia nákladov a A/B experiment

### 8.1 Realistický cieľ **40–60 %**

Predpoklady (treba doladiť meraním):

- **~55–75 % trafficu** ide na **T1** (interné, krátke úlohy) — ak máte veľa summarization/classify.
- **~20–35 %** na **T2**.
- **~5–15 %** na **T3** (špička).

**Exact + semantic cache:** cieľ **20–35 % cache hit rate** na opakované alebo takmer zhodné požiadavky ⇒ ďalšie **15–35 %** zníženia na podmnožine trafficu.

**Prompt kompresia:** systémové „tool catalog“ odkaz ako ID namiesto vkladania celej špecifikácie; staršie Turns summarizované lacným modelom → ďalších **10–25 %** na dlhých threadoch.

**Batching:** zmysel hlavne pre **embedding** alebo offline joby; synchrónny chat má obmedzenú možnosť.

### 8.2 A/B test

- **A:** priamy provider, fixný model T2/T3 ako dnes.
- **B:** gateway s routing + cache.

**Meraj:** `tokens_in/out`, `estimated_cost_usd`, `latency p50/p95`, `error_rate`, `fallback_rate`, `cache_hit_rate`, **offline kvalita** (golden set 50–100 promptov, LLM-as-judge alebo ľudský spot check).

Rollback: konfig `routingMode: baseline` alebo bypass header `X-LLM-Gateway: off` (iba service-to-service).

---

## 9. Runbook

### Nasadenie

1. Redis (managed) + connection string do `REDIS_URL`.  
2. Deploy gateway ako malá služba (Vercel serverless nie je ideálna pre dlhotrvajúce pooling spojenie; **Fly.io / Railway / vlastný Node** alebo Lambda s **RDS/ElastiCache**).  
3. Nastaviť env: provider kľúče, `SYSTEM_PROMPT_VERSION` pri prompt deployi.  
4. MCP: registrovať tool s URL na gateway + interný auth token.  
5. Postupne presmerovať agentov (feature flag per `taskType`).

### Monitoring

- Dashboard: **cache hit rate**, **tier mix (T1/T2/T3)**, **$/deň**, **fallback %**, **p95 latency**.  
- Alerty: skok `fallback_rate`, pokles `cache_hit` po deployi, prekročenie `softCapUsdPerDay`.

### Vypnutie / rollback

1. Nastav bypass na provider (config alebo env `GATEWAY_DISABLED=true`).  
2. Alebo DNS/traffic späť na priame volania.  
3. Cache nechaj zapnutú read-only ak chceš zachovať hit rate pri opätovnom zapnutí.

---

## 10. Riziká a mitigácie

| Riziko | Mitigácia |
|--------|-----------|
| Lacný model zle odpovie | Konzervatívne prahy; `userFacing+high risk` → T3; self-check (JSON schema / length); fallback reťazec |
| Zastaraná cache | Krátky TTL; `systemPromptVersion` v kľúči; invalidácia pri deployi |
| Semantic falošná zhoda | Vysoký threshold (0.92+); obmedziť na low-risk task types; logovať „semantic hit“ pre audit |
| Komplexita / single point of failure | Health check; timeout; pri zlyhaní gateway priamy fallback na T2 (obmedzený) |
| Únik dát v cache | Tenant prefix; šifrovanie at-rest Redis; neukladať PII do kľúčov |

---

## 11. L99 minimal‑risk playbook (riziká čo najnižšie)

Cieľ: **minimalizovať škodu** pri zavedení routingu/cache — nie maximálnu úsporu za kaľúvek. Níže sú **prioritné kontroly** (vrstvené obrany).

### 11.1 Policy ako kód — „nikdy lacný model tu“

- **Denied paths:** zoznam `taskType` + `intent` kde **nie je dovolené T1** (napr. `legal_review`, `loan_advice`, `pricing_commit`, všetko s `regulated: true`).  
- **Mandatory T3:** `metadata.complianceTier === SOC2_customer` alebo ekvivalent → vždy T3 bez cache read (alebo cache len read-through s **krátkou TTL** a **audit flag**).  
- **Allow‑list cache:** semantic cache povolená **iba** pre explicitne whitelisted task types (`summarize_internal_log`, nie user chat).

### 11.2 Shadow mode + Canary (bez dopadu na používateľa pred plným routingom)

1. **Shadow:** gateway volá paralelne **lacný tier** ale do produkcie vracia stále odpoveď z **baseline T2/T3**; porovnávaj len log (`shadow_diff_score`, latent latency). Žiadny user impact.  
2. **Canary:** **1–5 %** produkčných requestov na plný routing + cache; zvyšok baseline. Gauge: error rate, human spot checks, rollback **< 60 s** cez konfig.

### 11.3 Killswitch vrstvy (instant rollback bez redeploy aplikácie)

| Úroveň | Úkon |
|--------|------|
| **Globálny** | `GATEWAY_MODE=baseline` \| `routing_disabled` \| `cache_writes_disabled` |
| **Tenant** | per-tenant deny routing v gateway (feature store / dynamický config) |
| **Task** | hlavička `X-LLM-Routing: shadow-only` \| `force_tier:T3` z dôveryhodných služieb |

**Žiadny** killswitch nesmie vyžadovať redeploy **CRM** na Verceli — len CDN/config server gateway.

### 11.4 Výstupné guardrails (nie „dúfam že model uhádol“)

- **Štruktúra:** JSON Schema / Zod validácia; pri fail → automatický **retry vyšší tier**, max 1×.  
- **Obsah:** blokované patterny (napr. prázdne citations pri „with_sources“ úlohe), min dĺžka pri summary.  
- **Regresívne risky:** ak response obsahuje frázu typu „I cannot give legal advice“ pri produkčnej úlohe — **nevkladať do cache**.

### 11.5 Observability ako bezpečnostná brána

- **Alerty:** narast **fallback_rate** nad baseline + X σ; **latency p95** skok o Y %; cache hit **nad** 95 % (podozrivé — semantic leak alebo poisoning).  
- **Trace jedného requestu:** `traceId`, tier, cache layer, fallback chain, hashed prompt (nie raw pri PII).  
- **SLO:** p95 latency a error budget; pri prečerpaní → auto **clamp na T3 + vypnutie semantic**.

### 11.6 Ochrana cache a dát

- **PII tagging:** vstup klasifikovaný ako `contains_pii` → **neukladaj** do semantic store; exact cache iba ak config `cache.allowPiiExact: false`.  
- **Podpis hodnot:** pri persistencii Redis payload `HMAC(secret, canonicalBody)` na detekciu manipulácie.  
- **Verzia promptu:** každá cache entry viazaná na `SYSTEM_PROMPT_VERSION` + hash nástrojového katalógu.

### 11.7 Ľudsky v slučke (HIL) kde musí byť

- Finálna schválena odpoveď pred odoslaním externému právnemu/regulačnému kanálu → **queued state**, nie automatický odoslaný email z T1 výstupu.

### 11.8 Zhoda s Ruflo / MCP (orchestrator)

**Ruflo `guidance_recommend`** pri tejto úlohe odkázal na všeobecné oblasti: **agent‑management**, **swarm‑orchestration**, **hooks‑automation** — použiteľné takto:

| Ruflo / koncept | Ako rizikuješ výpadok |
|-----------------|------------------------|
| **Hooks / automation** (`hooks_route` pri štarte úlohy) | Vynútiť povinné `/metadata` pole (`risk`, `taskType`), inak gateway odmietne routing (safe default T3). |
| **Samostatný „review“ agent / swarm reviewer** | Druhé oko nad batchom (offline): golden set po každej zmene tier prahov; nie inline latencia. |
| **Managed agents** | Týždenný job: analyzuj logy gateway, navrhni úpravu prahov; človek schváli PR. |

Niektoré funkcie závisia od dostupných nástrojov v tvojom Ruflo build‑e — vždy over `guidance_capabilities`.

---

## 12. Zhrnutie

Skill **L99 LLM Gateway** je **jedna služba + jeden MCP nástroj**, ktorá centralizuje **routing, cache, metriky a rozpočet**. Začnite s **heuristikou + exact cache + Redis**, potom **semantic** a **mini-klasifikátor**.

**Minimal risk path:** najprv **shadow + canary + killswitch**, potom rozšir routing; **semantic cache naposledy** alebo iba na allow‑liste. Úspora **40–60 %** je dosiahnuteľná pri zdravom pomere T1 trafficu a cache hit rate; čísla drž **meraním** na vlastnom traffic mixe — nikdy na „papierových“ úsporách bez alerting.
