#!/usr/bin/env bash
# UserPromptSubmit hook: pripomenie dôkazovú bránu (CLAUDE.md direktíva 8) pri
# správach, kde hrozí verdikt bez dôkazu: GO, verdikt, merge, PROD, flag, PASS.
# Stdout sa pridá do kontextu modelu; ostatné správy prejdú bez šumu.
input=$(cat)
prompt=$(printf '%s' "$input" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("prompt",""))' 2>/dev/null)
if printf '%s' "$prompt" | grep -Eq '(^|[^[:alnum:]_])GO([^[:alnum:]_]|$)' \
  || printf '%s' "$prompt" | grep -Eiq 'verdikt|verdict|merg|prod|flag|pass|nasad|deploy|zapn'; then
  cat <<'MSG'
DÔKAZOVÁ BRÁNA (CLAUDE.md direktíva 8): stav/verdikt iba z primárneho zdroja overeného v tomto turne.
Chýba vstup → over, že chýba, a raz povedz čo poslať; nič nevymýšľaj. Gold labels robí človek.
Opakované GO bez nového vstupu → krátko. PROD/merge/flag iba na explicitné GO a pri zelenom CI na heade.
MSG
fi
exit 0
