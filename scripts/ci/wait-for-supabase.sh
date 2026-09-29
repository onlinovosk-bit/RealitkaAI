#!/usr/bin/env bash
# wait-for-supabase.sh — dočkaj sa štartu, ktorý beží na pozadí, a prenes jeho
# exit kód.
#
# TEST-SPLIT-01. `Start local Supabase` trvá 108-113 s a je druhá najväčšia
# položka behu. Nič, čo beží pred ním, databázu nepotrebuje — `npm ci`, `Lint`
# ani `Typecheck` sa jej nedotknú. Serializovať ich za ním je čistá strata,
# takže štart ide na pozadie a čaká sa až TU.
#
# Prečo súbor s exit kódom a nie `wait`: každý krok GitHub Actions je iný
# shell. Proces spustený v predchádzajúcom kroku je pre `wait $!` v tomto kroku
# nedosiahnuteľný — je to cudzie PID, nie potomok. Preto štart zapisuje svoj
# návratový kód do `$RUNNER_TEMP/supabase-start.exit` a tento skript ho číta.
#
# FAIL-SAFE: keď sa štart nedokončí do limitu, skript končí 124 a vypíše celý
# log. Tichý pád by znamenal, že `supabase status` v ďalšom kroku zlyhá na
# niečom, čo vyzerá nesúvisiaco — presne ten druh diagnostiky, ktorý stál
# hodinu pri BOM markeri 16. 9. 2026.
#
# Premenné (kvôli testovateľnosti):
#   RUNNER_TEMP              adresár so stavovými súbormi
#   SUPABASE_WAIT_TIMEOUT    limit v sekundách, default 900
#   SUPABASE_WAIT_INTERVAL   perióda kontroly, default 2

set -uo pipefail

TMP="${RUNNER_TEMP:?RUNNER_TEMP nie je nastavené}"
TIMEOUT="${SUPABASE_WAIT_TIMEOUT:-900}"
INTERVAL="${SUPABASE_WAIT_INTERVAL:-2}"

EXIT_FILE="$TMP/supabase-start.exit"
LOG_FILE="$TMP/supabase-start.log"
BEGAN_FILE="$TMP/supabase-start.began"

began=$(cat "$BEGAN_FILE" 2>/dev/null || echo 0)
deadline=$((SECONDS + TIMEOUT))

while [ ! -f "$EXIT_FILE" ]; do
  if [ "$SECONDS" -ge "$deadline" ]; then
    # Limit sa vypisuje z premennej, nie ako konštanta v texte. Správa, ktorá
    # tvrdí iné číslo než to, na ktorom sa naozaj skončilo, je horšia než žiadna.
    echo "::error title=TEST-SPLIT-01::supabase start nedobehol do ${TIMEOUT}s"
    cat "$LOG_FILE" 2>/dev/null || echo "(log neexistuje - štart sa možno vôbec nespustil)"
    exit 124
  fi
  sleep "$INTERVAL"
done

cat "$LOG_FILE" 2>/dev/null || true
code=$(cat "$EXIT_FILE")

# Toto je meracia hodnota, kvôli ktorej celá zmena existuje: koľko zo štartu
# ostalo NEPOKRYTÉ prácou, ktorá bežala súbežne. Je to podiel v rámci jedného
# behu, takže ho nerozhádže rýchlosť runnera — a to je podstatné, lebo medzi
# behmi je rozptyl až 26 % (411/415 s v sobotu večer vs 306 s v nedeľu ráno
# na tom istom obsahu).
if [ "$began" -gt 0 ]; then
  total=$(( $(date +%s) - began ))
  echo "::notice title=TEST-SPLIT-01::supabase start ${total}s | cakalo sa ${SECONDS}s | prekrytych $(( total - SECONDS ))s"
else
  echo "::notice title=TEST-SPLIT-01::cakalo sa ${SECONDS}s (zaciatok neznamy)"
fi

exit "$code"
