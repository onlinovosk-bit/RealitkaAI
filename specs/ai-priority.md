# Špecifikácia: AI priorita leadov

**Owner:** Orchestrator 1 (batch, cron, persist do DB); Orchestrator 2 (zobrazenie, úpravy používateľom, copy).

## Doménové pravidlá

- Povolené hodnoty priority (SK konvencia v produkte): **Vysoká** | **Stredná** | **Nízka** (alebo ekvivalent mapovaný v kóde — drž konzistenciu s `apps/crm`).

## Kontrakt

- Popíš sem: vstupy do triage, výstupné polia v DB, kedy sa prepisuje manuálny lock, audit (`ai_triage_at`, `ai_priority_manual_at`, …).
