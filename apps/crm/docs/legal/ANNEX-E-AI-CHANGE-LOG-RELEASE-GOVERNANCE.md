# PRÍLOHA E — AI CHANGE LOG A RELEASE GOVERNANCE

**Naviazané na:** `MSA-master-service-agreement.md` (Čl. 16)  
**Účinnosť:** 15. apríla 2026

---

## 1. Účel

Táto príloha stanovuje záväzné pravidlá pre riadenie zmien AI modelov, changelog transparentnosť, rollout kontrolu a rollback postupy.

---

## 2. Klasifikácia zmien

| Typ zmeny | Popis | Notifikácia zákazníkovi | Schvaľovanie |
|---|---|---|---|
| Minor | UI/UX zmena bez dopadu na modelové výstupy | v release notes | Product Owner |
| Moderate | Zmena promptov/filtrovania s nízkym dopadom | min. 7 dní vopred | Product + Legal review |
| Material | Zmena modelu, scoring logiky, prioritizačných faktorov | min. 14 dní (Enterprise 30 dní) | AI Governance Board |
| Emergency | Bezpečnostná/compliance hotfix zmena | ex-post do 48 hodín | Incident Commander + Legal |

---

## 3. Povinné položky changelogu

Každá zmena klasifikovaná ako Moderate alebo Material musí obsahovať:
- dátum nasadenia a verzia modelu,
- dotknuté funkcie/moduly,
- očakávaný dopad na výstupy,
- riziká a mitigácie,
- rollback podmienky.

---

## 4. Release gate

Pred nasadením Material zmeny musia byť splnené:
- regresné testy na referenčnom datasete,
- AI safety a quality review,
- privacy/legal checkpoint (ak je relevancia k profilovaniu),
- schválenie AI Governance Board (Product, ML Lead, Legal).

---

## 5. Rollback SLA

Pri potvrdenej regresii:
- P1 regresia: mitigácia do 4 hodín, rollback rozhodnutie do 24 hodín,
- P2 regresia: mitigácia do 1 pracovného dňa, rollback/oprava do 5 pracovných dní.

---

## 6. Audit trail

Poskytovateľ uchováva audit trail AI release rozhodnutí minimálne 24 mesiacov (alebo dlhšie podľa MSA), vrátane:
- schvaľovacieho záznamu,
- test summary,
- incident väzby (ak sa vyskytli).

