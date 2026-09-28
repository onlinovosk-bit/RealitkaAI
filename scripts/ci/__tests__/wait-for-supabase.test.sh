#!/usr/bin/env bash
# Testy pre scripts/ci/wait-for-supabase.sh.
#
# Čo to dokáže: že sa exit kód štartu prenesie, že práca bežiaca súbežne sa
# naozaj prekryje, že zaseknutý štart skončí na limite a nie navždy, a že
# chýbajúci log nezhodí samotný skript.
#
# Čo to nedokáže: nič o reálnom `supabase start`. Ten je práve tá časť, ktorú
# test nevie podržať — preto je fail-safe vetva testovaná ako plnohodnotný
# prípad, nie ako okrajový.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUBJECT="$HERE/../wait-for-supabase.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"; pkill -f "$WORK/fake-start" 2>/dev/null || true' EXIT

failures=0

# Stub štartu presne v tom tvare, v akom ho spúšťa workflow: podproces, ktorý
# na konci zapíše svoj návratový kód do .exit súboru.
start_bg() { # seconds, exit_code, tmpdir
  local secs="$1" code="$2" tmp="$3"
  rm -f "$tmp/supabase-start.exit"
  date +%s > "$tmp/supabase-start.began"
  # Presne ten tvar, ktorý používa workflow: zápis exit kódu je UVNÚTRI toho
  # istého podprocesu. Prvá verzia tohto stubu robila `( wait $pid; ... ) &`
  # a padala na `wait: pid is not a child of this shell` — teda na presne tom
  # obmedzení, kvôli ktorému subjekt tohto testu vôbec existuje.
  (
    (
      echo "attempt 1/3 via docker.io"
      sleep "$secs"
      echo "diagnostika na stderr" >&2
      exit "$code"
    )
    echo $? > "$tmp/supabase-start.exit"
  ) > "$tmp/supabase-start.log" 2>&1 &
}

check() { # name, want_exit, actual_exit
  if [ "$3" = "$2" ]; then
    echo "ok    $1  (exit $3)"
  else
    echo "FAIL  $1  chcel exit $2, dostal $3"
    failures=$((failures + 1))
  fi
}

# ── 1. úspech + reálny prekryv ────────────────────────────────────────────
T1="$WORK/t1"; mkdir -p "$T1"
start_bg 6 0 "$T1"
sleep 4                                     # „npm ci + Lint + Typecheck"
t0=$SECONDS
out=$(RUNNER_TEMP="$T1" SUPABASE_WAIT_INTERVAL=1 "$SUBJECT" 2>&1); rc=$?
waited=$((SECONDS - t0))
check "úspech sa prenesie" 0 "$rc"
if [ "$waited" -le 4 ]; then
  echo "ok    prekryv nastal  (čakalo sa ${waited}s zo 6s štartu)"
else
  echo "FAIL  prekryv nenastal, čakalo sa ${waited}s"; failures=$((failures + 1))
fi
if echo "$out" | grep -q "prekrytych"; then
  echo "ok    notice nesie meraciu hodnotu"
else
  echo "FAIL  notice chýba: $out"; failures=$((failures + 1))
fi

# ── 2. zlyhanie sa prenesie ───────────────────────────────────────────────
T2="$WORK/t2"; mkdir -p "$T2"
start_bg 1 1 "$T2"
sleep 3
RUNNER_TEMP="$T2" SUPABASE_WAIT_INTERVAL=1 "$SUBJECT" >/dev/null 2>&1; rc=$?
check "zlyhanie sa prenesie" 1 "$rc"

# ── 3. zaseknutie končí na limite, nie navždy ─────────────────────────────
T3="$WORK/t3"; mkdir -p "$T3"
start_bg 120 0 "$T3"
out=$(RUNNER_TEMP="$T3" SUPABASE_WAIT_TIMEOUT=3 SUPABASE_WAIT_INTERVAL=1 "$SUBJECT" 2>&1); rc=$?
check "zaseknutie -> 124" 124 "$rc"
if echo "$out" | grep -q "nedobehol do 3s"; then
  echo "ok    správa uvádza SKUTOČNÝ limit, nie konštantu"
else
  echo "FAIL  správa klame o limite: $(echo "$out" | head -1)"; failures=$((failures + 1))
fi

# ── 4. chýbajúci log nezhodí skript ───────────────────────────────────────
T4="$WORK/t4"; mkdir -p "$T4"
echo 0 > "$T4/supabase-start.exit"
RUNNER_TEMP="$T4" SUPABASE_WAIT_INTERVAL=1 "$SUBJECT" >/dev/null 2>&1; rc=$?
check "chýbajúci log neprekáža" 0 "$rc"

echo
if [ "$failures" -eq 0 ]; then
  echo "wait-for-supabase: všetky kontroly prešli"
else
  echo "wait-for-supabase: $failures zlyhaní"
  exit 1
fi
