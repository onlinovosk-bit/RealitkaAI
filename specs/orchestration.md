# Špecifikácia: orchestrácia (backend)

**Owner:** Orchestrator 1.

## Rozsah

- Poradie a spúšťanie background jobov (cron, queue).
- Idempotencia, retry, dead-letter / failed stavy (ak existujú).
- Kontrakty medzi webhook ingestom a spracovaním (napr. integrácie).

## Checklist pri zmene

1. Je nová cesta chránená (auth / secret)?
2. Môže sa job spustiť dvakrásť bez poškodenia dát?
3. Je zdokumentovaný env a frekvencia spúšťania (napr. `vercel.json`)?
