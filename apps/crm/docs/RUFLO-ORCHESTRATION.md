# Ruflo orchestrácia — mimo jedného Cursor chatu

Tento dokument dopĺňa [L99-master-prompt](./L99-master-prompt.md) a vysvetľuje, ako používať Ruflo MCP (`user-ruflo`) tak, aby práca nemusela držať celý kontext v jednom Cursor chate.

---

## Prečo „mimo jedného chatového vlákna“

Jeden chat v IDE má obmedzený kontext a jeden priebeh odpovedí. **Managed agent** a **swarm** držia stav inde (Anthropic cloud session alebo Ruflo swarm store), takže ich môže spúšťať orchestrátor: iný chat, cron, skript, CI — vždy s **uloženým `sessionId` / `swarmId`**.

---

## Čo MCP v tomto workspace skutočne exportuje (užitočný výrez)

Podľa MCP deskriptorov `user-ruflo`:

| Skupina | Nástroje (príklad) | Účel |
|---------|---------------------|------|
| **Managed cloud agent** | `managed_agent_create`, `managed_agent_prompt`, `managed_agent_events`, `managed_agent_list`, `managed_agent_status`, `managed_agent_terminate` | dlhší beh v cloude, transcript na serveri, viac turnov bez jedného chatu |
| **Swarm** | `swarm_init`, `swarm_status`, `swarm_shutdown`, `swarm_health` | koordinovaný viac-agentný stav (topológia/stratégia) |
| Lokálny WASM sandbox | `wasm_agent_*`, `wasm_gallery_*` | krátky, offline-štyl — nie náhrada dlhého cloudu |

Poznámka: dokumentácia Rufla môže spomínať aj CLI príkazy (napr. `swarm spawn`); všetko v MCP nemusí mať 1:1 JSON nástroj. Over aktuálnu verziu v Ruflo UI/help.

---

## Managed agent — odporúčaný tok

1. **`managed_agent_create`**  
   Nastav `system` (napr. odkaz na L99 + scope úlohy), `title`, `model`, voliteľne `packages`, `networking`.  
   Ulož `sessionId` (a ďalšie ID ak ich API vracia).

2. **`managed_agent_prompt`**  
   `sessionId` + prvý úkol v `message`.  
   Predvolene čaká krátko (`maxWaitMs` ~180s, strop často 600s) — na dlhé behy zvýš čas alebo používaj `managed_agent_events`.

3. **Ďalšie „vlákna“ orchestrátora**  
   Rovnaký `sessionId` + nový `message` = pokračovanie bez resetu celej histórie v jednom Cursor chate.

4. **Audit**  
   `managed_agent_events` — plný log (tool_use, text).

5. **Úklid**  
   `managed_agent_list` → `managed_agent_terminate` (podľa potreby).

**Prerekvizity:** Anthropic Managed Agents (beta/oprávnenia), `ANTHROPIC_API_KEY` v prostredí, kde Ruflo MCP beží.  
**MCP URL do cloudu:** lokálny `ruflo mcp` bez tunelu z internetu cloud agent neuvidí — treba verejný endpoint alebo tunel.

---

## `maxTokens` — default je príliš nízky pre kód + commit

V repozitári **nie je** globálny Ruflo config s `max_tokens` (`.swarm/`, `.ruflo/`, `.claude-flow/` prázdne; `.cursor/mcp.json` len spúšťa `npx ruflo@latest mcp start`).

| Cesta | Default | Kde |
|-------|---------|-----|
| `agent_execute` (MCP) | **1024** output tokenov | `@claude-flow/cli` → `agent-execute-core.js` (`max_tokens: input.maxTokens \|\| 1024`) |
| `managed_agent_prompt` | bez parametra | cloud session — iné limity |
| Cursor native agent | Cursor IDE | nie Ruflo |

**1024 nestačí** na úlohu „napíš kód + test + commit message“ — odpoveď sa usekne (`stop_reason: max_tokens`), swarm vyzerá ako hotový, ale artefakt chýba (súvisí s AP-009).

### Povinné pri `agent_execute`

Vždy explicitne pošli `maxTokens` pri code/implementačných úlohách:

```json
{
  "agentId": "agent-…",
  "prompt": "…",
  "maxTokens": 16384
}
```

Odporúčané hodnoty:

| Typ úlohy | `maxTokens` |
|-----------|-------------|
| Krátka analýza / routing | 2048–4096 |
| Kód + testy + diff | **16384** |
| Veľký refactor / viac súborov | **32768** (ak model podporuje) |

Do orchestrátora / `system` promptu swarm agenta doplň:

```markdown
Pri každom volaní agent_execute pre implementáciu vždy nastav maxTokens >= 16384.
Bez toho považuj výstup za neúplný (AP-009).
```

**Poznámka:** Ruflo zatiaľ nemá env premennú typu `RUFLO_MAX_TOKENS` — limit sa mení len per-call v `agent_execute`, nie v `mcp.json`.

---

## Swarm — základný tok

1. `swarm_init` (topology, maxAgents, strategy, config) → získaj `swarmId` (alebo podľa Rufla „latest“).  
2. `swarm_status` — priebežná kontrola.  
3. Po dokončení `swarm_shutdown`.  
4. `swarm_health` — diagnostika.

### Orchestrátor — guardraily proti zastaranému `main`

Pri 6+ paralelných agentoch za noc sa vetvy často postavia na `main`, ktorý medzitým posunie iný merge. Bez ochrany vzniká tichá regresia (stale testy, JSON, allowlist).

**GitHub (povinné):** `main` branch protection — **Require branches to be up to date before merging** + required status `Lint, test, build`. Každý PR musí byť rebased pred merge; sémantické konflikty sa ukážu v CI, nie po merge.

**Pravidlo agenta (povinné v tom istom PR):** meníš správanie flagu, featury, gatingu alebo verejného kontraktu → `rg` v `apps/crm/tests/verification/` → aktualizuj dotknuté `*.verification.test.ts`. Verification suite je **živá špecifikácia**, nie múzeum. Orchestrátor agenta neoznačí DONE, kým grep + verification testy nie sú v PR.

**Ranný swarm checklist:** pred review rebasni otvorené PR na `origin/main` (Update branch / rebase), potom CI.

---

## Ako volať MCP mimo aktuálneho chatu

Rovnaké volania ako Cursor robí cez MCP môže robiť:

- iný Cursor Agent / Cloud Agent s rovnakou MCP konfiguráciou,
- vlastný runner (skript) podľa Ruflo/MCP transport dokumentácie,
- prípadne Cursor SDK (pozri projektové skills pre `@cursor/sdk`).

Kľúčové je **perzistentné ID** (`sessionId`, `swarmId`) a **orchestrátor**, ktorý ich ukladá (súbor, secret store, DB).

---

## Šablóna: `system` alebo prvý `message` pre managed agenta

```markdown
ÚLOHA ORCHESTRÁTORA (mimo Cursor chat pamäť)
- Nie si závislý od predchádzajúcej konverzácie; drž vlastný stav (session_id u orchestrátora, súhrny výstupov).
- L99: apps/crm/docs/L99-master-prompt.md — analýza → implementácia → verifikácia (test/build/smoke).
- 1 logická zmena na PR; žiadny megadiff bez požiadavky.
- Commit/push len na explicitnú inštrukciu vlastníka repa.
- Záver: ČO ZMENENÉ · ČO OVERENÉ · RIZIKÁ/OTVORENÉ.

PRACOVNÝ POSTUP
1) Zámer a obmedzenia (bez leaku tajomstiev).
2) Najmenší bezpečný diff.
3) Kroky / patch inštrukcie.
4) Verifikácia a blokery.
5) Pri agent_execute: maxTokens >= 16384 pre implementáciu (default Ruflo je 1024).
```

Konkrétny task (napr. Realvia, migrácia, UI) doplň ako samostatný blok pod týmto.

---

## Náklady a bezpečnosť

- Managed cloud agent = **účtovanie** u Anthropic — po práci kontrola `managed_agent_list` a ukončenie nepotrebných session.
- Do promptov nedávaj **raw** service role kľúče ani webhook tajomstvá — len názvy env premenných alebo postupy.

---

---

# Nerozumiem: „Migrácia + deploy app v tom istom commite / paralelne“

**Pôvodná veta (L99 zmysel):**  
*Pri plnom L99 často: najprv alebo paralelne nasadiť migráciu na Supabase a nasadiť aplikáciu (Vercel) z **rovnakého commitu**, aby v produkcii nebola dlho len „polovica“ zmeny.*

### Čo je „polovica zmeny“

Zmena je často **dvojdielna**:

1. **Databáza (Supabase)** — nová funkcia, tabuľka, stĺpec, index (súbor v `supabase/migrations/…`).
2. **Aplikácia (Next.js na Verceli)** — kód, ktorý tú DB vec **volá** (napr. `supabase.rpc('resolve_agency_id_for_realvia', …)`).

Ak sa tieto dve časti rozídu v čase, produkcia môže byť v **nekonzistentnom** stave:

| Stav v čase | Čo sa deje |
|-------------|------------|
| **Starý kód + nová DB** | Zriedka problém, ak nová schéma je spätne kompatibilná (starý kód staré volania nevolá). |
| **Nový kód + stará DB** | **Problém:** app volá RPC/funkciu, ktorá **ešte neexistuje** → chyba pri behu (alebo fallback, ak si ho naprogramoval). |
| **Nový kód + nová DB** | Očakávaný cieľ — všetko sedí. |

„Polovica zmeny“ znamená práve to: **už je nasadený len jeden z dvoch dielov** a druhý mešká.

### Prečo „rovnaký commit“

V jednom commite (alebo v jednom PR, ktorý mergeuješ naraz) máš **zviazané**:

- presná verzia SQL migrácie,
- presná verzia TypeScript kódu, ktorý ju používa.

Deploy z **iného** commitu môže znamenať: migrácia je staršia/novšia ako kód — zvyšuje sa riziko mismatchu.

### Prečo „paralelne“ alebo „najprv migrácia“

- **Ak nasadíš najprv migráciu, potom app:** DB je pripravená skôr, než nový kód začne RPC volať — **bezpečnejšie** pre „nový kód potrebuje novú funkciu“.  
- **Ak nasadíš najprv app, potom migráciu:** nový kód môže chvíľu padať, kým migrácia neprebehne.  
- **Paralelne** (automatizácia: jeden pipeline krok DB + jeden deploy) skracuje okno, kedy je systém rozbitý.

### Praktické L99 pravidlo

1. **Jeden PR** = jedna logická zmena = migrácia + súvisiaci app kód spolu (ak spolu patria).  
2. Najprv over **staging**: rovnaký commit → migrácia aplikovaná → deploy preview.  
3. Na **production** najkratšie možné okno „polovičnej“ zmeny; ideálne **migrácia tesne pred alebo súčasne s** deployom z toho istého zdroja pravdy (commit).

### Výnimka

Ak kód má **zámerný fallback** (volá RPC, pri zlyhani použije starý dotaz), chvíľa „nový kód, stará DB“ môže byť akceptovateľná — stále je to však technický dlh do ďalšieho merge deployu migrácie.

---

## Súvis s Realvia RPC

Migrácia `20260523183000_resolve_agency_id_for_realvia_rpc.sql` pridáva funkciu v DB. Kód `resolveAgency.ts` ju volá s fallbackom na legacy `.eq()`.  

- **Migrácia + nový kód spolu:** plný efekt tolerantného párovania.  
- **Iba nový kód bez migrácie:** stale funguje fallback.  
- **Iba migrácia bez nového kódu:** takmer žiadny prínos (starý kód RPC nevolá).  

„Rovnaký commit“ tu stále pomáha udržať jasnú pravdu **čo patrí k čomu** pri audite a rollbacku.
