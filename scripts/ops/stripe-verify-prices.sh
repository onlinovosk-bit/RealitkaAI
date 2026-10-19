#!/usr/bin/env bash
# Revolis — Stripe VERIFY (krok A). READ-ONLY. Logika je v stripe_verify_prices.py.
# Overuje ceny (vratane tiers licencie cennika v3, interval, mena, tax_behavior) aj kupon akcie 9/12
# (percent_off, duration, redeem_by, applies_to).
#
#   export STRIPE_SECRET_KEY=rk_live_...   # restricted key s "Prices: Read" a "Coupons: Read" stačí
#   bash scripts/ops/stripe-verify-prices.sh
#   bash scripts/ops/stripe-verify-prices.sh --spec   # čo vytvoriť v Stripe (bez kľúča)
#   bash scripts/ops/stripe-verify-prices.sh --fixture subor.json   # offline, bez kľúča
#
# Kľúč sem nepatrí ani ako argument: číta ho Python z env a posiela len v hlavičke.
set -euo pipefail
exec python3 "$(dirname "$0")/stripe_verify_prices.py" "$@"
