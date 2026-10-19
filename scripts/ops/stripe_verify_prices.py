#!/usr/bin/env python3
"""Revolis — Stripe VERIFY (CHECKOUT-ENV-01, krok A). READ-ONLY.

Iba GET /v1/prices (s expand tiers a product) a GET /v1/coupons. Nic nevytvara, nic nezapisuje.

Pouzitie:
    export STRIPE_SECRET_KEY=rk_live_...     # restricted key "Prices: Read" + "Coupons: Read" staci
    bash scripts/ops/stripe-verify-prices.sh
    bash scripts/ops/stripe-verify-prices.sh --spec    # co vytvorit v Stripe, bez kluca

Kluc sa cita IBA z env a ide IBA do HTTP hlavicky - nikdy do argv (kluc v argumente
externeho procesu by bol viditelny v `ps`). Posli spat iba VYSTUP: price ID nie su tajomstvo, kluc ano.

Co musi existovat je v stripe-expected-prices.json; ze sedi s kodom, strazi
apps/crm/tests/verification/stripe-expected-prices.verification.test.ts.

Exit: 0 = vsetko resolved, 1 = nieco MISSING/AMBIG, 2 = chyba konfiguracie/API.
"""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
MANIFEST = os.path.join(HERE, "stripe-expected-prices.json")

GATES = {
    "seat": "/upgrade seat checkout (P0) - blokuje, kym chyba co i len jedna",
    "cockpit": "Owner Cockpit add-on - chybajuca = checkbox sa neukaze",
    "topup": "/billing#topup - samostatna brana, P0 neblokuje",
    "starter_pack": "marketing /balik - samostatna brana, P0 neblokuje",
    "pricing_v2": "cennik v3 (PRICING_V2_ENABLED; licencia tiered, kupon 9/12, baliky, kredit; sumy BEZ DPH, tax_behavior=exclusive) - samostatna brana, P0 neblokuje",
}


def load_manifest():
    with open(MANIFEST, encoding="utf-8") as f:
        return json.load(f)["prices"]


def load_coupons():
    with open(MANIFEST, encoding="utf-8") as f:
        return json.load(f).get("coupons", [])


def is_tiered(entry):
    return entry.get("billing_scheme") == "tiered"


def entry_tiers(entry):
    """Ocakavane tiers z manifestu ako [(up_to|'inf', flat, unit)]."""
    return [(t["up_to"], t["flat_amount"], t["unit_amount"]) for t in entry["tiers"]]


def price_tiers(price):
    """Tiers zo Stripe odpovede: up_to null -> 'inf', flat/unit null -> 0."""
    return [
        ("inf" if t.get("up_to") is None else t["up_to"], t.get("flat_amount") or 0, t.get("unit_amount") or 0)
        for t in price.get("tiers") or []
    ]


def amount_text(entry):
    if is_tiered(entry):
        parts = []
        for up_to, flat, unit in entry_tiers(entry):
            parts.append(f"{up_to}:{'flat ' + eur(flat) if flat else eur(unit) + '/ks'}")
        return "tiered " + entry["tiers_mode"] + " [" + "; ".join(parts) + "]"
    return eur(entry["amount"])


def eur(cents):
    return f"{cents / 100:.2f} EUR"


def interval_of(entry):
    """Interval fakturacie recurring ceny: 'month' (predvolene) alebo 'year' (rocne ceny planov v2)."""
    return entry.get("interval", "month")


def kind(entry):
    if entry["type"] != "recurring":
        return "jednorazovo (one-time)"
    return "rocne (recurring year)" if interval_of(entry) == "year" else "mesacne (recurring month)"


def reject_reason(price, entry):
    """None ak cena presne sedi na ocakavanie, inak prvy dovod, preco nie."""
    if price.get("currency") != "eur":
        return f"currency={price.get('currency')}"
    if not price.get("active"):
        return "active=false"
    if not price.get("livemode"):
        return "livemode=false (test mode)"
    if price.get("type") != entry["type"]:
        return f"type={price.get('type')}, treba {entry['type']}"
    if entry["type"] == "recurring":
        rec = price.get("recurring") or {}
        want = interval_of(entry)
        if rec.get("interval") != want or rec.get("interval_count", 1) != 1:
            return f"interval={rec.get('interval_count', 1)}x{rec.get('interval')}, treba 1x {want}"
        # Checkout posiela quantity = pocet maklerov; tiered/metered by zmenilo sumu.
        if rec.get("usage_type", "licensed") != "licensed":
            return f"usage_type={rec.get('usage_type')}, treba licensed"
    want_scheme = "tiered" if is_tiered(entry) else "per_unit"
    if price.get("billing_scheme", "per_unit") != want_scheme:
        return f"billing_scheme={price.get('billing_scheme')}, treba {want_scheme}"
    if is_tiered(entry):
        if price.get("tiers_mode") != entry["tiers_mode"]:
            return f"tiers_mode={price.get('tiers_mode')}, treba {entry['tiers_mode']}"
        if "tiers" not in price:
            return "tiers chyba v odpovedi (treba expand[]=data.tiers)"
        got, want = price_tiers(price), entry_tiers(entry)
        if got != want:
            for i, (g, w) in enumerate(zip(got, want)):
                if g != w:
                    return f"tier {i + 1}: up_to/flat_amount/unit_amount={g}, treba {w}"
            return f"pocet tiers={len(got)}, treba {len(want)}"
    product = price.get("product")
    if isinstance(product, dict) and not product.get("active", True):
        return "product.active=false"
    if entry["gate"] == "pricing_v2":
        # Sumy v3 su BEZ DPH: DPH sa pocita navrch len ak je cena exclusive a produkt ma tax_code.
        if price.get("tax_behavior") != "exclusive":
            return f"tax_behavior={price.get('tax_behavior')}, treba exclusive"
        if not isinstance(product, dict):
            return "product nie je expandovany - tax_code sa neda overit"
        if not product.get("tax_code"):
            return "product.tax_code chyba (nastav Stripe Tax kod produktu)"
    return None


def product_name(price):
    product = price.get("product")
    return product.get("name", "?") if isinstance(product, dict) else str(product)


def _get_pages(key, path, params):
    """GET so strankovanim. Kluc ide IBA do hlavicky Authorization; nikdy do argv ani na vystup."""
    rows, cursor = [], None
    while True:
        page_params = list(params) + ([("starting_after", cursor)] if cursor else [])
        req = urllib.request.Request(
            f"https://api.stripe.com/v1/{path}?" + urllib.parse.urlencode(page_params),
            headers={"Authorization": f"Bearer {key}"},
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                page = json.load(resp)
        except urllib.error.HTTPError as e:
            try:
                msg = json.load(e).get("error", {}).get("message", "")
            except Exception:
                msg = ""
            print(f"STRIPE ERROR {e.code}: {msg}", file=sys.stderr)
            sys.exit(2)
        except urllib.error.URLError as e:
            print(f"NETWORK ERROR: {e.reason}", file=sys.stderr)
            sys.exit(2)
        rows.extend(page["data"])
        if not page.get("has_more") or not page["data"]:
            return rows
        cursor = page["data"][-1]["id"]


def fetch_live(key):
    prices = _get_pages(
        key, "prices",
        [("active", "true"), ("limit", "100"), ("expand[]", "data.product"), ("expand[]", "data.tiers")],
    )
    coupons = _get_pages(key, "coupons", [("limit", "100")])
    return prices, coupons


def fetch_fixture(path):
    """Offline mod pre testy: {"pages": [<Stripe list objekt>, ...], "coupons": [<Stripe coupon>, ...]}."""
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)
    prices = [p for page in raw["pages"] for p in page["data"]]
    return prices, raw.get("coupons", [])


def print_spec(manifest, coupons):
    print("Krok C - co vytvorit v Stripe (LIVE mode). Vytvara founder (Andrej) po merge, nie agent.\n")
    print("Kazda cena: currency EUR. Licencia = TIERED, Graduated pricing, quantity = pocet maklerov.")
    print("Ostatne ceny: Standard pricing (per unit). Recurring = Monthly (interval 1), rocna licencia = Yearly.")
    print("Legacy ceny: amount = presne co zakaznik zaplati (checkout nema automatic_tax).")
    print("Cennik v3 (gate pricing_v2): sumy BEZ DPH, tax_behavior=exclusive a produkt musi mat")
    print("Stripe Tax kod (tax_code); verifikator ich kontroluje. DPH pricita Stripe Tax pri")
    print("PRICING_V2_STRIPE_TAX=on - registracie a kody potvrd s uctovnicou.")
    print("Odporucany postup: stripe-v2/stripe_live_catalog.py (DRY-RUN predvolene; zapis iba s --apply a potvrdeniami).\n")
    for gate, label in GATES.items():
        rows = [e for e in manifest if e["gate"] == gate]
        crows = [c for c in coupons if c["gate"] == gate]
        if not rows and not crows:
            continue
        print(f"[{gate}] {label}")
        for e in rows:
            if is_tiered(e):
                print(f"  {e['env']:38s} tiered {e['tiers_mode']:9s} {kind(e):26s} produkt: {e['product']}")
                for up_to, flat, unit in entry_tiers(e):
                    print(f"      tier up_to={str(up_to):>3s}  flat_amount={flat:>6d}  unit_amount={unit:>6d}")
            else:
                print(f"  {e['env']:38s} {eur(e['amount']):>12s}  {kind(e):26s} produkt: {e['product']}")
        for c in crows:
            print(f"  {c['env']:38s} kupon -{c['percent_off']} % duration={c['duration']} "
                  f"redeem_by={c['redeem_by_iso']} ({c['redeem_by']}) len produkt: {c['applies_to_product']}")
        print()
    print("Potom znova spusti VERIFY - vypise riadky KLUC=price_.../coupon ID pre krok B.")


def candidates(entry, prices):
    """Ceny, ktore su kandidatmi pre polozku: tiered podla produktu a schemy, ostatne podla sumy."""
    if is_tiered(entry):
        return [p for p in prices if p.get("billing_scheme") == "tiered" and product_name(p) == entry["product"]]
    return [p for p in prices if p.get("unit_amount") == entry["amount"]]


def coupon_reject_reason(coupon, entry, product_ids):
    if not coupon.get("livemode"):
        return "livemode=false (test mode)"
    if coupon.get("percent_off") != entry["percent_off"] or coupon.get("amount_off") is not None:
        return f"percent_off={coupon.get('percent_off')}, amount_off={coupon.get('amount_off')}, treba percent_off={entry['percent_off']}"
    if coupon.get("duration") != entry["duration"]:
        return f"duration={coupon.get('duration')}, treba {entry['duration']}"
    if coupon.get("redeem_by") != entry["redeem_by"]:
        return f"redeem_by={coupon.get('redeem_by')}, treba {entry['redeem_by']} ({entry['redeem_by_iso']})"
    applies = sorted((coupon.get("applies_to") or {}).get("products") or [])
    if not product_ids:
        return "produkt licencie nie je v Stripe, applies_to sa neda overit"
    if applies != sorted(product_ids):
        return f"applies_to.products={applies}, treba {sorted(product_ids)} (produkt {entry['applies_to_product']})"
    return None


def verify(manifest, prices, coupons_manifest=None, coupons=None):
    coupons_manifest = coupons_manifest or []
    coupons = coupons or []
    ok_lines, unresolved, gate_ok = [], 0, {g: True for g in GATES}
    for e in manifest:
        same_amount = candidates(e, prices)
        hits = [p for p in same_amount if reject_reason(p, e) is None]
        if len(hits) > 1:
            # Rovnaka suma a typ u dvoch poloziek manifestu (napr. Owner Cockpit 349 EUR vs iny produkt):
            # cena, ktora podla nazvu produktu patri INEJ polozke manifestu, sa tejto neráta.
            # Neznamy duplikat (ine meno) ostava AMBIG.
            others = {
                o["product"].strip().lower()
                for o in manifest
                if o is not e and not is_tiered(o) and not is_tiered(e)
                and o["amount"] == e["amount"] and o["type"] == e["type"]
            }
            hits = [p for p in hits if product_name(p).strip().lower() not in others] or hits
        if len(hits) == 1:
            line = f"{e['env']}={hits[0]['id']}"
            ok_lines.append(line)
            print(f"OK       {line}   ({amount_text(e)} {kind(e)}, produkt: {product_name(hits[0])})")
            continue
        unresolved += 1
        gate_ok[e["gate"]] = False
        if hits:
            ids = ", ".join(f"{p['id']} ({product_name(p)})" for p in hits)
            print(f"AMBIG    {e['env']}   -- {len(hits)} kandidati: {ids}. Archivuj nespravne v Stripe.")
        else:
            print(f"MISSING  {e['env']}   -- treba {amount_text(e)} {kind(e)}, eur, active, live")
            for p in same_amount:
                print(f"           blizko: {p['id']} ({product_name(p)}) -- {reject_reason(p, e)}")

    # Kupony: applies_to sa porovnava s ID produktu licencie, ktore je na cenach z manifestu.
    product_ids_by_name = {}
    for p in prices:
        if isinstance(p.get("product"), dict) and p["product"].get("id"):
            product_ids_by_name.setdefault(p["product"].get("name"), set()).add(p["product"]["id"])
    for c in coupons_manifest:
        product_ids = sorted(product_ids_by_name.get(c["applies_to_product"], []))
        named = [x for x in coupons if x.get("name") == c["name"]]
        hits = [x for x in named if coupon_reject_reason(x, c, product_ids) is None]
        label = f"-{c['percent_off']} % {c['duration']} redeem_by={c['redeem_by_iso']}"
        if len(hits) == 1:
            line = f"{c['env']}={hits[0]['id']}"
            ok_lines.append(line)
            print(f"OK       {line}   (kupon {label}, len produkt {c['applies_to_product']})")
            continue
        unresolved += 1
        gate_ok[c["gate"]] = False
        if hits:
            print(f"AMBIG    {c['env']}   -- {len(hits)} kupony: {', '.join(x['id'] for x in hits)}. Zmaz/archivuj nespravne.")
        else:
            print(f"MISSING  {c['env']}   -- treba kupon {label}, len produkt {c['applies_to_product']}")
            for x in named:
                print(f"           blizko: {x['id']} -- {coupon_reject_reason(x, c, product_ids)}")

    total = len(manifest) + len(coupons_manifest)
    print(f"\n{total - unresolved}/{total} resolved.  active prices seen: {len(prices)}  coupons seen: {len(coupons)}")
    for gate, label in GATES.items():
        if any(e["gate"] == gate for e in manifest):
            print(f"  {'OK ' if gate_ok[gate] else 'NIE'}  {gate:13s} {label}")

    if ok_lines:
        print("\n# Krok B - env patch (Vercel production), zapisuje founder:")
        for line in ok_lines:
            print(line)
    if gate_ok["seat"]:
        print("\nSeat brana kompletna -> krok B moze ist aj s ostatnymi MISSING.")
    else:
        print("\nSeat brana NEUPLNA -> krok C (STOP, samostatne GO). Co vytvorit: --spec")
    return 0 if unresolved == 0 else 1


def main(argv):
    manifest = load_manifest()
    coupons_manifest = load_coupons()
    if "--spec" in argv:
        print_spec(manifest, coupons_manifest)
        return 0
    if "--fixture" in argv:
        prices, coupons = fetch_fixture(argv[argv.index("--fixture") + 1])
        return verify(manifest, prices, coupons_manifest, coupons)

    key = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    if not key:
        print("Nastav STRIPE_SECRET_KEY (rk_live_... alebo sk_live_...) v env, nie ako argument.", file=sys.stderr)
        return 2
    if "_test_" in key:
        # Test mode vrati 0/N a zvadza k zaveru "ceny neexistuju" -> krok C.
        print("To je TEST kluc. VERIFY musi bezat proti LIVE modu (prod ho pouziva).", file=sys.stderr)
        return 2
    if not key.startswith(("sk_live_", "rk_live_")):
        print("Kluc nevyzera ako Stripe live kluc (sk_live_/rk_live_).", file=sys.stderr)
        return 2
    prices, coupons = fetch_live(key)
    return verify(manifest, prices, coupons_manifest, coupons)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
