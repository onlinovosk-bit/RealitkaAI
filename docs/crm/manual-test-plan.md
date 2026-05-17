# MANUAL TEST PLAN

## 1. Registrácia
- otvor /register
- vytvor nový účet
- skontroluj, že registrácia prebehne bez chyby
- skontroluj, či sa dá následne prihlásiť

## 2. Login
- otvor /login
- prihlás sa existujúcim účtom
- over presmerovanie do dashboardu
- klikni logout a over návrat na /login

## 3. Create lead
- otvor /leads
- vytvor nový lead
- over, že sa zobrazí v tabuľke
- otvor /activities a over záznam

## 4. Update lead
- otvor detail leadu
- zmeň status alebo poznámku
- ulož
- otvor /activities a over záznam

## 5. Create property
- otvor /properties
- pridaj novú nehnuteľnosť
- over, že sa zobrazí v tabuľke
- otvor /activities a over záznam

## 6. Matching recalc
- otvor /matching
- klikni "Prepočítať matching"
- over vznik matching záznamov
- otvor /activities a over záznam

## 7. Recommendations recalc
- otvor /recommendations
- klikni "Prepočítať odporúčania"
- over odporúčania v tabuľke
- otvor /activities a over záznam

## 8. Create task
- otvor /tasks
- vytvor úlohu
- over zobrazenie v zozname
- označ ju ako done
- otvor /activities a over záznam

## 9. Management page
- otvor /management
- over KPI
- over výkon agentov
- over pipeline prehľad
- over AI bloky

## 10. System page
- otvor /system
- over režim systému
- over env kontroly
