# ADR 2026-09-21 — BUS Runner V2: execution semantics pred always-on behom

**Status:** NÁVRH (KROK 2A). Žiadny kód. Implementácia až po founder GO na jednotlivé kroky.
**Nadväzuje na:** `adr-2026-09-18-inter-agent-bus-transport-v1.md`, #589, #590, #593, #594, #603.
**Rozhoduje o:** sémantike vykonávania predtým, než runner dostane trvalý život.
**Nálezy overené proti `main` @ `9d933ea`** (#601 sa `consume.ts`, `consumer.ts` ani
`github-store.ts` nedotkol — obe diery nižšie platia na aktuálnom kóde).

---

## 0. Prečo tento ADR existuje pred kódom

Consumer v1 (#593) je jednorazovo spúšťaný executor. Prechod na trvalo bežiaci proces
nie je „pridať `while (true)`" — mení sa tým trieda zlyhaní, ktoré systém musí prežiť.
Dve diery v dnešnom kóde by pri behu každú minútu prestali byť teoretické.

### Nález A — `executed → result write failed` končí re-exekúciou

`scripts/bus/consume.ts`, funkcia `executeTask`, obaľuje jedným `try` **aj vykonanie,
aj zápis**:

```ts
const run = await ctx.executor(...);        // Claude reálne beží
const posted = await ctx.client.post(...);  // GitHub commit
await ctx.client.ack(...);
} catch (error) {
  await ctx.ledger.release(task.id);        // claim zmazaný
```

Ak `post()` zlyhá po dobehnutí Clauda, claim sa uvoľní, task zostáva `open` a ďalší beh
spustí Clauda znova. Bus-level dedup („thread already answered") nepomôže — odpoveď
nikdy nevznikla, vlákno nie je zodpovedané.

### Nález B — crash zablokuje task navždy

`FileClaimLedger.claim()` píše cez `wx`, ale neexistuje TTL ani kontrola vlastníka.
Pri zabití procesu sa `catch` nespustí, claim súbor zostane a každý ďalší beh hlási
`already_claimed`.

### Ich kombinácia je nedeterministická

Default state dir je `tmpdir()`. Či po crashi nastane *zablokovaný task* (A) alebo
*tichá re-exekúcia* (B) závisí od toho, či OS vyčistil `/tmp`.

Pre `bus-alive` (dve slová, bez efektu) je to neškodné. Pre capability policy B to
diskvalifikuje.

---

## 1. Rozhodnutia foundera (2026-09-21)

### 1.1 Capability policy = B

Povolené ako `AUTO-SAFE`: `bus-alive` + **read-only analytické** capabilities.

`GO REQUIRED` natrvalo, bez výnimky:

| Trieda | Príklad |
|---|---|
| repo write | zápis súboru, commit |
| git write | push, branch, tag |
| merge | akýkoľvek PR merge |
| deploy | Vercel, migrácia, cron |
| external side effect | e-mail, SMS, API tretej strany, platba |
| credentials / secrets | čítanie aj zápis |

Každá capability musí mať **vlastný tvrdý kontrakt** vo `verify()`. Formálna pečiatka
(`return null`) je porušením tohto ADR.

### 1.2 Runner = samostatný always-on host

- Nie founder notebook, nie CI, nie efemérny kontajner.
- **Runner nemá verejný endpoint.** Ťahá z GitHubu, nič nepočúva.
- Poll interval 60 s. Webhook sa nestavia.
- Cloudflare tunel **nie je dependency runnera** — slúži len pre vstup
  `ChatGPT → BUS`. Výpadok tunela zastaví prílev nových taskov, nie spracovanie
  existujúcich.

### 1.3 Atomický `GitHubBusStore.move()` PRED runnerom

Samostatný hardening krok (2B), nezávislý od runnera.

---

## 2. Stavový model

Autoritatívny je **BUS**. Lokálny stav je (a) kotva trvanlivosti pre úzke okno medzi
vykonaním a zápisom, (b) optimalizácia. Nie je to druhá pravda.

```
        ┌──────────┐
        │ CLAIMED  │  lease získaný, nič sa nevykonalo
        └────┬─────┘
             │ zápis stavu PRED spawnom
        ┌────▼──────┐
        │ EXECUTING │  Claude beží; výsledok neznámy
        └────┬──────┘
             │ odpoveď prijatá a uložená lokálne
        ┌────▼─────┐
        │ EXECUTED │  ★ nikdy znova nevykonať
        └────┬─────┘
             │ result envelope commitnutý na BUS
        ┌────▼───────────┐
        │ RESULT_POSTED  │
        └────┬───────────┘
             │ ack výsledku + ack tasku
        ┌────▼─────┐
        │   DONE   │
        └──────────┘
```

Vedľajšie stavy: `REFUSED` (brána odmietla, blocker zapísaný), `FAILED_PERSISTENT`
(vyčerpaný retry budget), `NEEDS_FOUNDER` (UNKNOWN pri neidempotentnej capability).

### 2.1 Zápis stavu

Jeden súbor na task, mimo repa, zapisovaný **atomicky** (temp + rename — rovnaký vzor,
aký už používa `FileBusStore.write`):

```json
{
  "task_id":   "TASK-20260921-001-...",
  "state":     "EXECUTED",
  "owner":     "runner@<host>/<boot_id>/<pid>",
  "lease_expires_at": "2026-09-21T08:12:00Z",
  "capability_id":    "bus-alive",
  "idempotent":       true,
  "attempts":  1,
  "reply":     "BUS ALIVE",
  "run":       { "session_id": "...", "turns": 1, "duration_ms": 1220 },
  "result_id": null,
  "updated_at": "2026-09-21T08:10:03Z"
}
```

`reply` sa zapisuje **skôr**, než sa uskutoční akékoľvek sieťové volanie. To je celá
podstata trvanlivosti výsledku.

### 2.2 Kľúčové invarianty

> **I1 — `EXECUTED` sa nikdy nesmie automaticky vrátiť do `EXECUTING` iba preto, že
> zápis výsledku zlyhal.** Retry pokračuje zápisom uloženej odpovede, nikdy novým
> spustením Clauda.

> **I2 — Žiadna capability so zápisom alebo externým efektom nesmie byť `AUTO-SAFE`.**

> **I3 — Runner si nikdy nevymyslí odpoveď.** Neexistuje cesta, ktorou by vznikol
> `result` bez toho, aby ho vyprodukoval reálny Claude Code proces.

> **I4 — Default je odmietnutie.** Nejednoznačný stav nikdy nevedie k vykonaniu.

---

## 3. Lease

`claim` sa nahrádza `lease`:

| Pole | Význam |
|---|---|
| `owner` | `runner@<host>/<boot_id>/<pid>` — `boot_id` odlíši reštart stroja |
| `lease_expires_at` | `now + LEASE_TTL` |
| heartbeat | predlžuje `lease_expires_at` každých `LEASE_TTL / 4`, **aj počas behu Clauda** (samostatný časovač, nie po skončení) |

Reclaim je povolený **iba** keď `lease_expires_at < now`. Živý lease sa nikdy neprevezme.

### 3.1 Reclaim podľa stavu

| Stav pri expirovanom lease | Akcia |
|---|---|
| `CLAIMED` | bezpečné — nič sa nevykonalo, reclaim a spusti od začiatku |
| `EXECUTING` | **UNKNOWN** — rozhoduje `capability.idempotent` (§4.2) |
| `EXECUTED` | reclaim povolený, ale **iba na pokračovanie zápisu** uloženej odpovede |
| `RESULT_POSTED` | reclaim, pokračuj ack-mi (idempotentné) |
| `DONE` | nič |

---

## 4. Zlyhania

### 4.1 `EXECUTED` + zápis zlyhal

1. Odpoveď je uložená lokálne (§2.1).
2. Retry s exponenciálnym backoffom posiela **uloženú odpoveď verbatim**.
3. Po vyčerpaní retry budgetu → `FAILED_PERSISTENT`, pokus o zápis blockera na BUS
   s `gate: GO REQUIRED`.
4. Ak je nedostupný aj BUS, stav zostáva lokálne a **musí byť viditeľný cez
   observability** (§8) — inak je to tiché zlyhanie.

Re-exekúcia je v tejto vetve zakázaná bez ohľadu na počet pokusov (I1).

### 4.2 `EXECUTING` + lease vypršal → UNKNOWN

Runner **nevie**, či Claude dobehol. Rozhoduje metadáta capability:

| `idempotent` | Akcia |
|---|---|
| `true` | reclaim a vykonaj znova (opakovanie je preukázateľne bez následku) |
| `false` | **nevykonávaj.** `NEEDS_FOUNDER`, blocker na BUS s `gate: GO REQUIRED`, task zostáva otvorený |

`idempotent` je vlastnosť capability, nie odhad runtime. Neuvedené = `false`.

### 4.3 Strata lokálneho stavu

Nový stroj, vyčistený disk, iný kontajner. Runner sa pýta **BUS-u** ako autority:

1. Má vlákno odpoveď od `claude-code`? → task je vybavený, dokonči len ack.
2. Nemá? → nedá sa odlíšiť „nikdy nebežalo" od „bežalo, zápis zlyhal" → rovnaké
   pravidlo ako §4.2 podľa `idempotent`.

Preto je `idempotent` povinné pole, nie voliteľné.

### 4.4 Duplicate execution policy

Tri vrstvy, v poradí autority:

1. **BUS**: zodpovedané vlákno — funguje aj naprieč strojmi, autoritatívne.
2. **Lokálny stav + lease** — pokrýva okno medzi vykonaním a zápisom.
3. **ACK** — odstráni task z otvorenej fronty.

Zvyšné okno, ktoré nepokrýva žiadna z nich: medzi návratom Clauda a zápisom `EXECUTED`
na disk. Je rádovo milisekundy a jeho následok rieši §4.2/§4.3.

---

## 5. Single-runner vs multi-runner

Lease žije na disku → je **per-stroj**. Preto:

> **Súčasne smie bežať práve jedna inštancia runnera.** Dve inštancie na rôznych
> strojoch svoje lease navzájom nevidia a jediná ochrana by zostala bus-level dedup,
> ktorá nepokrýva okno pred zápisom výsledku.

Multi-runner vyžaduje lease **na BUS-e** (claim správa alebo vyhradený box s atomickým
zápisom). Je to mimo rozsahu tohto ADR a nesmie sa zaviesť „mimochodom" pridaním
druhého hosta.

---

## 6. Externé závislosti

### 6.1 GitHub

- Poll 60 s ≈ 1 440 pollov/deň. Autentifikovaný limit je 5 000 volaní/h; jeden cyklus
  je rádovo jednotky volaní → rezerva je veľká, ale **secondary rate limits** na
  contents API treba merať, nie predpokladať.
- `403` s `Retry-After` / `X-RateLimit-Reset` → backoff **rešpektujúci hlavičku**,
  nikdy hot-loop.
- `5xx` → exponenciálny backoff s jitterom.
- `409` (sha konflikt) → znovu načítaj a skús raz; druhý konflikt je reálna kolízia.
- Výpadok GitHubu **nespúšťa re-exekúciu** — iba odkladá zápis (§4.1).

### 6.2 Claude Code

| Zlyhanie | Klasifikácia |
|---|---|
| binárka sa nenašla, spawn zlyhal | pred vykonaním → bezpečný retry |
| non-JSON výstup / `subtype=error` | dobehlo, ale kontrakt zlyhal → `FAILED`, bez odpovede, bez fabrikácie |
| porušený `verify()` kontrakt | to isté; odpoveď sa **nezapisuje** na BUS |
| **timeout** | **UNKNOWN** — proces mohol dobehnúť; platí §4.2 |

Timeout musí byť ohraničený (`CLAUDE_RUN_TIMEOUT`) a nesmie sa tichо považovať za
„nevykonané".

### 6.3 Čo znamená „always-on"

| Výpadok | Správanie |
|---|---|
| host | runner nebeží; tasky čakajú na BUS-e; po štarte prebehne recovery pass nad lokálnym stavom a BUS-om |
| GitHub | runner beží, backoff; `EXECUTED` výsledky čakajú lokálne a zapíšu sa po obnove |
| Claude API | capability behy zlyhávajú; klasifikácia podľa §6.2; nič sa nefabrikuje |

„Always-on" znamená **dozorovaný proces, ktorý sa reštartuje**, nie garantovanú
latenciu vykonania. Žiadne SLA sa týmto ADR nezavádza.

---

## 7. Founder Approval Boundary

Hranica sa týmto ADR **nerozširuje**. Runner smie autonómne vykonať iba to, čo prejde
všetkými bránami `consumer.ts` (identita → typ/status → už zodpovedané → `READ_ONLY` →
`AUTO-SAFE` → prázdne `decisions_required` → capability allowlist) **a** má
`sideEffects: "none"`.

Ďalšie bezpečnostné invarianty:

1. Executor si ponecháva `--tools ""`, `--strict-mcp-config`, `--safe-mode`,
   `--permission-mode manual`, cwd mimo repa.
2. Runner nikdy nemerguje, nepushuje do `main`, nenasadzuje a nečíta secrets.
3. Runner zapisuje iba do BUS boxov na vetve `bus/main`. Nikdy do `main`.
4. Každý `result` aj `blocker` nesie `gate: GO REQUIRED`.
5. Stratený authority text (`lostAuthorityText`, #594) → odmietnutie, nie odhad.
6. Tokeny iba z prostredia; nikdy do správy, repa ani logu.

---

## 8. Observability

Ticho nie je zdravie. Minimum:

- **JSONL run log** lokálne: jeden riadok na cyklus (`polled`, `seen`, `executed`,
  `skipped`, `refused`, `failed`, trvanie).
- **Heartbeat súbor** s časom posledného úspešného cyklu → externá kontrola vie
  rozlíšiť „nič neprišlo" od „runner je mŕtvy".
- **Stav na BUS iba keď treba človeka**: blocker pri `NEEDS_FOUNDER` a
  `FAILED_PERSISTENT`. Periodické „som živý" správy na BUS sa **nezavádzajú** — bol by
  to šum v tom istom kanáli, ktorý má niesť rozhodnutia.
- Metriky na neskôr: podiel `UNKNOWN`, počet reclaimov, priemerný čas `EXECUTING`.

---

## 9. Poradie krokov

```
2A  ADR (tento dokument)                    ← teraz
2B  Atomický GitHubBusStore.move()          samostatné GO
2C  Lease + stavový model + durability      samostatné GO
2D  Always-on runner na hoste               samostatné GO
2E  Read-only capabilities (policy B)       samostatné GO
    → live dogfood
```

Žiadny krok nesmie začať bez vlastného GO. 2B je nezávislé od 2C–2E a znižuje riziko
skôr, než sa začne spracovávať každú minútu.

---

## 10. Otvorené otázky (vyžadujú rozhodnutie pred 2C)

1. **`LEASE_TTL` a `CLAUDE_RUN_TIMEOUT`.** Návrh: TTL 120 s, heartbeat 30 s, timeout
   10 min. Timeout priamo určuje, ako často vznikne `UNKNOWN`.
2. **Retry budget pred `FAILED_PERSISTENT`** a ako sa o ňom founder dozvie mimo BUS-u.
3. **Hosting a identita tokenu.** Fine-grained PAT sa **nedá obmedziť na jednu vetvu** —
   `contents: write` platí na celý repozitár. Kto token drží a či to bude dedikovaný
   machine account.
4. **Zoznam read-only capabilities pre 2E** — každá potrebuje vlastný kontrakt; ich
   schválenie je samostatné GO, nie dôsledok policy B.
5. **Denný strop vykonaní** (počet spustení Clauda / náklad). Dnes neexistuje.
6. **Ako potlačiť opakované blockery.** Kód dnes ack-uje iba blocker správu a task
   **zámerne necháva otvorený** — `consume.ts:356`: „The task itself stays open: only
   the founder closes a blocked task." Pri jednorazovom behu je to správne. Pri poll
   á 60 s sa tá istá úloha vyhodnotí každú minútu a vyrobí blocker v každom cykle.
   Treba rozhodnúť: pamätať si `REFUSED` lokálne a nezapisovať druhý blocker do toho
   istého vlákna, a čo je podnet na prehodnotenie (zmena tasku? zmena allowlistu?).

---

## 11. Riziká

| Riziko | Dopad | Zmiernenie |
|---|---|---|
| PAT sa nedá obmedziť na `bus/main` | token runnera vie písať kamkoľvek v repe | dedikovaný machine account + branch protection na `main` |
| Lokálny stav je jediná pravda pre úzke okno | strata disku → `UNKNOWN` prípady | `idempotent` metadáta; §4.3 |
| Git Data API vyžaduje správnu prácu s base sha | konflikt pri súbehu | 2B vlastné testy + jediná inštancia runnera |
| Secondary rate limit GitHubu | runner sa utlmí, tasky čakajú | rešpektovať `Retry-After`, merať |
| Bez denného stropu | neohraničený náklad na Claude behy | otvorená otázka #5 |
| Policy B posúva runner z „neškodný" do „užitočný" | väčší dosah chyby | tvrdý `verify()` na každú capability, `sideEffects: "none"` ako podmienka `AUTO-SAFE` |
| Tento ADR nie je commitnutý | artefakt žije len v efemérnom kontajneri | commit + PR ako samostatný krok po schválení |

---

## 12. Čo tento ADR **nerozhoduje**

Multi-runner, webhooky namiesto pollu, MCP vrstva, cost governor, orchestrátor,
migrácia pre-v1 správ, a čím má byť „SOL agent" mimo interaktívneho ChatGPT. Všetko
mimo rozsahu.
