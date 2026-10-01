#!/usr/bin/env python3
"""Formatuje read-only vypis GET /v1/subscriptions do citatelnej tabulky.

Cita JSON zo stdin, nepozna a nepotrebuje ziadny Stripe kluc.
Pouziva sa zo scripts/ops/stripe-verify-subscriptions.sh.
"""
import json
import sys

SEAT_AMOUNTS = {7900, 7100, 6300}


def main() -> int:
    payload = json.load(sys.stdin)
    if "error" in payload:
        print("STRIPE ERROR: " + payload["error"].get("message", ""), file=sys.stderr)
        return 1

    rows = payload.get("data", [])
    if not rows:
        print("ziadne aktivne subscriptions")
        return 0

    print(f"{'customer':38s} {'price_id':32s} {'amount':>8s} {'interval':>9s}  {'model':7s} product")
    print("-" * 120)

    for sub in rows:
        customer = sub.get("customer")
        if isinstance(customer, dict):
            who = customer.get("email") or customer.get("name") or customer.get("id", "?")
        else:
            who = str(customer)

        for item in sub.get("items", {}).get("data", []):
            price = item.get("price") or {}
            recurring = price.get("recurring") or {}
            cents = price.get("unit_amount")
            amount = f"{cents / 100:.2f}" if cents is not None else "?"
            model = "seat" if cents in SEAT_AMOUNTS else "LEGACY"
            product = price.get("product")
            product = product.get("name") if isinstance(product, dict) else str(product)
            print(
                f"{who[:38]:38s} {price.get('id', '?'):32s} {amount:>8s} "
                f"{recurring.get('interval', 'one-time'):>9s}  {model:7s} {product}"
            )

    print()
    print(f"{len(rows)} aktivnych subscriptions.")
    if payload.get("has_more"):
        print("WARNING: has_more=true — viac nez 100, vypis je NEUPLNY (strankuj cez starting_after).")
    print("seat = 79/71/63 eur (kanonicky model). LEGACY = stary program, dnes uz iba Smolko.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
