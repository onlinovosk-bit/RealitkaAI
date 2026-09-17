# Docs overlay — tri opravy Smolko roadmap / architektúra

**Branch:** `docs/smolko-roadmap-data-overlay` · STOP (no merge, no code, no SQL apply).

## Zdroje

- Task: `docs/prompts/task-3-opravy-roadmap.md` (Downloads).
- Artifact `claude.ai/code/artifact/1080c99d-37d0-4830-901c-df0001576e3e` — 404.
- Parent súbory v `origin/main` **neboli**. Overlay položený na požadované cesty.

## Re-count vs brief

Brief sedí na `properties` 133/132, listings/trail 0, estimates 5, `scheduled_events` chýba, Predaná 0, cena 41, Aktívna 128.  
Odchylky: `Ostatné` **86** nie 83; `schema_migrations` **48** nie 47 (po customer-health); `usable_area = 0` je tých 50 (nie NULL).

## Čo je v PR

Architektúra 6.2 + V0 limity; roadmap Fáza 2/5 + table-status; Integration Report type; `memory/decisions.md` pravidlo audit kódu ≠ dát.
