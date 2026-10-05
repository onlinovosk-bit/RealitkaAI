#!/usr/bin/env bash
# Revolis — Stripe krok D: sonda na PROD. READ-ONLY, bez autentifikácie.
# Logika je v stripe-checkout-probe.py.
#
#   bash scripts/ops/stripe-checkout-probe.sh                     # https://app.revolis.ai
#   bash scripts/ops/stripe-checkout-probe.sh --base https://…    # iná adresa
#   bash scripts/ops/stripe-checkout-probe.sh --fixture f.json    # offline, pre testy
#
# Exit: 0 = seat aj topup brána dostupná a sumy sedia, 1 = niečo chýba/nesedí,
#       2 = sieť / HTTP / nečitateľné telo.
set -euo pipefail
exec python3 "$(dirname "$0")/stripe-checkout-probe.py" "$@"
