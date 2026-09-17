# Founder Alert Adapter v0.1 — Telegram ako výstupná siréna

**Stav:** `STRATEGIC BACKLOG` — nie BUILD.
**Dátum:** 2026-09-17
**Zdroj:** founderov návrh v chate 2026-09-17, vrátane vety *„toto by som určite neimplementoval ako ďalší veľký projekt teraz. Najprv dokončiť aktuálny Cowork/executor setup."*
**Constitution gate:** VETO `too early` (timing) → Strategic Backlog bez ohľadu na skóre. Zapísané podľa `CLAUDE.md` §7.

## Princíp, na ktorom sa zhodujeme

Telegram **nie je BUS**. BUS zostáva interný mechanizmus medzi agentmi. Telegram je jednosmerná
výstupná vrstva k founderovi.

```
Agent → BUS EVENT → Alert Router → Policy → Telegram → Founder
```

Agent **neposiela** ľubovoľné správy. Vzniká typovaný event; až Router rozhodne, čo sa doručí.
Nikdy nie `Claude ↔ Telegram ↔ Claude`.

### Severity škála (founderov návrh, zachovaný)

| úroveň | doručiť | príklad |
|---|---|---|
| 🟢 INFO | voliteľne | task complete |
| 🔵 EVENT | nie vždy | PR merged |
| 🟠 WARNING | áno | retry, stale contract |
| 🔴 CRITICAL | okamžite | security, produkčné zlyhanie |
| ⚫ GOVERNANCE | okamžite | agent chce prekročiť Gate |

## FINDING — toto nie je greenfield

**V repe už existuje notification adapter a je zapojený.**

`apps/crm/src/lib/slack.js` — `sendSlackMessage(text)` cez `SLACK_WEBHOOK_URL`.

Volajú ho **štyri** miesta plus guard:

- `apps/crm/src/app/api/agents/competitor-watch/route.ts`
- `apps/crm/src/app/api/agents/social-scout/route.ts`
- `apps/crm/src/app/api/cron/night-watch/route.ts`
- `apps/crm/src/app/api/outreach/route.ts`
- `apps/crm/src/lib/revolis-guard.ts:87-89` (vlastný `fetch` na ten istý webhook, nie cez helper)

**Dôsledok pre v0.1:** problém nie je chýbajúci kanál. Problém je, že existujúci kanál je zapojený
**ad-hoc, bez severity, bez routera a bez dedup**. Postaviť Telegram rovnakým spôsobom by vyrobilo
druhý kanál s tým istým nedostatkom a dvojnásobnou údržbou.

Hodnota návrhu leží v **Alert Routeri a policy**, nie v tom, že kanál je Telegram. Router sa dá
postaviť raz a mať dva výstupy (Slack, Telegram), alebo Telegram Slack nahradí — to je otvorené
rozhodnutie nižšie.

## FINDING — dnes nie je čo alertovať

Founderov diagram má vetvu `Monitors` (Deploy · Links · Health) ako rovnocennú k `Executors`.
Takí monitori dnes **neexistujú**:

| čo by bolo monitorom | skutočný stav | dôkaz |
|---|---|---|
| nočná vlna (runner) | **vypnutá** 2026-09-17 06:51 UTC | `.ai/bus/decisions/DEC-20260917-002-operating-mode-b.md:17` |
| `schema-governance-guard` | cron **zakomentovaný** od 2026-06-17, iba `workflow_dispatch` | `.github/workflows/schema-governance-guard.yml:3-11` |
| `nightly-playwright` | beží `0 3 * * *`, má `if: failure()` vetvu | `.github/workflows/nightly-playwright.yml:4-5,108` |
| `brain-weekly-audit` | beží Po 05:00 UTC, **nesledovaný** — žiadny lokálny záznam behov | `.github/workflows/brain-weekly-audit.yml:7-10` |

Reálne periodické zdroje eventov sú teda dnes **dva** (`nightly-playwright`, `brain-weekly-audit`),
z toho jeden bez akéhokoľvek odberateľa výsledku.

**Dôsledok:** Alert Adapter postavený dnes by mal takmer prázdny vstup. Jeho hodnota rastie až
s runnerom — čo je presne dôvod, prečo je founderovo poradie („najprv executor setup") správne.

## Otvorené otázky, ktoré treba zavrieť pred BUILD

1. **Slack alebo Telegram, alebo oba?** Ak oba, Router musí mať fan-out a jednotný event formát.
   Ak Telegram nahrádza Slack, je to migrácia piatich call sites, nie nový komponent.
2. **Kde žije Router a čo ho spúšťa?** Vercel cron má dnes otvorený problém: lokálny `CRON_SECRET`
   vracia v PROD `401` (`memory/open-tasks.md:63`). Bez vyriešenia tohto nemá Router spoľahlivý beh.
3. **Dedup a cooldown.** V návrhu chýbajú. Monitor bežiaci každých 5 minút pri hodinovom incidente
   pošle 12 správ a siréna sa stane šumom. Potrebný je kľúč incidentu + tichý interval + správa
   „vyriešené".
4. **Kde je uložený token.** GitHub Actions secrets, Vercel env, alebo oboje. Kto ho rotuje.
   Kto má bota môže bota ovládať — token je credential, nie konfigurácia.
5. **Obsah alertu podlieha stealth pravidlu.** Podľa `CLAUDE.md` §2 a §4 do alertu **nesmie** ísť
   meno referenčného klienta, jeho interné dáta ani PII. Alert nesie identifikátory
   (`task_id`, `PR #`, `commit`), nie obsah. Toto musí byť v policy, nie v hlave odosielateľa.
6. **Duplicita s GitHubom.** GitHub už notifikuje o CI a review. Prínos Telegramu je vo **filtri
   podľa severity**, nie v samotnom kanáli — inak vznikne tretí neprečítaný zdroj notifikácií.

## Event formát (founderov návrh, zachovaný ako východisko)

```yaml
event:
  type: GOVERNANCE_ALERT
  severity: CRITICAL
  task_id: DEC-20260917-002
  agent: executor
  gate: GATE_1
  action_required: true
```

Doplniť pred BUILD: `dedup_key`, `resolved: bool`, `evidence_ref` (cesta alebo URL namiesto
vloženého obsahu — viď otázka 5).

## Rozsah v0.1, keď na to príde rad

Malý adapter, nie projekt:

1. Jednotný `AlertEvent` typ + `dedup_key`.
2. Router s policy tabuľkou severity → kanál.
3. Dva výstupy za jedným rozhraním (existujúci Slack, nový Telegram).
4. Prepojiť **existujúcich** päť call sites na Router namiesto priameho `fetch`.
5. Až potom nové monitory — a len tie, ktoré majú skutočný periodický beh.

Body 1–4 majú hodnotu aj bez Telegramu. Bod 5 závisí od runnera.

## Ďalší krok

`GO REQUIRED`. Nič sa nestavia, kým founder nezavrie otázku 1 (Slack vs. Telegram vs. oba)
a kým nie je dokončený Cowork/executor setup.
