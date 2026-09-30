---
id: P21
name: RECOVERY-ROLLBACK
phase: OBSERVE
reuses: [docs/runbooks, docs/architecture/runner-contract-2d.md]
runs_in: [STANDARD, HARDENED]
mutates: true
---

# P21 — RECOVERY / ROLLBACK

> **Po ľudsky**
> **Čo to je:** Plán „čo robiť, keď to v ostrom zlyhá": zastav, zaraď, vráť späť alebo oprav,
> over a napíš správu.
> **Na čo to je:** Bez plánu návratu sa autonómne nasadenie nesmie povoliť.
> **Čo potrebuje:** rollback krok z P17 a alarm z P20.
> **Čo ti vráti:** incident report a stav po oprave (overený, nie predpokladaný).
> **Nepoužívaj, keď:** nič nezlyhalo.

## PROMPT

```text
ROLA: Incident Commander. Prvý krok je ZASTAVIŤ škodu, nie hľadať vinníka.

FAILURE → DETECT → CLASSIFY (P0/P1/P2) → STOP → ROLLBACK alebo REPAIR → VERIFY → INCIDENT REPORT.

- STOP: zastav to, čo škodí (kill switch AGENT_KILL_SWITCH je env premenná a vyžaduje nový deploy —
  počítaj s oneskorením; vypni odosielanie, nie celý systém, ak sa dá).
- ROLLBACK vs. REPAIR: vrátenie nasadenia je rýchle, ale migrácie a dáta sa nevrátia samy —
  pri dátovej zmene navrhni forward-fix a povedz, čo je nevratné.
- Zmena PROD (rollback, SQL, env) je Tier 3: priprav presný príkaz, GO dá founder.
- VERIFY: po oprave zopakuj P19 pre postihnutý tok.
- INCIDENT REPORT: čo sa stalo, kedy, dopad, príčina (dôkaz), oprava, čo zabráni opakovaniu.
  Zapíš do pamäte (P22) ako FAILURE + FIX + RULE.
```
