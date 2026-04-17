# PRÍLOHA G — SECURITY CONTROLS SCHEDULE

**Účel:** Enterprise evidenčný prehľad bezpečnostných kontrol  
**Účinnosť:** 15. apríla 2026

---

## 1. Identity & Access Management

- RBAC (role-based access control) pre admin/agent/owner role.
- MFA povinné pre administrátorské účty.
- Princíp najmenších oprávnení.
- Periodický review privilegovaných prístupov (min. kvartálne).

---

## 2. Data Security

- TLS 1.3 pre dáta in-transit.
- AES-256 pre dáta at-rest.
- Šifrované zálohy.
- Rotácia tajomstiev a kľúčov podľa interného key policy.

---

## 3. Logging & Monitoring

- Centralizované logovanie autentifikácie a kritických akcií.
- Alerting na anomálie prístupov.
- Monitoring výkonu a dostupnosti (SLA metriky).
- Retencia audit logov minimálne 12 mesiacov (alebo podľa MSA).

---

## 4. Vulnerability & Patch Management

- Pravidelné skeny zraniteľností.
- Kritické zraniteľnosti patchované prioritne.
- Núdzové patchovanie mimo release cyklu pri high/critical risk.
- Ročné penetračné testovanie a executive summary pre enterprise klientov.

---

## 5. Incident Management

- Formálny incident response workflow.
- Severity klasifikácia P1-P4.
- Escalation path na technickú a manažérsku úroveň.
- Postmortem report pre P1 incidenty.

---

## 6. Third-Party Risk

- Subprocessor due diligence pred onboardingom.
- DPA/SCC kontrola pri relevantných prenosoch.
- Zmena subprocessora s predbežným oznámením podľa DPA.

---

## 7. Business Continuity

- BCP/DR plán (RTO/RPO podľa SLA/BCP annexu).
- Testovanie obnovy minimálne 1x ročne.
- Dokumentované nápravné opatrenia po testoch.

