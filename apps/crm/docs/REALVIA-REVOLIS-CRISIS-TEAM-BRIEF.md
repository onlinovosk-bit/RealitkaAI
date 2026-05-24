# Krízový tím: Realvia ↔ Revolis — nájdenie príčiny nefunkčnosti

**L99 incident response.** Účel: systematicky nájsť, **kde reťazec padá** (edge → auth → payload → DB → fronta → worker), nie hádať.

**Ruflo (aktivované):** `guidance_recommend` pre túto úlohu navrhol oblasti **security** (security_scan / security_validate), **swarm-orchestration** (koordinovaná diagnostika), **hive-mind** (konsenzus viacerých pohľadov), **hooks-automation** (`hooks_route` na štandardizovaný checklist), **session-workflow** (task lifecycle). V praxi: **swarm/hooks** na rozdelenie podúloh; **security** na validáciu konfigurácie a únikov tajomstiev (nie na „hack“ Realvie).

---

## Keď neznáš „chybu X“ (prioritný postup)

1. **Zhromaždi dôkazy:** presný HTTP status + JSON body z Realvie, čas UTC, `request_id` z Revolis logov (ak existuje).  
2. **Autorizovaný snapshot konfigurácie (bez leaku tajomstiev):**  
   ```http
   GET /api/webhooks/realvia?diag=config
   Authorization: Bearer <CRON_SECRET>
   ```  
   Odpoveď obsahuje booleans + počet allowlist IP + **hints** (čo je najčastejší root cause). Ten istý `CRON_SECRET` ako pre `/api/cron/realvia-process`.  
3. **Dump hlavičiek (verejné — neposielaj verejne ak obsahuje interné veci):**  
   `GET /api/webhooks/realvia?dump=headers` — over `x-forwarded-for` / IP.  
4. **Supabase:** existuje riadok v `realvia_webhook_logs`? v `realvia_processing_queue`?  
5. **Špecialisti (Ruflo):** `guidance_recommend` + oblasť **security** (`security_validate` / `security_audit`) na konfig/kód; **hooks_route** na fix checklist; pre ťažké prípady **swarm** alebo **managed_agent** s read-only prístupom k logom.

---

## Krízový tím — role (kto čo vlastní)

| Rola | Zodpovednosť | Prvé kroky |
|------|----------------|------------|
| **Incident Commander** | časová os, komunikácia s Realvia, go/no-go rollback | začať Incident doc; zbierať `request_id` / čas dopadu |
| **Edge & IP** (`validateSourceIP`) | `REALVIA_ALLOWED_IP`, Vercel `x-forwarded-for` vs viditeľná IP | porovnať IP v logu s env; `GET …/dump=headers` |
| **Auth** (`validateSecret`) | `REALVIA_IDENTIFIER`, `REALVIA_IDENTIFIER_2`, timing-safe párovanie | 403 bez logu webhooku alebo „Invalid authentication“ šablóna |
| **Payload** | JSON shape, veľkosť &lt; 5 MB | 400 Invalid JSON / unknown `payload_type` v logoch |
| **Supabase ingest** (`storeWebhookLog`) | tabuľa `realvia_webhook_logs`, service role key | 500 Internal storage — žiadny riadok v DB |
| **Fronta** (`enqueueProcessingJob`) | `realvia_processing_queue` | webhook uložený, job prázdny / stuck |
| **Async worker / cron** | `/api/cron/realvia-process` (alebo dokumentovaný cron) | 200 webhook ale inzerát v CRM nie — prázdny worker |
| **Agency mapping** (`resolveAgencyIdFromRealviaHeaders`) | párovanie hlavičiek vs `agencies` + RPC migrácia | `agency_id` null — fallback alebo prázdny zmysel procesora |

Každá rola číta **jeden zdroj pravdy**: Vercel/observability logy + Supabase dashboard.

---

## Reťazec žiadosti (čo má platiť pri „prepojení funguje“)

1. HTTP **POST** `…/api/webhooks/realvia`  
2. **validateRequest** (`validate.ts`): HTTPS (prod), **IP allowlist**, **auth hlavičky**, veľkosť tela  
3. Parsovanie JSON, typ payloadu (`advert` / `delete`)  
4. **resolveAgency** z hlavičiek `identifikator` / `identifikator2`  
5. **INSERT** `realvia_webhook_logs`  
6. **INSERT** `realvia_processing_queue` (môže zlyhať mäkko — stále 200 ale bez jobu)  
7. Ödpoveď **200** `{ "result":"ok", … }` (úspešný handshake s Realviou — neznamená ešte import do `properties`)

Kód vstupného bodu: `apps/crm/src/app/api/webhooks/realvia/route.ts`.

---

## Diagnostický flowchart (či najprv pozri)

```
403 + "Source IP … not in allowed list"
  → REALVIA_ALLOWED_IP (čísla Oddelené čiarkou); skontroluj prvú IP z XFF na Verceli

403 + unified auth message (Invalid authentication / REALVIA_AUTH_ERROR_MESSAGE)
  → REALVIA_IDENTIFIER + REALVIA_IDENTIFIER_2 musia sedieť s hlavičkami od Realvie (prod musí mať nastavené obe)

400 Invalid JSON / 413 Payload too large
  → telo požiadavky / publisher

500 Internal storage error
  → Supabase SERVICE ROLE, migrácie tabuliek realvia_webhook_logs, RLS blokujúci service_role? (typically service bypass)

200 OK z webhooku ale dáta v CRM nie
  → fronta alebo cron worker; riadky v realvia_processing_queue status; dokumentácia cronu
```

GET diagnostika hlavičiek: `GET /api/webhooks/realvia?dump=headers` (pozri `route.ts`).

---

## Ruflo — ako to „rozbehnúť“ v orchestrácii (nie jeden Cursor chat)

1. **`hooks_route`** na začiatku incidentu — vynútiť vstupný checklist (IP snippet, curl repro, časové okno).  
2. **`swarm_init`** + paralelné vyšetrovacie vetvy: vetva A logy/env, vetva B Supabase queries, vetva C diff posledných deployov. *(Nástroje `swarm_spawn` závisí od vašej inštancie Rufla — lokálny MCP má min. swarm_init/status/shutdown/health.)*  
3. **Security area** na sken konfig traceov (čeľ či accidental secret v log headers — Realvia webhook loguje hlavičky s redakciou, overiť).  
4. **Session/workflow**: jeden dokument „Incident timeline“ ako jediný konsolidovaný výstup pred uzavretím.

---

## Reprodukčný minimálny test (bez Realvie)

- Z **povoleného** zdroja (alebo lokálny `NODE_ENV=development`): curl s platnými `identifikator` / `identifikator2` a malým JSON podľa vášho typu.  
- Overiť najprv **200 + riadok v `realvia_webhook_logs`**, potom rad v `realvia_processing_queue`.

---

## Uzávierka incidentu (L99)

- **Root cause** jednou vetou (napr. „IP Realvie nebola v ALLOW list“).  
- **Remediation** (env / migrácia / worker schedule).  
- **Prevention**: alert na 403 spike; dokumentovať všetky produkčné IP Realvie; staged allowlist PR.

Príbuzný dokument infra: napr. [realvia-external-cron-setup](./realvia-external-cron-setup.md); onboarding priebežne doplň do repa podľa vlastného názvoslovia projektu.
