# Špecifikácia: follow-up sweep

**Owner:** Orchestrator 1 (generovanie, cron, režim `draft` vs `send`).

## Kontrakt

- Env: napr. `FOLLOWUP_MODE` (`draft` | `send`) — správanie musí byť explicitné v tomto súbore po každej zmene.
- Frekvencia cronu a limity (počet leadov, rate).

## Bezpečnosť

- Draft nikdy neodosiela bez explicitného prepnutia režimu a otestovania.
