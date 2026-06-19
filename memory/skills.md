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

## Skill: TASK_LOOP
- **Súbor:** `.claude/skills/task-loop/SKILL.md`
- **Popis:** Na konci každej úlohy — sync memory, rank backlog (Ústava), navrhni JEDNU ďalšiu úlohu, klasifikuj bránu (AUTO-SAFE / GO REQUIRED / STOP).
- **Swarm režim:** DAG → dôkaz disjunktných ciest → vlny (N+1 až po merge N) → write-probe Fáza 0 → brána per úloha. **Pochybnosť = sekvenčne.**
- **Anti-prehadzovanie:** Robor svoju časť prv (draft email, príkaz, SELECT) — neodovzdávaj „ty urob" bez pripraveného artefaktu.
- **Pravidlo:** Automatizuje **výber**, nie **vykonávanie**. PROD/secrets/merge/nová scope = GO REQUIRED. Anti-drift, anti-doc.
