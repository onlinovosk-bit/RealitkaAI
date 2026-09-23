# Runner contract 2D — always-on poll (NIE implementácia)

**Status:** CONTRACT (KROK 2D, prvá polovica)  
**GO:** `BUS-RUNNER-2D-CONTRACT`  
**Dátum:** 2026-09-21  
**Zdroj rozhodnutí:** `docs/architecture/adr-2026-09-21-bus-runner-v2.md` §1.1–1.3  
**Karta:** `.ai/bus/tasks/TASK-BUS-RUNNER-2D.md`  
**Prerekvizity (founder: overené, nepreverované znova):** 2B `0341c45` (#611), 2C `b71f8dc` (#615), OQ-1 ratifikovaná v `execution-state.ts:17-19`

Tento dokument **neimplementuje** runner. Prekladá founderove rozhodnutia do
kontraktu, ktorým sa musí riadiť akákoľvek budúca / už landnutá always-on slučka.
Zmena `packages/bus-core/**` a `scripts/bus/**` je mimo scope tohto GO.

---

## 1. Proces

| Položka | Kontrakt | Kotva |
|---|---|---|
| Spúšťa | Jeden cyklus `runConsumer` (gate → lease/stav → voliteľne Claude → post/ack) | ADR §1.2; `scripts/bus/consume.ts` `runWatch` |
| Cyklus | Poll **60 s** (`DEFAULT_POLL_INTERVAL_MS = 60_000`) | ADR §1.2; `consume.ts:752` |
| Zastavenie | SIGINT / `AbortSignal`; cyklus v lete dobehne, potom stop | `consume.ts:757-758`, `runWatch` |
| Endpoint | **Žiadny verejný listener.** Runner ťahá z BUS (HTTP klient), nič nepočúva | ADR §1.2 |
| Webhook | **Zakázaný** | ADR §1.2, §12 |
| Cloudflare | Nie je dependency runnera | ADR §1.2 |
| Inštancie | Práve **jedna** on host; multi-runner mimo rozsahu | ADR §5, §12 |
| Capability surface | Stále len `bus-alive` (`DEFAULT_CAPABILITIES`) — 2E je samostatné GO | ADR §9; `consumer.ts:80` |

OQ-1 (ratifikované, neotvárať): `CLAUDE_RUN_TIMEOUT_MS = 10 min`, `LEASE_TTL_MS = 2 min`,
`HEARTBEAT_INTERVAL_MS = 30 s` — `packages/bus-core/src/execution-state.ts:17-19`.

---

## 2. Identita a oprávnenia (OQ-3)

### 2.1 Rozhodnuté (z DEC-20260921-002 + ADR §1.2 / §7)

- Runner beží na **samostatnom always-on hoste** (nie founder notebook, nie CI, nie efemérny kontajner).
- Token / PAT runnera **nie je osobný credential foundera** — strojová identita.
- Runner **nesmie:** merge, push do `main`, deploy, čítať/zapisovať secrets do správ alebo logov, rozširovať capability allowlist bez GO.
- Zápis transportom je len do BUS boxov; cieľová vetva podľa ADR §7 je `bus/main`, nie produkčný `main`.

### 2.2 BLOCKED — vyžaduje founder GO

Fine-grained PAT s `contents: write` **sa nedá** obmedziť na jednu vetvu (ADR §10.3, §11).
Bez founder rozhodnutia tento kontrakt **nezriaďuje** token, account ani hosting.

| Návrh (na founder GO) | Prečo |
|---|---|
| Dedikovaný GitHub machine account (nie ľudský login) | Oddelenie auditu / revoke od osobného PAT |
| PAT len s minimálnym `contents: write` na tento repo | Iné scopes (admin, workflow, packages) zakázané |
| Branch protection na `main`: required reviews + required checks; machine account **nie** v bypass list | Jediná tvrdá bariéra mimo dobrej vôle, kým PAT vie písať všade |
| Env na hoste: `REVOLIS_BUS_TOKEN` (alebo per-agent `REVOLIS_BUS_TOKEN_CLAUDE`) + voliteľne `REVOLIS_BUS_GITHUB_TOKEN` / `REVOLIS_BUS_REPO` / **`REVOLIS_BUS_BRANCH=bus/main`** | Explicitne nie default `main` |

**Nález (FAKT z kódu, nie odhad):** `scripts/bus/serve.ts:50` —  
`branch: env.REVOLIS_BUS_BRANCH ?? "main"`. Bez nastaveného `REVOLIS_BUS_BRANCH`
GitHub store defaultuje na **`main`**. To je priama kolízia s ADR §7 („Nikdy do `main`").
Kým founder nestanoví env + protection, vždy-on beh smerujúci store na default
**porušuje** §7. Kontrakt to **nepokrýva odhadom** — označuje ako BLOCKED na GO.

Ďalšia vrstva (ADR `BUS-AUTH-IDENTITY`, PR #612): per-agent credentials viažuce
`envelope.from` na bearer — zatiaľ špecifikácia; do tohto kontraktu sa nepremieta
ako vynútená bariéra, kým nie je nasadená.

---

## 3. Denný strop (OQ-5) — ROZHODNUTÉ

**Zdroj:** `memory/decisions.md` DEC-20260921-002 + `packages/bus-core/src/execution-cap.ts`.

| Parameter | Hodnota |
|---|---|
| Strop | **100** automatických spustení Clauda / **24 h** rolling window |
| Konštanta | `DAILY_EXECUTION_CAP = 100`, `CAP_WINDOW_MS = 24h` (`execution-cap.ts:10-11`) |
| Čo sa počíta | Okamih **pred** spawnom Clauda (`consume.ts:587-589` — budget spent even if run fails) |
| Pri dosiahnutí | `needsFounder(..., "daily_cap_reached", ...)` — task ostáva OPEN, lokálne `NEEDS_FOUNDER` (`consume.ts:552-562`) |
| Po uvoľnení okna | Podľa DEC-20260921-002: task **ostáva** zaparkovaný (`NEEDS_FOUNDER`) — uvoľnenie stropu ho **automaticky nespúšťa** |

Override cez CLI `--daily-cap` je povolený len ako operátorský nástroj; default kontraktu je 100.

---

## 4. Potlačenie opakovaných blockerov (OQ-6) — ROZHODNUTÉ

**Prečo je to pre poll fatálne bez riešenia:** odmietnutý task zostáva OPEN
(`consume.ts:523` — „only the founder closes a blocked task"). Pri 60 s by ten istý
refusal inak produkoval blocker každú minútu.

**Rozhodnutie (kód + DEC-20260921-002):**

1. **Dedup na BUS:** `reportedRefusals()` (`consumer.ts:200-214`) mapuje task → množinu
   `code:` z existujúcich blockerov. Ak `ctx.reported.get(task.id)?.has(decision.code)`,
   cyklus loguje `blocker_deduped` a **nepostuje** druhý blocker (`consume.ts:507-511`).
2. **Task sa nezatvára** blockerom. `handledTaskIds()` **nezapočítava** blockery
   (`consumer.ts:177-182`, `184-193`) — po oprave príčiny môže task ešte raz prejsť gate.
3. **Lokálny park** (`NEEDS_FOUNDER` / `FAILED_PERSISTENT`): `planFor` → `skip`
   (`execution-state.ts:131-141`) — ďalšie cykly nevolajú Clauda ani negenerujú spam.

### Podnet na prehodnotenie (kedy smie vzniknúť nový blocker / nový beh)

| Podnet | Správanie |
|---|---|
| Ten istý `decision.code` už je na threade | Ticho (`blocker_deduped`) |
| **Iný** refusal code (iné `code:`) | Nový blocker — nová trieda príčiny |
| Founder upraví task (mode/gate/`decisions_required`) tak, že `evaluateTask` vráti `execute: true` | Pokus o beh (subject to lease, cap, capability) |
| Founder doplní / zmení allowlist capability (samostatné GO — 2E) | Nový match môže spustiť beh |
| Founder **zavrie** alebo inak vyrieši task na BUS | Koniec poll spracovania tohto id |

---

## 5. Eskalácia mimo BUS (OQ-2)

### 5.1 Rozhodnuté v kóde (retry budget)

- `MAX_PERSISTENCE_ATTEMPTS = 2` — `execution-state.ts:21`
- Po vyčerpaní: stav `FAILED_PERSISTENT`; ďalšie cykly `skip` (`execution-state.ts:134-141`,
  `consume.ts:674-677`)
- I1 platí: pri existujúcej `reply` sa Claude **znova nespúšťa**

### 5.2 BLOCKED — vyžaduje founder GO (kanál mimo BUS)

ADR §4.1 / §8 vyžaduje, aby `FAILED_PERSISTENT` nebol tichý, ak BUS nie je dostupný
na zápis blockera.

**FAKT z implementácie:** pri vyčerpaní persistence budgetu `persistResult` zapíše
lokálne `FAILED_PERSISTENT` a vráti `action: "failed"` **bez** volania
`buildBlockerEnvelope` / `client.post` (`consume.ts:725-728`). Founder teda **nemusí**
dostať BUS blocker. Lokálny skip v ďalších cykloch (`failed_persistent`) tiež
nepostuje.

Existujúca observability **v rámci hosta** (nie mimo BUS):

- `liveness.json` po každom watch cykle (`consume.ts:826-833`, CLI `953`)
- stdout log riadky `FAIL … persistence gave up`

To **nie je** kanál mimo BUS (Telegram / e-mail / pager).  
`memory/decisions.md` DEC-20260921-002 explicitne necháva „alerting na vyčerpaný
retry budget" otvorené.

| Návrh (na founder GO — vybrať jeden) | Poznámka |
|---|---|
| A) Externý watchdog na `liveness.json` + scan state dir pre `FAILED_PERSISTENT` | Bez zmeny bus-core; host-level |
| B) Pri prechode do `FAILED_PERSISTENT` vždy post BUS blocker (`gate: GO REQUIRED`) + separate Telegram cez existujúci alert router | Vyžaduje runtime zmenu — **samostatné GO**, nie toto |
| C) E-mail na `FOUNDER_EMAILS` pri `FAILED_PERSISTENT` | Tiež runtime + secret surface |

**Tento kontrakt nevyberá A/B/C.** Bez founder GO je OQ-2 mimo BUS = BLOCKED.  
Always-on beh, ktorý by spoliehal len na lokálny log, **porušuje** ADR §4.1 bod 4
v prípade výpadku BUS — implementačné GO to musí vyriešiť spolu s founder voľbou.

---

## 6. Observability

| Signál | Kontrakt |
|---|---|
| JSONL / cyklus log | Jeden záznam na cyklus: polled / seen / executed / skipped / refused / failed / trvanie (ADR §8). Watch už loguje agregáty + `livenessFile`. |
| Heartbeat súbor | Čas posledného úspešného cyklu — `liveness.json` (`consume.ts:826-833`) |
| BUS správy „som živý" | **Zakázané** (ADR §8) |
| Blocker na BUS | Len keď treba človeka: gate refusal (raz), `NEEDS_FOUNDER`, (po OQ-2 GO) aj `FAILED_PERSISTENT` |

---

## 7. Adversariálny audit — šesť tried policy B (ADR §1.1)

Súhrnné „policy B to zakazuje" = odmietnutie. Každý riadok: mechanizmus · miesto · čo musí zlyhať.

### 7.1 repo write

| | |
|---|---|
| **Mechanizmus** | Claude Code spawn s `--tools ""` (žiadne file tools); throwaway `cwd` mimo repa; gate vyžaduje `mode === "READ_ONLY"`; allowlist len `bus-alive` s `verify` na fixný text |
| **Miesto** | `scripts/bus/consume.ts:286-287` (`--tools`, `""`); `:301-302` (`mkdtemp` mimo repo); `packages/bus-core/src/consumer.ts:151-152` (READ_ONLY); `:80` (`DEFAULT_CAPABILITIES`); `:74-77` (`verify`) |
| **Čo musí zlyhať** | Odstránenie / rozšírenie `--tools`; spawn s cwd = repo root; nová capability bez tvrdého `verify`; obídenie `evaluateTask` volaním executora napriamo |

### 7.2 git write (push / branch / tag)

| | |
|---|---|
| **Mechanizmus** | Consumer nevolá `git push` / branch / tag. Jediné `git` v consume je read-only `rev-parse HEAD` pre evidence. Claude nemá tool na shell/git. |
| **Miesto** | `scripts/bus/consume.ts:873-879` (`currentCommit` — len `rev-parse`); `:286-287` (no tools); žiadny `spawn("git", ["push"…])` v consume path |
| **Čo musí zlyhať** | Pridanie git write do runnera; udelenie tools Claude; zneužitie `REVOLIS_BUS_GITHUB_TOKEN` mimo BUS store API na iné refs (pozri OQ-3 — PAT scope) |

### 7.3 merge

| | |
|---|---|
| **Mechanizmus** | Žiadne volanie GitHub merge / `gh pr merge` / GraphQL `mergePullRequest` v consumer path. Result/blocker vždy nesú `next_action.gate: "GO REQUIRED"`. |
| **Miesto** | `packages/bus-core/src/consumer.ts:282-285` (result gate); `:306-309` (blocker gate); absencia merge v `scripts/bus/consume.ts` (celý execute/persist path) |
| **Čo musí zlyhať** | Nový kód merge automation; zmena envelope tak, že follower agent berie result ako oprávnenie mergovať bez GO |

### 7.4 deploy (Vercel / migrácia / cron)

| | |
|---|---|
| **Mechanizmus** | Žiadny deploy klient, žiadna migrácia, žiadny cron registrátor v consume/consumer. Claude bez tools. |
| **Miesto** | `scripts/bus/consume.ts:276-330` (executor args — len Claude CLI flags); `consumer.ts:59-78` (bus-alive prompt: „no tools") |
| **Čo musí zlyhať** | Nová capability / hook, ktorý volá Vercel/Supabase; vypnutie `--safe-mode` / `--strict-mcp-config` tak, že MCP dostane deploy tool |

### 7.5 external side effect (e-mail, SMS, 3P API, platba)

| | |
|---|---|
| **Mechanizmus** | `--tools ""` + `--strict-mcp-config` + `--safe-mode` + `--permission-mode manual`; žiadny Resend/Stripe/HTTP tool v executor args; bus-alive `verify` odmietne akúkoľvek inú odpoveď než `BUS ALIVE` |
| **Miesto** | `scripts/bus/consume.ts:286-291`; `packages/bus-core/src/consumer.ts:74-77` |
| **Čo musí zlyhať** | Tools/MCP s network; capability bez `verify` (formálna pečiatka `return null` — ADR §1.1 zakazuje); prompt injection, ktorá by pomohla len ak by tools existovali |

### 7.6 credentials / secrets

| | |
|---|---|
| **Mechanizmus** | Token len z env (`REVOLIS_BUS_TOKEN`); fail-closed bez tokenu; token sa nepredáva ako CLI flag (komentár: flags → shell history); envelope vrstva má `findLikelySecrets` |
| **Miesto** | `scripts/bus/consume.ts:14-15` (komentár), `:904-907` (env read + exit); `packages/bus-core/src/http.ts` + `envelope.ts` (`findLikelySecrets` import v `http.ts:11`) |
| **Čo musí zlyhať** | Vloženie secretu do promptu/body/logu; commit `.env`; zdieľanie PAT v chate; runner, ktorý dumpne `process.env` do result envelope |

### 7.7 Známa diera — `BusCapability.sideEffects` chýba

| | |
|---|---|
| **Tvrdenie ADR** | §7 a §11: `AUTO-SAFE` len s `sideEffects: "none"` |
| **Skutočnosť** | `BusCapability` (`packages/bus-core/src/consumer.ts:35-49`) má len `id`, `idempotent`, `matches`, `prompt`, `verify`. **Pole `sideEffects` neexistuje.** `evaluateTask` ho nekontroluje. |
| **Dôsledok** | Mitigácia z ADR §11 sa **nedá vynútiť** proti dnešnému rozhraniu. Dnešná bezpečnosť stojí na: jedinej capability `bus-alive` + tools-off + READ_ONLY/AUTO-SAFE gates — nie na type-level `sideEffects`. |
| **Návrh (nie toto GO)** | Doplniť `sideEffects: "none" \| …` do `BusCapability` a refuse v `evaluateTask`, ak nie `"none"` — **v kroku 2E alebo samostatnom hardening GO pred pridanim druhej capability**. Bez toho 2E nesmie landnúť. |

---

## 8. Čo tento kontrakt nerozhoduje

V duchu ADR §12 + STOP karty:

- Multi-runner, webhook namiesto pollu, MCP vrstva, cost governor v $-účtoch, orchestrátor
- Zoznam read-only capabilities (2E) — každá vlastný `verify` + `sideEffects`
- Zriadenie hostingu, PAT, secrets, Cloudflare tunela
- Voľba A/B/C pre OQ-2 mimo-BUS alert
- Konkrétny machine-account login / branch-protection checkboxy (OQ-3 GO)
- Zmena ADR textu; zmena runtime v `packages/bus-core/**` / `scripts/bus/**`

---

## 9. Vzťah k už landnutému kódu

Na `main` existuje `e6a2ddc5e` (#617) — always-on loop, cap, blocker dedup.
Tento kontrakt **nie je** dodatočné GO na ten diff. Je to **záväzný opis**, voči
ktorému sa meria súlad. Kde kód a ADR divergujú (OQ-2 blocker pri
`FAILED_PERSISTENT`; default branch `main` v `serve.ts`), kontrakt označuje BLOCKED
alebo nález — **neopravuje runtime** v tomto GO.

---

## 10. Acceptance mapovanie (A1–A5)

| ID | Ako sa dokáže |
|---|---|
| A1 | `npm run bus:test` exit 0 (runtime nedotknutý) |
| A2 | `git diff --name-only origin/main...HEAD` ⊆ scope karty |
| A3 | node assert na `DEFAULT_CAPABILITIES` = len `BUS_ALIVE_CAPABILITY` |
| A4 | Sekcie OQ-2, OQ-3, OQ-5, OQ-6 v tomto súbore |
| A5 | Sekcie 7.1–7.6 (šesť tried) s mechanizmus/miesto/zlyhanie |
