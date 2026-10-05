#!/usr/bin/env bash
# Revolis — Stripe VERIFY (krok A). READ-ONLY. Logika je v stripe_verify_prices.py.
#
#   export STRIPE_SECRET_KEY=rk_live_...   # restricted key s "Prices: Read" stačí
#   bash scripts/ops/stripe-verify-prices.sh
#   bash scripts/ops/stripe-verify-prices.sh --spec   # čo vytvoriť v Stripe (bez kľúča)
#
# Scope "Account: Read" je VOLITEĽNÝ — s ním VERIFY povie aj stav účtu (KYB, krok
# B1: charges_enabled). Bez neho vypíše „nemerané" a pokračuje kontrolou cien.
#
# Kľúč sem nepatrí ani ako argument: číta ho Python z env a posiela len v hlavičke.
set -euo pipefail
exec python3 "$(dirname "$0")/stripe_verify_prices.py" "$@"
