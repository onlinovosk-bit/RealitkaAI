#!/usr/bin/env bash
# Revolis — Stripe VERIFY (krok A).  READ-ONLY: iba GET /v1/prices, nič nevytvára.
#
# Pouzitie:
#   export STRIPE_SECRET_KEY=sk_live_...     # kluc NIKDY nedavaj do chatu ani do repa
#   bash stripe-verify.sh
#
# Posli mi iba VYSTUP. Price ID nie su tajomstvo, secret key ano.

set -euo pipefail
: "${STRIPE_SECRET_KEY:?Nastav STRIPE_SECRET_KEY (sk_live_...) pred spustenim}"

curl -sS -G https://api.stripe.com/v1/prices \
  -u "${STRIPE_SECRET_KEY}:" \
  -d active=true -d limit=100 \
| python3 -c '
import json,sys
EXPECTED=[("STRIPE_PRICE_SOLO_SEAT",7900,"month"),("STRIPE_PRICE_TEAM_SEAT",7100,"month"),
("STRIPE_PRICE_OFFICE_SEAT",6300,"month"),("STRIPE_PRICE_OWNER_COCKPIT",34900,"month"),
("STRIPE_PRICE_OWNER_COCKPIT_FOUNDER",24900,"month"),("STRIPE_PRICE_CREDITS_START",4900,None),
("STRIPE_PRICE_CREDITS_RAST",12900,None),("STRIPE_PRICE_CREDITS_PRO",37900,None),
("STRIPE_PRICE_CREDITS_MEGA",99900,None)]
d=json.load(sys.stdin)
if "error" in d: sys.exit("STRIPE ERROR: "+d["error"].get("message",""))
prices=d["data"]
def find(amount,interval):
    out=[]
    for p in prices:
        if p.get("unit_amount")!=amount: continue
        if p.get("currency")!="eur": continue
        if not p.get("active") or not p.get("livemode"): continue
        r=p.get("recurring") or {}
        if (r.get("interval") if r else None)!=interval: continue
        out.append(p["id"])
    return out
missing=0
for key,amount,interval in EXPECTED:
    hits=find(amount,interval); kind="month" if interval else "one-time"
    if len(hits)==1: print(f"OK       {key}={hits[0]}   ({amount/100:.2f} eur {kind})")
    elif not hits:
        missing+=1; print(f"MISSING  {key}   -- need {amount/100:.2f} eur {kind}, active, live")
    else:
        missing+=1; print(f"AMBIG    {key}   -- {len(hits)} candidates: {chr(44).join(hits)}")
print()
print(f"{len(EXPECTED)-missing}/{len(EXPECTED)} resolved.  active live EUR prices seen: {len(prices)}")
if d.get("has_more"): print("WARNING: has_more=true - viac nez 100 active cien, tento vypis je NEUPLNY.")
print("9/9 -> krok B (env patch).   Akykolvek MISSING -> krok C (STOP, samostatne GO).")
'
