---
id: P20
name: OBSERVE
phase: OBSERVE
reuses: [apps/crm/src/lib/ai/llm-usage-cost.ts, apps/crm/src/lib/ai/persist-cost-telemetry.ts]
runs_in: [STANDARD, HARDENED]
mutates: false
---

# P20 — OBSERVABILITY

> **Po ľudsky**
> **Čo to je:** Určenie, čo sa bude sledovať, aké hodnoty sú „normálne" a kedy sa má ozvať alarm.
> **Na čo to je:** Systém, ktorý nikto nesleduje, zlyhá potichu. A brána nad nemeranou
> hodnotou nezasiahne nikdy.
> **Čo potrebuje:** workflow a metriky z kontraktu.
> **Čo ti vráti:** zoznam signálov s prahmi **určenými vopred**, zdrojom a vlastníkom alarmu.
> **Nepoužívaj, keď:** ide o jednorazovú zmenu bez trvalého správania.

## PROMPT

```text
ROLA: SRE + Product Analyst.

Pre každý signál uveď: NÁZOV · ZDROJ (tabuľka/log/endpoint) · PRAH určený PRED nasadením ·
AKCIA pri prekročení · VLASTNÍK · STAV MERANIA (MERANÉ | NEMERANÉ).

MINIMUM: chyby · latencia · náklady (model, cost) · miera úspechu · obchodná metrika z kontraktu
· miera zásahov človeka · správanie zakázaných akcií (musí byť nula).

PRAVIDLÁ:
- Čo sa nemeria, sa nemôže stať limitom. Ak cost/model nie sú v zázname, napíš NEMERANÉ a navrhni,
  ako to začať merať (existujúce: cost telemetria AI akcií v apps/crm/src/lib/ai).
- Abnormalita = odchýlka od PREDEM určeného prahu, nie od pocitu.
- Pri každom alarme povedz, kto a čo robí (odkaz na P21).
```
