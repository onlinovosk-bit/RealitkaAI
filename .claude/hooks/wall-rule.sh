#!/usr/bin/env bash
# Re-injects Core Directive 0 ("steny, nie skrutky") on EVERY user prompt.
#
# Why a hook and not CLAUDE.md: CLAUDE.md is read once, at session start.
# On 2026-09-28 the rule was in CLAUDE.md the whole time and the agent still
# drifted into screws by mid-session — six consecutive "nothing changed,
# check-in rescheduled to 18:31" messages. A UserPromptSubmit hook fires on
# every turn, so the rule cannot age out of context.
#
# Reads the hook payload on stdin and ignores it: the rule is unconditional.
cat >/dev/null

cat <<'JSON'
{
  "suppressOutput": true,
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "PRIPOMIENKA (CLAUDE.md Core Directive 0) — STENY, NIE SKRUTKY.\n\nZakázané: priebežné mikro-updaty („beží ~7 min\", „Vercel, bez akcie\", „bez zmeny, check-in preplánovaný na HH:MM\"). Opakovaná správa o tom, že sa nič nezmenilo, je skrutka.\n\nPovinné:\n1. Jeden hotový blok na jedno GO. Ozvi sa RAZ, keď je blok hotový — vrátane dôkazu (merge sha, čísla, výstup testov).\n2. Tiché čakanie je správne. Check-in, ktorý nič nenašiel, sa NEHLÁSI — len sa preplánuje.\n3. Rozhodnutie sa žiada RAZ, s možnosťami a odporúčaním. Nie séria otázok uprostred úlohy.\n4. Neohlasuj zámer („idem urobiť X\") a potom to isté ako výsledok. Stačí výsledok.\n\nVýnimka, kedy sa ozvať okamžite aj uprostred bloku: rozbitá produkcia, strata dát, bezpečnostná diera, alebo premisa úlohy prestala platiť (STOP podľa skillu kontrolor)."
  }
}
JSON
