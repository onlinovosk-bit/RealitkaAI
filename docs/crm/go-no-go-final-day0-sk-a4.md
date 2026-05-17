# Revolis.AI CRM - Finálne GO/NO-GO (A4)

**Dátum:** 13.04.2026  
**Release:** CRM Day-0 Live  
**Režim release:** Pragmatický

---

## 1) Rozhodnutie

**Odporúčanie: GO**

Platforma je pripravená na live spustenie. Kritické technické, dátové, billing a bezpečnostné brány sú splnené.

---

## 2) RAG stav (Green / Yellow / Red)

### GREEN
- Build a release preflight prešli.
- Kľúčové produktové flow sú funkčné (dashboard, príležitosti, pipeline, properties, AI endpoint).
- Billing endpointy sú funkčné.
- RLS je uzavreté aj na legacy tabuľkách.
- `ai_insight` backfill dosiahol cieľ pre launch (>= 85%).

### YELLOW
- Playwright login E2E čaká na test prihlasovacie údaje.
- Backfill pokračuje počas Day-1 monitoringu do vyššieho pokrytia (>95%).

### RED
- Bez aktuálnych release-stop blockerov.

---

## 3) Deploy sekvencia (stručne)

1. Finálne preflight potvrdenie (Product + Tech Lead).  
2. Deploy podľa technického runbooku (`deployment-runbook-day0-day1.md`).  
3. Krátke post-deploy sanity overenie kľúčových obrazoviek.  
4. Otvorenie 24h monitoring okna.  
5. Priebežná komunikácia v launch kanáli.

---

## 4) Monitoring prvých 24 hodín

- API 4xx/5xx chybovosť (hlavne AI a billing trasy)
- Latencia AI endpointu a fallback trend
- Billing webhook chyby
- Rast `ai_insight` pokrytia
- Incidenty od pilot používateľov

---

## 5) Rollback pravidlo

Rollback spustiť iba pri kritickej regresii (auth, billing, integrita dát, bezpečnostný incident).

- rollback aplikácie na poslednú stabilnú verziu
- DB zmeny ponechať (aditívne a kompatibilné)
- alias `/sofia` ponechať aktívny počas prechodného obdobia

---

## 6) Schvaľovací box

### Konečné rozhodnutie (zakrúžkovať)

**GO / NO-GO**

### Dôvod rozhodnutia

................................................................................  
................................................................................  
................................................................................

### Schválenia

- **Product Owner:** ___________________________  Dátum: __________
- **Tech Lead:** _______________________________  Dátum: __________
- **Operations/Support:** ______________________  Dátum: __________

