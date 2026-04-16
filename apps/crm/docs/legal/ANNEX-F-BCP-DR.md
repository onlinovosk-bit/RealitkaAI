# PRÍLOHA F — BCP/DR ANNEX

**Naviazané na:** `MSA-master-service-agreement.md` (Príloha F), `SLA-service-level-agreement.md` (Čl. 10)  
**Účinnosť:** 15. apríla 2026

---

## 1. Scope

Táto príloha definuje minimálne parametre kontinuity prevádzky (BCP) a obnovy po havárii (DR) pre kritické služby Revolis.AI.

---

## 2. Cieľové parametre

| Parameter | Hodnota |
|---|---|
| RTO | 8 hodín |
| RPO | 1 hodina |
| Backup frekvencia | minimálne každých 24 hodín |
| Backup retention | minimálne 30 dní (produkčné DR) |
| DR test cadence | minimálne 1x ročne |

---

## 3. Kritické komponenty

- autentifikácia a autorizácia používateľov,
- CRM databáza kontaktov/leadov,
- AI scoring pipeline,
- outbound komunikačné workflowy,
- audit logging a administrátorské logy.

---

## 4. Incident recovery workflow

1. Incident detection a klasifikácia.
2. Aktivácia BCP/DR tímu.
3. Izolácia postihnutého komponentu.
4. Obnova kritických služieb podľa priority.
5. Validácia dátovej integrity.
6. Post-incident report a CAPA (corrective/preventive actions).

---

## 5. Komunikačný štandard

- prvá enterprise notifikácia do 60 minút pri P1,
- status update minimálne každé 4 hodiny pri aktívnom P1,
- finálny postmortem do 5 pracovných dní.

---

## 6. Testovanie a auditovateľnosť

Poskytovateľ uchováva záznamy o DR testoch (dátum, scope, výsledky, zistené nedostatky, remediation owner) minimálne 24 mesiacov.

