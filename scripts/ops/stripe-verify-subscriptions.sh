#!/usr/bin/env bash
# Revolis — read-only VERIFY aktivnych Stripe subscriptions a ich cien.
# Odpoveda na: na ktorej cene je Smolko, a kto dalsi je este na legacy programe.
#
# READ-ONLY: iba GET /v1/subscriptions. Nic nevytvara, nic nemeni.
#
# Pouzitie (z apps/crm, kde lezi .vercel/.env.production.local):
#   export STRIPE_SECRET_KEY="$(grep -m1 '^STRIPE_SECRET_KEY=' .vercel/.env.production.local | cut -d= -f2- | tr -d '"')"
#   bash ../../scripts/ops/stripe-verify-subscriptions.sh
#
# Kluc ide cez premennu prostredia, NIE ako argument — argument konci
# v historii shellu a v zozname procesov. Naspat posli iba vystup:
# price ID a e-maily su data, secret key nie.

set -euo pipefail
: "${STRIPE_SECRET_KEY:?Nastav STRIPE_SECRET_KEY (sk_live_...) pred spustenim}"

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

curl -sS -G https://api.stripe.com/v1/subscriptions \
  -u "${STRIPE_SECRET_KEY}:" \
  -d status=active -d limit=100 \
  -d "expand[]=data.customer" \
| python3 "${here}/stripe-format-subscriptions.py"
