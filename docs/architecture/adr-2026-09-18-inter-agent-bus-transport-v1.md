# ADR 2026-09-18 — Inter-Agent Bus: transportná vrstva v1

**Status:** IMPLEMENTED (L0 + L1 kód), NOT DEPLOYED (L1 čaká na founder GO)
**Nahrádza:** nič. Dopĺňa `docs/prompts/revolis-inter-agent-bus-v1.md` (protokol, fáza 1 = copy-paste).

---

## 1. Problém

Bus existoval ako **protokol a governance vrstva** (`.ai/bus/` + `AGENT_PROTOCOL.md`
+ `message.schema.md`), nie ako **transport**. Dôsledok:

```
SOL/GPT  --(founder copy-paste)-->  Claude Code  --(founder copy-paste)-->  SOL/GPT
```

Founder je API medzi agentmi. Tri konkrétne náklady:

1. **Latencia** — každý handoff čaká na človeka.
2. **Strata kompresie** — 3 000-slovný výstup putuje celý, namiesto 15-riadkového digestu.
3. **Strata auditovateľnosti** — správa, ktorá prešla len chatom, nie je v repe.

Merateľné na dnešnom stave repa: 41 súborov v `.ai/bus`, z toho 35 pre-v1
frontmatter a 6 bez frontmatter vôbec — písané ručne, bez validácie, s piatimi
rôznymi spellingami toho istého poľa (`created` vs `created_at`, `owner` vs `from`,
`re` vs `thread`).

## 2. Rozhodnutie (Constitution v2 — 12-otázkový check)

Toto **nie je** zákaznícka funkcia; podľa PRIME DIRECTIVE by sama osebe neprešla.
Skóruje sa ako **execution leverage**, nie ako feature:

| # | Otázka | Odpoveď |
|---|--------|---------|
| 1 | Zaplatil by klient? | NIE — interný nástroj. **Bez VETO override by to bol max VALIDATE.** |
| 7 | Vyššie ROI než zvyšok backlogu? | ÁNO pre rýchlosť dodávky — odstraňuje človeka z každého handoffu. |
| 8 | Správny čas? | ÁNO — protokol už 3+ reálne handoffy používa (evolution rule v1 splnená). |
| 9 | MVP < 2 týždne? | ÁNO — dodané v jednej session, 0 nových závislostí. |
| 11 | Najlepšie využitie founder času? | Founder-as-message-bus je presný opak. |

**Verdikt: BUILD (L0 + L1 kód), DEPLOY = samostatný founder GO.**
Zapísané v `memory/decisions.md`.

Vedomý kompromis: otázka 1 je NIE. Držíme to malé — žiadna DB, žiadne UI,
žiadny orchestrátor, žiadne nové runtime závislosti.

## 3. Architektúra

```
          SOL / GPT (Custom GPT Action, OpenAPI)
                 │  HTTPS + Bearer
                 ▼
        ┌──────────────────────┐
        │  BUS HTTP TRANSPORT  │  packages/bus-core/src/http.ts
        │  (Web Request/Resp.) │  scripts/bus/serve.ts (node:http)
        └──────────┬───────────┘
                   │
        ┌──────────▼───────────┐
        │      BUS STORE       │  FileBusStore  (lokálny checkout)
        │                      │  GitHubBusStore (serverless → commity)
        └──────────┬───────────┘
                   │  súbory
        ┌──────────▼───────────┐
        │   .ai/bus/**.md      │  git = single source of truth
        └──────────┬───────────┘
                   │  CLI
             Claude Code / Cursor / runner
                   │
                 FOUNDER — iba GO REQUIRED rozhodnutia
```

**Prečo git ako message store:** história, review, rollback a offline prístup
zadarmo. Žiadna nová databáza, žiadny nový systém, ktorý môže spadnúť.

## 4. Čo je dodané

### L0 — lokálny transport (funguje dnes, bez inštalácie)

- `packages/bus-core/` — 0 závislostí, beží na natívnom Node type-strippingu (Node ≥ 22.18).
  - `types.ts` — v1 envelope (`counters`, `decisions_required`, `next_action.gate`, `mode`, `stop_after_report`).
  - `yaml.ts` — YAML podmnožina, ktorú bus reálne používa. Pri nepodporovanej syntaxi **hodí chybu namiesto hádania**.
  - `envelope.ts` — parse/serialize/validácia + detekcia credentials (bus rule 6).
  - `digest.ts` — kompresná vrstva: z 3 000 slov spraví rozhodovací skelet.
  - `store.ts` / `github-store.ts` — transport nad súbormi resp. GitHub Contents API.
- `scripts/bus/cli.ts` — `npm run bus -- send|pull|read|digest|ack|validate`.

### L1 — HTTP transport (kód hotový, nenasadené)

- `packages/bus-core/src/http.ts` — handler nad Web `Request`/`Response`;
  mountovateľný aj v Next.js route bez zmeny.
- `scripts/bus/serve.ts` — standalone `node:http` server.
- `docs/prompts/revolis-bus-openapi.yaml` — schéma pre ChatGPT Custom GPT Action.

### Test coverage

`npm run bus:test` — 61 testov, vrátane:
- regresie nad **reálnymi** súbormi v `.ai/bus` (všetky parsujú, žiadny sa neprepisuje),
- GitHub store proti fake fetchu (vrátane sha/conflict cesty),
- HTTP vrstva vrátane 401/403/409/413 a odmietnutia credentials,
- reálny `node:http` round-trip.

## 5. Čo dodané NIE JE (a prečo)

| Nedodané | Dôvod |
|---|---|
| Autonómny orchestrátor | Mimo scope MVP. Bus prenáša správy, nerozhoduje. |
| Cost governor | Až po tom, čo bus vyprodukuje reálne dáta o objeme. |
| MCP server nad busom | Ďalšia fáza; CLI + HTTP dnes stačia. |
| Websockets / push | Pull model je dostatočný pre ľudské tempo handoffov. |
| Auto-migrácia 35 pre-v1 správ | História sa neprepisuje. Pre-v1 = warning, nie error. |
| Nasadenie na Vercel | Founder GO + rozhodnutie o hostingu (viď §7). |

## 6. Bezpečnostný model

- **Fail-closed:** bez `REVOLIS_BUS_TOKEN` server odmietne naštartovať. Anonymný režim neexistuje.
- **Bearer token**, porovnávaný `timingSafeEqual`.
- **Write allowlist:** cez HTTP sa zapisuje len do `inbox`, `tasks`, `context`,
  `decisions`. Nikdy do `archive`/`state`.
- **Limit 64 KB** na telo — bus prenáša odkazy na súbory, nie logy.
- **Detekcia credentials** pred zápisom (GitHub/Anthropic/OpenAI/Supabase/Postgres vzory).
- **Gate sa neobchádza:** `next_action.gate` a `decisions_required[].gate` sú dáta.
  Bus nikdy nevykonáva a nikdy neschvaľuje. PROD/merge/nová scope = founder GO.
- **GDPR:** bus prenáša interné engineering artefakty. Osobné údaje doň nepatria —
  rovnaké pravidlo ako doteraz (README rule 6). Žiadny nový externý zdroj dát,
  takže `master-data-sourcing-map.md` sa nemení.

## 7. Nasadenie — otvorené rozhodnutie pre foundera

Aby ChatGPT vedel volať bus, endpoint musí byť verejne dostupný cez HTTPS.
Tri možnosti, od najlacnejšej:

1. **Lokálne + tunel** (`cloudflared`/`ngrok`) — 0 €, funguje hneď, beží len keď beží notebook.
2. **Samostatný malý host** (Fly/Render/Railway) — ~5 €/mes., `scripts/bus/serve.ts` + `GitHubBusStore`.
3. **Mount v `apps/crm`** ako `/api/bus` — bez nového hostingu, ale zamotáva interný
   nástroj do produktovej appky a jej deploy cesty. **Neodporúčam pre MVP.**

Potrebné premenné (žiadna nie je v repe):
`REVOLIS_BUS_TOKEN`, `REVOLIS_BUS_GITHUB_TOKEN`, `REVOLIS_BUS_REPO`,
`REVOLIS_BUS_BRANCH`, voliteľne `REVOLIS_BUS_WRITABLE_BOXES`.

**Odporúčanie:** 1 na overenie (jeden reálny ChatGPT ↔ Claude handoff bez copy-paste),
potom 2, ak to preukáže hodnotu.

## 8. Ako sa meria, či to fungovalo

Po dvoch týždňoch používania:

- **Počet handoffov cez bus** (`npm run bus -- digest --limit 100`) vs. handoffov cez chat.
- **Podiel správ, kde founder čítal len digest**, nie celé telo.
- **Počet `decisions_required` položiek** — koľko rozhodnutí reálne potrebovalo človeka.

Ak po dvoch týždňoch prevažuje copy-paste, transport nevyriešil problém a patrí
do archívu — nie do rozširovania.
