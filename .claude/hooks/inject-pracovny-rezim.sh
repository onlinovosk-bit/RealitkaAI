#!/usr/bin/env bash
# Revolis.AI — UserPromptSubmit hook: vloží pracovný režim do každého turnu.
#
# Prečo hook a nie len CLAUDE.md: CLAUDE.md sa načíta na začiatku session a pri
# dlhej práci sa môže dostať mimo kontext — presne to sa 2026-10-02 stalo
# a práca sa rozsypala na skrutky. Hook beží pri KAŽDOM prompte, takže pravidlo
# nemá ako zostarnúť.
#
# Text pravidla žije vo vedľajšom .md, aby sa dal čítať a meniť bez šahania do
# shellu. Hook je fail-soft: keď súbor chýba alebo jq nie je, nevypíše nič
# a turn pokračuje — vkladanie kontextu nesmie blokovať prácu.
set -uo pipefail

RULE_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pracovny-rezim.md"

[ -r "$RULE_FILE" ] || exit 0
command -v jq >/dev/null 2>&1 || exit 0

jq -Rs --null-input \
  --rawfile rule "$RULE_FILE" \
  '{hookSpecificOutput: {hookEventName: "UserPromptSubmit", additionalContext: $rule}}'
