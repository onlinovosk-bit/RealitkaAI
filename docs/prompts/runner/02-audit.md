# 02 — INCOMPLETE WORK AUDIT

Zisťuješ stav. **Nič neopravuješ**, ani keď je oprava zjavná a triviálna.
Oprava mimo write-setu je porušenie územia, aj keď je dobre mienená.

Audit má byť lacný a bez stopy. Nespúšťa `npm ci`, `npm test`, `tsc` ani build.
Ak trvá dlhšie než pár minút na agenta, robíš niečo iné než audit.

---

## Štyri audítori, štyri disjunktné zdroje

| agent | číta | píše |
|---|---|---|
| `A1-git` | história, PR, vetvy, worktrees, zámky | `audit/a1-git.json` |
| `A2-repo` | `docs/**`, `apps/**`, `scripts/**` | `audit/a2-repo.json` |
| `A3-infra` | `.github/**`, `vercel.json`, `docs/ops/**`, `automation/**` | `audit/a3-infra.json` |
| `A4-gates` | `.ai/bus/ledger/**`, `.ai/bus/tasks/**` | `audit/a4-gates.json` |

Štyri write-sety, prienik prázdny. `A3` nemá prístup na sieť — čo nie je v repe,
zapíše ako `evidence: "not_in_repo"`. To je nález, nie prekážka.

---

## Päť druhov nedokončenosti

Nehľadáš chyby. Hľadáš **nedokončenosť** — je to iná vec a mieša sa.

```
zacate_nedotiahnute      vetva bez PR, balík PREPARED, task bez verdiktu
hotove_nezapnute         workflow, ktorý nikdy nebežal
zapnute_nesledovane      cron bez záznamu, metrika vždy nula
zrusene_neupratane       zmergovaná vetva, skript bez volajúceho
zdokumentovane_neplatne  dokument popisujúci stav, ktorý už neplatí
```

Posledné dve sa najľahšie prehliadnu a najviac klamú.

## Klasifikácia stavu

```
READY · IN_PROGRESS · BLOCKED · FAILED · STALE · DUPLICATE · OBSOLETE · UNKNOWN
```

```
UNKNOWN sa NIKDY nevykonáva automaticky.
OBSOLETE sa označuje len s dôkazom, že je obsolete. Podobnosť nie je dôkaz.
DUPLICATE sa označuje len pri zhode identity, nie pri zhode témy.
```

---

## Sedem otázok, na ktoré musí audit odpovedať

Register je hotový, keď sa z neho dá odpovedať na všetkých sedem. Nie skôr.

1. **Čo je rozrobené a stojí?**
2. **Čo je hotové, ale vypnuté?** Najdrahšia kategória — práca zaplatená, úžitok
   nula. Sem patria tri n8n workflowy s nula produkčnými behmi od 5. augusta.
3. **Čo beží, ale nikto to nesleduje?** Cron bez záznamu. Metrika vždy nula.
   Kontrola, ktorá ešte nikdy nepadla. Pole v ledgeri vždy `null`.
4. **Kde brána tvrdí niečo, čo nie je pravda?** Porovnaj `repo_paths` každého
   kontraktu proti reálnemu diffu zmergovaného PR.
5. **Čo sa tvári ako platné a nie je?**
6. **Čo blokuje čo?** Bez `blocked_by` je register zoznam prianí.
7. **Čo by prestalo fungovať, keby to zajtra niekto zmazal?**

---

## Čo je nález a čo nie

| je nález | nie je nález |
|---|---|
| vetva bez PR, 34 dní stará | „kód by sa dal zrefaktorovať" |
| workflow bez `pull_request` v `on:` | „testov by mohlo byť viac" |
| `cost_usd` je vo všetkých behoch 0 | názor na architektúru |
| balík PREPARED bez podpisu | názor na kvalitu kódu |
| `repo_paths` ≠ súbory zmergovaného PR | čokoľvek bez príkazu a výstupu |

Pravý stĺpec nepíš. Zahltí register a nie je to tvoja úloha.

---

## Výstup

```json
{
  "agent": "", "generated_at": "",
  "commands_run": [{ "cmd": "", "exit_code": 0 }],
  "findings": [{
    "id": "branch:feat/bridge-harness",
    "title": "", "kind": "", "state": "READY | BLOCKED | ...",
    "evidence": "", "evidence_cmd": "", "age_days": null,
    "impact": "high | medium | low", "effort": "S | M | L",
    "write_territory": [], "next_action": "", "blocked_by": null
  }],
  "not_determinable": [{ "question": "", "why": "" }]
}
```

`id` je stabilný a odvodený od veci, nie od poradia — `branch:feat/x`,
`gate:cost_usd_unmeasured`. Register podľa neho deduplikuje a pri ďalšom behu
porovnáva.

`write_territory` je povinné pri všetkom, čo je `READY` — bez neho sa nedá
postaviť DAG ani vlna.

`not_determinable` nesmie chýbať. Prázdna sekcia je tvrdenie, že si odpovedal
na všetko — a to má byť vidieť.

---

## Register: zlúčenie bez modelu

```
1. načítaj všetky štyri audit/a*.json
2. ktorýkoľvek chýba alebo neparsuje -> STOP "audit_incomplete"
3. deduplikuj podľa id
4. triedenie: impact (high, medium, low), potom effort (S, M, L)
5. vyrieš blocked_by na odkazy medzi položkami
6. cyklus v blocked_by -> zapíš ako nález, NEZASTAVUJ
7. zapíš audit/OPEN-WORK-REGISTER.md
```

Bod 4 nie je kozmetika: `high impact / S effort` navrchu je zoznam vecí, ktoré
sa oplatí spraviť hneď — a práve ten dnes chýba najviac.

Bod 2 je tvrdý. Register z troch zo štyroch zdrojov by vyzeral úplne a nebol by.
