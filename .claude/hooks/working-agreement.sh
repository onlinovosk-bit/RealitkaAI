#!/usr/bin/env bash
# Pracovná dohoda -> kontext modelu. Zdroj pravdy: memory/working-agreement.md
# (bloky DIGEST a WEBHOOK). Použitie: working-agreement.sh <start|prompt|webhook>
#
#   start    SessionStart       celá dohoda + POSTUP (aj po resume/compact)
#   prompt   UserPromptSubmit   celá dohoda + POSTUP pri každej správe foundera
#   webhook  PostToolUse        pravidlo pre webhook (ReadNotifications)
#
# POSTUP = celkové % produktu, VYPOČÍTANÉ z tabuľky v docs/STATUS.md (súčet
# váha x skóre / súčet váh, zaokrúhlené nadol), nie napísané z hlavy.
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

progress() { # POSTUP z docs/STATUS.md; pri chybe vráti poctivé "nedá sa", nikdy ticho nič
  local f="$root/docs/STATUS.md" calc d t then now age stale="" pct rows parts
  local rule='Správa o hotovom bloku alebo otázka "kde sme" ZAČÍNA riadkom: session X % (odhad, k/n) | produkt Y % a KONČÍ riadkom: Postup: produkt Y % -> Z % (+-N b.). Y je číslo z tohto riadku; Z len ak sa zmenila tabuľka, inak Y -> Y (0 b.). X = k/n zadaných blokov tejto session hotových s dôkazom, vždy so zlomkom a zoznamom, nikdy holé %. Váhy sú odhad, nie meranie.'
  if [ ! -r "$f" ]; then
    printf 'POSTUP: chýba docs/STATUS.md, číslo sa nedá vypočítať. Povedz to; nevymýšľaj ho. %s' "$rule"; return 0
  fi
  calc="$(awk -F'|' '
    function t(s){ gsub(/[*[:space:]]/, "", s); return s }
    { w = t($3); s = t($5) }
    w ~ /^[0-9]+$/ && s ~ /^[0-9]+(,[0-9]+)?%$/ {
      name = $2; gsub(/\*/, "", name); gsub(/^ +| +$/, "", name)
      sub(/%/, "", s); sub(/,/, ".", s)
      W += w; S += w * s; n++
      parts = parts (parts ? "; " : "") name " " s " % (váha " w ")"
    }
    END { if (W > 0) printf "%d|%d|%s", n, int(S / W), parts }' "$f" 2>/dev/null)"
  if [ -z "$calc" ]; then
    printf 'POSTUP: tabuľku v docs/STATUS.md sa nepodarilo prečítať (stĺpce: blok | váha | stav | skóre). Prepočítaj ručne, povedz že je to ručne; nevymýšľaj. %s' "$rule"; return 0
  fi
  rows="${calc%%|*}"; calc="${calc#*|}"; pct="${calc%%|*}"; parts="${calc#*|}"
  d="$(grep -oE 'Posledná aktualizácia: \*\*[0-9]{4}-[0-9]{2}-[0-9]{2}, [0-9]{2}:[0-9]{2} UTC' "$f" | head -1 | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}, [0-9]{2}:[0-9]{2}')"
  if [ -n "$d" ]; then
    t="${d#*, }"; d="${d%%,*}"
    then="$(date -u -d "$d $t" +%s 2>/dev/null)"; now="$(date -u +%s)"
    if [ -n "$then" ]; then
      age=$(( (now - then) / 3600 ))
      [ "$age" -gt 24 ] && stale=" STARÉ ${age} h: prepočítaj tabuľku v docs/STATUS.md pred uvedením čísla, alebo povedz, že je staré."
    fi
    d="k $d $t UTC"
  else
    d="dátum poslednej aktualizácie chýba"
  fi
  printf 'POSTUP (vypočítané z docs/STATUS.md, %s, %s riadkov): produkt %s %% (zaokrúhlené nadol, odhad). Bloky: %s.%s %s' "$d" "$rows" "$pct" "$parts" "$stale" "$rule"
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

[ "$event" = "webhook" ] || text="$text"$'\n'"$(progress)"

jq -cn --arg h "$hook" --arg c "$text" '{hookSpecificOutput:{hookEventName:$h,additionalContext:$c}}'
exit 0
