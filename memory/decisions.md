# Critical Decisions Log
- [2026-04-29] CI/CD: Vyriešený "Nuclear Option" pre artifacty (apps/crm/.next). Pipeline je ZELENÁ.
- [2026-04-29] XML Feed: Zvolená Varianta 1 (Vlastný web) pre utajenie pred Webexom.
- [2026-04-29] Outreach: Definované šablóny pre segmenty A (Hot), B (Warm), C (Cold).

## [2026-04-30] - L99 Core Architecture & Security Overhaul

### 1. Rozhodnutie: Prechod na Štafetovú (Relay) Orchestráciu
- **Alternatívy:** Fixné crony bez kontroly stavu (pôvodné), manuálne spúšťanie.
- **Prečo:** Eliminácia kaskádových chýb. Každý krok (Scrape -> Score -> Segment) spracuje len dáta pripravené predchádzajúcim krokom.
- **Dôsledok:** Systém je autonómny a odolný voči timeoutom API.

### 2. Rozhodnutie: Centralizovaný Revolis Guard (Middleware)
- **Alternatívy:** Overovanie kľúčov v každom súbore zvlášť, žiadne zabezpečenie.
- **Prečo:** DRY (Don't Repeat Yourself) princíp. Jeden "vyhadzovač" pre všetky endpointy uľahčuje údržbu a zvyšuje bezpečnosť.

### 3. Rozhodnutie: Automatizovaná Rotácia Kľúčov (Secret Rotation)
- **Alternatívy:** Statické heslá v kóde, manuálne generovanie hesiel.
- **Prečo:** L99 Security Standard. Použitie 32-znakovej náhodnej entropie (openssl) minimalizuje riziko útoku hrubou silou.

### 4. Rozhodnutie: Zjednotenie Príkazov (One-Click Deployment)
- **Alternatívy:** Posielanie čiastkových kódov, vysvetľovanie ciest k súborom.
- **Prečo:** Rýchlosť exekúcie. Spojenie generovania kľúčov, úpravy .env, vercel.json a endpointov do jedného Bash skriptu eliminuje chybu používateľa.
---
## [2026-04-30] - Slack & Morning Briefing Integration
- **Rozhodnutie:** Centralizácia Slack notifikácií do /lib/slack.js a vytvorenie briefing endpointu.
- **Prečo:** Aby ranný briefing aj Outreach engine zdieľali rovnakú infraštruktúru a tajomstvá (.env).
- **Dôsledok:** Automatizovaný prehľad každé ráno o 8:00 (podľa vercel.json).
---
