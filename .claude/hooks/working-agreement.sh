#!/usr/bin/env bash
# Pracovná dohoda -> kontext modelu. Zdroj pravdy: memory/working-agreement.md
# (bloky DIGEST a WEBHOOK). Použitie: working-agreement.sh <start|prompt|webhook>
#
#   start    SessionStart       celá dohoda (aj po resume/compact)
#   prompt   UserPromptSubmit   celá dohoda pri každej správe foundera
#   webhook  PostToolUse        pravidlo pre webhook (ReadNotifications)
#
# Nikdy nezlyhá hlučne: chyba hooku by session rozbila. Ak chýba súbor alebo
# blok, vloží sa zabudovaná záložná verzia - hook nesmie ticho nerobiť nič.

event="${1:-prompt}"
root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." 2>/dev/null && pwd)}"
file="$root/memory/working-agreement.md"

block() { # block <MARKER>
  [ -r "$file" ] || return 0
  sed -n "/<!-- $1:START -->/,/<!-- $1:END -->/p" "$file" | sed "/<!-- $1:/d"
}

case "$event" in
  webhook)
    hook="PostToolUse"
    text="$(block WEBHOOK)"
    [ -n "$text" ] || text="WEBHOOK (pracovná dohoda): odpíš len pri červenom CI, konflikte, review komentári alebo hotovom bloku; inak najviac jedna veta alebo nič. (Záloha: chýba memory/working-agreement.md alebo jeho blok WEBHOOK.)"
    ;;
  start)  hook="SessionStart";     text="$(block DIGEST)" ;;
  *)      hook="UserPromptSubmit"; text="$(block DIGEST)" ;;
esac

if [ -z "$text" ]; then
  text="PRACOVNÁ DOHODA: steny, nie skrutky. Jeden blok = jedna správa s dôkazom; na webhooky bez zmeny stavu neodpisuj; memory zapíš raz na konci session; „merguj blok X\" = zmerguj zelené PR toho bloku a over na main. (Záloha: chýba memory/working-agreement.md alebo jeho blok DIGEST.)"
fi

jq -cn --arg h "$hook" --arg c "$text" '{hookSpecificOutput:{hookEventName:$h,additionalContext:$c}}'
exit 0
