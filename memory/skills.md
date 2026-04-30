# 🛠️ REVOLIS SKILL LIBRARY

## Skill: L99_DEPLOY
- **Popis:** Kompletný push na produkciu so zbalením všetkých zmien.
- **Workflow:** git add . -> commit s L99 prefixom -> git push.

## Skill: REVOLIS_GUARD_CHECK
- **Popis:** Obalenie akéhokoľvek nového endpointu do bezpečnostného Guardu.
- **Pravidlo:** Žiadny súbor v /api nesmie existovať bez importu @/lib/revolis-guard.

## Skill: STEP_HANDOVER
- **Popis:** Zmena statusu v databáze po úspešnom kroku.
- **Pravidlá:** SCRAPED -> SCORED -> SEGMENTED -> OUTREACH_DONE.
