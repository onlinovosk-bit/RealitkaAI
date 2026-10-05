#!/usr/bin/env bash
# ================================================================
# Revolis.AI — Vercel Ignored Build Step
#
# Exit 0 = build SA PRESKOČÍ.  Exit 1 = build BEŽÍ.
# (Áno, je to naopak, než človek čaká — viď docs/project-configuration.)
#
# VERCEL-IGNORE-BUILD-01 — prečo to vzniklo:
#
# Free plán má strop 100 nasadení za deň. Meranie posledných 100 nasadení
# (2026-10-02): 88 preview, 12 produkčných, 25 rôznych vetiev, jeden agentný
# workstream sám 30. Teda ~88 % stropu míňali preview buildy agentných vetiev
# a produkčný deploy potom čakal 24 h za nimi.
#
# Tie preview buildy pritom nekupovali nič: `Playwright smoke (Vercel Preview)`
# na nich opakovane končil ako `skipped`.
#
# Pôvodný `ignoreCommand` (diff proti predošlému SHA) tu nepomohol — agentné
# vetvy `apps/crm` menia prakticky vždy, takže sa buildovalo zakaždým.
#
# PORADIE PODMIENOK JE BEZPEČNOSTNÉ, nie štylistické: produkcia sa vyhodnocuje
# PRVÁ a nikdy sa nepreskakuje. Keby sa poradie otočilo, vetva pomenovaná
# `claude/...` nasadená do produkcie by ticho neprešla a nikto by si toho
# nevšimol — build by nezlyhal, len by nebol.
# ================================================================
set -uo pipefail

BRANCH="${VERCEL_GIT_COMMIT_REF:-}"
ENVIRONMENT="${VERCEL_ENV:-}"

say() { echo "[vercel-ignore-build] $*" >&2; }

# ── 1. Produkcia sa NIKDY nepreskakuje ──────────────────────────
# Dve nezávislé podmienky zámerne: `VERCEL_ENV` je zdroj pravdy, názov vetvy
# je poistka pre prípad, že by premenná chýbala (vtedy je prázdna, nie
# "production", a samotná by nás nechránila).
if [ "$ENVIRONMENT" = "production" ]; then
  say "produkčný build (VERCEL_ENV=production) — buildujem"
  exit 1
fi

if [ "$BRANCH" = "main" ]; then
  say "vetva main — buildujem"
  exit 1
fi

# Keď nevieme ani prostredie, ani vetvu, nevieme, kde sme. Pôvodný príkaz
# v tomto stave spadol rovno na diff a vedel build preskočiť — čo je zlý smer:
# neistota musí znamenať BUILDOVAŤ, nie ticho nenasadiť.
if [ -z "$ENVIRONMENT" ] && [ -z "$BRANCH" ]; then
  say "ani VERCEL_ENV, ani VERCEL_GIT_COMMIT_REF — neviem, kde som, buildujem"
  exit 1
fi

# ── 2. Agentné vetvy: preview build preskočiť ───────────────────
# `claude/*` vetvy vytvárajú paralelné agentné sessions. Ich preview nikto
# neotvára a Playwright smoke na nich beží ako `skipped`. CI (GitHub Actions)
# na nich beží ďalej a nie je týmto nijako dotknuté — lint, testy aj build
# prejdú rovnako, len sa nerobí Vercel preview nasadenie.
#
# Keď preview na konkrétnej vetve naozaj treba, stačí ju premenovať mimo
# `claude/` prefix, alebo build spustiť ručne z Vercel dashboardu.
case "$BRANCH" in
  claude/*)
    say "agentná vetva '$BRANCH' — preview build preskakujem (VERCEL-IGNORE-BUILD-01)"
    exit 0
    ;;
esac

# ── 3. Inak pôvodné správanie: build len keď sa apps/crm zmenil ──
# Migrácie sú z diffu vylúčené zámerne — menia DB, nie build.
BASE="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"

if ! git cat-file -e "${BASE}^{commit}" 2>/dev/null; then
  # Bez použiteľnej bázy sa nedá povedať, že sa nič nezmenilo. Neistota znamená
  # buildovať — preskočiť build na základe dohadu je horšie než build navyše.
  say "báza '$BASE' nie je dostupná — buildujem pre istotu"
  exit 1
fi

if git diff --quiet "$BASE" HEAD -- . ':(exclude)supabase/migrations'; then
  say "v apps/crm sa oproti '$BASE' nič nezmenilo — preskakujem"
  exit 0
fi

say "apps/crm sa zmenil — buildujem"
exit 1
