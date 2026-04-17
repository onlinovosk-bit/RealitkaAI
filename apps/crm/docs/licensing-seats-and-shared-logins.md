# Licencie, sedadlá a zdieľané prihlásenie

## Produktová komunikácia (landing)

- **Pro:** 99 € / mesiac **za jedného makléra** (jedna licencia = jeden používateľský účet).
- **Enterprise:** 299 € / mesiac **za balík až 4 licencie** (štyri samostatné účty v rámci jednej kancelárie).

## Ako znižujeme zneužitie „jedno heslo pre celý tím“

1. **Jeden účet = jedna osoba** — v obchodných podmienkach a pri onboardingu sa uvádza, že licencia je neprenosná a zdieľanie prihlasovacích údajov je proti pravidlám (dôvod: GDPR, audit, fakturácia podľa sedadiel).
2. **Pozvanie agentov** — vlastník kancelárie pozýva maklérov cez **invite**; každý dostane vlastný `auth` účet a záznam v `profiles` (viazaný na `agency_id` / `team_id`).
3. **Limity podľa plánu** — v aplikácii sa uplatňujú limity `maxAgents` / využitie podľa počtu aktívnych profilov (`saas-ops`, `feature-gating`). Zdieľaný účet by nespĺňal očakávaný počet „sedadiel“ pri audite.
4. **Ďalšie kroky (roadmap)** — voliteľné obmedzenie súbežných relácií na účet, SSO pre Enterprise, výraznejší audit prihlásení a upozornenia pri podozrivom vzorci (viac zariadení / IP).

Technicky Supabase Auth **nepreukáže** „rovnakú kanceláriu“ bez business pravidiel; preto kombinácia **zmluvných** + **produktových** (invite, sedadlá, fakturácia) je základ.
