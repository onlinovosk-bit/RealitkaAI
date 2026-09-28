# 11 — LEDGER A PAMÄŤ

Ledger je **append-only**. Historický záznam sa nikdy nemaže ani neprepisuje.

---

## Čo sa zapisuje po každej vlne

```json
{
  "run_id": "", "wave_id": "", "started_at": "", "finished_at": "",
  "tasks": [], "agents": [], "branches": [],
  "changed_files": [],
  "prompt_stack_hashes": {},
  "acceptance": [{ "id": "", "cmd": "", "exit_code": null, "status": "" }],
  "checks_not_run": [{ "id": "", "why": "", "runs_where": "" }],
  "verdict": "", "reason": "", "ledger_run_id": "",
  "human_override": null,
  "tool_hashes": { "judge": "", "orchestrator": "" },
  "iterations_work": 0,
  "iterations_contract_amendments": 0,
  "cost_usd": null,
  "cost_measured": false,
  "pr_url": null, "merged_at": null,
  "production_effect": null,
  "config_changes_that_day": []
}
```

---

## Štyri polia, ktoré tam nie sú náhodou

**`checks_not_run`** — kontrola, ktorú si nespustil, patrí sem s dôvodom a
s miestom, kde beží namiesto toho. Bez tohto poľa sa chýbajúca kontrola tvári
ako neexistujúca.

**`cost_usd: null` + `cost_measured: false`** — ak sa cena nemeria, zapíše sa
`null`, **nikdy nula**. Nula je tvrdenie, že beh nič nestál, a je nepravdivé.
16. 9. 2026 zapísal ledger `cost_usd: 0` pri behu celého test suite proti limitu
2 USD; brána merala konštantu a nemohla zasiahnuť nikdy.

**`iterations_work` oddelene od `iterations_contract_amendments`** — ten istý
deň minuli tri behy rozpočet dávky, ktorá bola v poriadku: dva padli na vadách
kontraktu, tretí prešiel. Rozpočet meral opravy nástroja a účtoval ich práci.

**`tool_hashes`** — ak verdikt vydala lokálne upravená, nezacommitovaná verzia
Judge, musí sa to dať zistiť. Inak o týždeň nikto nepovie, či ACCEPT vydal
Judge z `main`, alebo tá verzia z rána.

---

## `config_changes_that_day`

Atribúcia podľa zmergovaných PR nezachytí zmenu, ktorá nemá commit.

Doložený prípad: `unread_at_eod` rástol dvadsaťpäť dní z 94 na 165 a potom
za jeden deň spadol na 1. Príčinou bolo nastavenie `FOUNDER_EMAILS` vo Verceli
10. 9. večer — **žiadny commit, žiadny PR**. Jediná zmena za mesiac, ktorá
merateľne zabrala, je pre atribúciu podľa PR neviditeľná.

```
docs/ops/config-changelog.md   jeden riadok na zmenu, slučka ho číta
```

```
2026-08-04  hetzner  server n8n-prod (CX23, hel1, 5,49 EUR/mes)
            dovod: skoncil trial n8n Cloud workspace "revolis"
2026-09-10  vercel   FOUNDER_EMAILS nastavene
            ucinok: unread_at_eod 165 -> 1 nasledujuce rano
```

Zistiť účel servera za 5,49 € si 16. 9. vyžiadalo bankový výpis, konzolu
Hetzneru a dvadsaťštyri mailov. Stav existoval, záznam nie.

---

## Pamäť a ADR

```
Agent smie NAVRHNÚŤ rozhodnutie. Zapísať ho ako platné nesmie.
```

Dôvod je konkrétny: ak agent zapíše svoj záver do pamäte, ďalší beh ho prečíta
ako fakt a postaví na ňom ďalší záver. Po troch iteráciách má systém pevné
presvedčenie bez jediného dôkazu.

```
FINDING    agent, voľne, vždy s dôkazom a príkazom
DECISION   founder, podpísané, s dátumom
ADR        founder, s kontextom, alternatívami a dôsledkami
```

Rozhodnutie bez podpisu je návrh. Návrh sa nečíta ako fakt.

---

## Poctivosť metrík

```
Nezmerané sa zapisuje ako nezmerané, nie ako nula.
Seed dáta sa nepočítajú do rastu.
Zelená brána, ktorá nikdy nepadla, sa vedie ako unverified_gate.
```

Druhý riadok má doložený prípad: z 28 nových leadov za mesiac bolo **24 seed dát**
(šesť zdrojov, každý presne po štyroch, všetky v okne 23.–30. 8.) a len **4 reálne**
s prefixom `portal:`. Bez rozdelenia `leads_new_real` / `leads_new_seed` je každý
ďalší trend znečistený.
