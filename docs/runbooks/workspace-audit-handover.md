# Odovzdávací brief pre lokálnu session (Remote Control na Windows)

> **Pre koho:** pre Claude Code session bežiacu na foundrovom Windows stroji.
> Tá session nepozná nič z predchádzajúceho rozhovoru — tento dokument je
> jej jediný kontext.
>
> **Prvá úloha:** spustiť `scripts/ops/workspace-audit.ps1` a výstup poslať
> founderovi. **Nič viac.** Dôvod je nižšie v časti „Tvrdé pravidlá".

---

## 1. Čo sa deje

Founder (Andrej, komunikácia po slovensky) zvažuje presun repozitárov do
`C:\Projects\<projekt>\`. **Toto rozhodnutie NIE JE prijaté.** Práve sa zbierajú
podklady preň.

Cloudová session mu už zmerala, čo sa dá zmerať z repozitára. Nevie však vidieť
na jeho disk — a práve tá slepá časť je dôvod, prečo vznikla lokálna session.

## 2. Čo je už namerané (neopakuj to)

### 2.1 Absolútne cesty v repozitári `RealitkaAI` — 9 miest v 5 súboroch

| súbor | riadok | obsah |
|---|---|---|
| `.mcp.json` | 13, 22 | `"CLAUDE_FLOW_CWD": "C:/RealitkaAI"` |
| `.cursor/mcp.json` | 8 | `"CLAUDE_FLOW_CWD": "C:/RealitkaAI"` |
| `packages/mcp-config.json` | 6, 15, 25, 32 | `"C:\\RealitkaAI\\packages\\mcp-*\\dist\\server.js"` |
| `apps/crm/.claude/settings.local.json` | 13 | `Bash(cat C:/RealitkaAI/.github/workflows/*.yml)` |
| `memory/hourly-summary.ps1` | 7 | `$filePath = "C:\RealitkaAI\memory\session-summary.md"` |

**Falošné poplachy — netreba ich riešiť:** `scripts/vercel-ignore-command.test.mjs`
(cesty na Git Bash, nezávislé od repa), `apps/crm/scripts/tc-orchestrator.mjs`
(`C:/RealitkaAI-run/tc`, iný priečinok), `scripts/build-demo-v3.py` (`Downloads`).
Ďalších ~40 výskytov je v dokumentácii — neškodné.

### 2.2 Founderov vlastný audit našiel navyše (mimo repa)

- `C:\RealitkaAI-run\lane-A\packages\mcp-config.json` — **ďalšia kópia repa**
- `C:\RealitkaAI\tmp-pr317-ci\packages\mcp-config.json` — **kópia vnútri repa**
- `C:\RealitkaAI\tools\langfuse\...` — vendorovaný langfuse
- `C:\revolis-ai-bus\outbox\BUS-003.result.json` → odkazuje na `C:\RealitkaAI` a `C:\onlinovo-seed`

### 2.3 🔴 Kľúčový nález

`tools/langfuse` a `tmp-pr317-ci` **nie sú v gite ani v `.gitignore`.**
Na disku teda existujú **najmenej tri kópie toho istého repozitára**
(`RealitkaAI`, `RealitkaAI-run\lane-A`, `tmp-pr317-ci`).

Hypotéza, ktorú má audit potvrdiť alebo vyvrátiť: **hlavná bolesť nie je
umiestnenie priečinka, ale tie duplikáty.** Agent, ktorý sa pomýli v okne,
edituje mŕtvu kópiu.

### 2.4 Čo je z cloudu principiálne neoveriteľné

1. Či lokálna Supabase (Docker) drží dáta, ktoré sa nedajú znovu naseedovať.
   **Jediná položka, ktorá môže bolieť viac než minúty.**
2. Či `memory/hourly-summary.ps1` beží v Plánovači úloh.
3. Ktoré kópie repa sú živé a ktoré mŕtve.
4. Obsah `.env.local` súborov.
5. Či `uptm-runner` beží ako služba.

## 3. Mapa projektov (podľa foundera)

| # | produkt | GitHub repo |
|---|---|---|
| 1 | Revolis.AI / Realitka.AI | `onlinovosk-bit/RealitkaAI` |
| 2 | Ultra Profit Trading Machine | `uptm-runner` + `onlinovosk-bit-uptm` |
| 3 | AGENTIC SYSTEM (spôsob práce nad všetkými repami) | `AGENTIC-SYSTEM` |
| 4 | Mia Vellar (AI influencerka) | **žiadne** |
| 5 | Call Agent (telefonáty pre živnostníkov) | **žiadne** |

V `C:\Projects\` sú priečinky `mia-vellar`, `onlinovo`, `revolis-agent-os`.
**Nesedia 1:1 na tú mapu** — `onlinovo` nemá v mape protipól a `revolis-agent-os`
sa nevolá ako žiadny repozitár. Je to otvorená otázka, nie chyba.

## 4. Tvrdé pravidlá pre túto session

1. **Fáza 1 je len čítanie.** Žiadny presun, mazanie, `git` deštruktívna
   operácia, žiadna zmena konfigurácie. Ani „drobná oprava po ceste".
2. **Nikdy nevypisuj obsah `.env` súborov.** Len ich mená a cesty. Sú v nich
   produkčné kľúče.
3. **Nič nepresúvaj, kým founder nepovie explicitné GO** s menom brány.
   Tento projekt beží na bránach: jedna brána = jedna dávka práce = jeden PR.
4. Keď výstup auditu existuje, **pošli ho founderovi a skonči.** Rozhodnutie
   „presúva sa / nepresúva" patrí jemu, nie tebe.
5. Komunikuj po slovensky.

## 5. Čo NIE JE tvoja úloha

V produkcii beží otvorený P0 (RLS policies `USING (true)` na `tasks`
a `saas_leads`). Rieši sa v cloudovej session, **nedotýkaj sa toho.**
Uvádza sa tu len preto, aby ťa to neprekvapilo, ak na to niekde narazíš.
