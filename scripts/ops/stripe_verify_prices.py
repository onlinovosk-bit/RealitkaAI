#!/usr/bin/env python3
"""Revolis — Stripe VERIFY (CHECKOUT-ENV-01, krok A). READ-ONLY.

Iba GET /v1/prices. Nic nevytvara, nic nezapisuje.

Pouzitie:
    export STRIPE_SECRET_KEY=rk_live_...     # restricted key "Prices: Read" staci
    bash scripts/ops/stripe-verify-prices.sh
    bash scripts/ops/stripe-verify-prices.sh --spec    # co vytvorit v Stripe, bez kluca

Scope "Account: Read" je VOLITELNY. S nim VERIFY povie aj stav uctu (KYB,
krok B1) - charges_enabled/details_submitted/payouts_enabled. Bez neho Stripe
vrati 403 a VERIFY napise "nemerane" a pokracuje kontrolou cien. Nemerane nie
je OK: bez charges_enabled live checkout platbu NEPRIJME, aj keby desat cien
sedelo na cent.

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
}


def load_manifest():
    with open(MANIFEST, encoding="utf-8") as f:
        return json.load(f)["prices"]


def eur(cents):
    return f"{cents / 100:.2f} EUR"


def kind(entry):
    return "mesacne (recurring month)" if entry["type"] == "recurring" else "jednorazovo (one-time)"


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
        if rec.get("interval") != "month" or rec.get("interval_count", 1) != 1:
            return f"interval={rec.get('interval_count', 1)}x{rec.get('interval')}, treba 1x month"
        # Checkout posiela quantity = pocet maklerov; tiered/metered by zmenilo sumu.
        if rec.get("usage_type", "licensed") != "licensed":
            return f"usage_type={rec.get('usage_type')}, treba licensed"
    if price.get("billing_scheme", "per_unit") != "per_unit":
        return f"billing_scheme={price.get('billing_scheme')}, treba per_unit"
    product = price.get("product")
    if isinstance(product, dict) and not product.get("active", True):
        return "product.active=false"
    return None


def product_name(price):
    product = price.get("product")
    return product.get("name", "?") if isinstance(product, dict) else str(product)


def fetch_live(key):
    prices, cursor = [], None
    while True:
        params = [("active", "true"), ("limit", "100"), ("expand[]", "data.product")]
        if cursor:
            params.append(("starting_after", cursor))
        req = urllib.request.Request(
            "https://api.stripe.com/v1/prices?" + urllib.parse.urlencode(params),
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
        prices.extend(page["data"])
        if not page.get("has_more") or not page["data"]:
            return prices
        cursor = page["data"][-1]["id"]


ACCOUNT_FIELDS = ("charges_enabled", "details_submitted", "payouts_enabled")


def fetch_account(key):
    """Stav uctu (KYB). Vracia (data, None) alebo (None, dovod preco nemerane).

    403 je ocakavany stav, nie chyba: restricted kluc so scope "Prices: Read"
    na /v1/account nema pravo. VERIFY ma zmysel aj bez toho - len o ucte
    nepovie nic. 401 naopak znamena zly kluc a padne rovnako ako pri cenach.
    """
    req = urllib.request.Request(
        "https://api.stripe.com/v1/account",
        headers={"Authorization": f"Bearer {key}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.load(resp), None
    except urllib.error.HTTPError as e:
        if e.code == 403:
            return None, 'kluc nema scope "Account: Read" (HTTP 403)'
        try:
            msg = json.load(e).get("error", {}).get("message", "")
        except Exception:
            msg = ""
        print(f"STRIPE ERROR {e.code}: {msg}", file=sys.stderr)
        sys.exit(2)
    except urllib.error.URLError as e:
        print(f"NETWORK ERROR: {e.reason}", file=sys.stderr)
        sys.exit(2)


def print_account(account, note):
    """Vypise stav uctu a vrati True / False / None (= nemerane).

    None sa NIKDY nepocita ako OK a ani ako chyba - exit kod hybu iba merane
    fakty. Preto je ten riadok vo vystupe hlasny.
    """
    if account is None:
        print(f"UCET     nemerane -- {note}")
        return None
    flags = " ".join(f"{f}={str(bool(account.get(f))).lower()}" for f in ACCOUNT_FIELDS)
    charges = bool(account.get("charges_enabled"))
    print(f"{'UCET OK ' if charges else 'UCET NIE'} {flags}")
    if not charges:
        print("         Krok B1 (aktivacia/KYB) nie je hotovy. Ceny sa daju vytvorit,")
        print("         ale live checkout platbu NEPRIJME, kym charges_enabled nie je true.")
    print()
    return charges


def fetch_fixture(path):
    """Offline mod pre testy: {"pages": [<Stripe list objekt>, ...]}."""
    with open(path, encoding="utf-8") as f:
        pages = json.load(f)["pages"]
    return [p for page in pages for p in page["data"]]


def print_spec(manifest):
    print("Krok C - co vytvorit v Stripe Dashboard (LIVE mode). Vytvara founder, nie agent.\n")
    print("Kazda cena: currency EUR, Standard pricing (per unit), amount = presne co zakaznik")
    print("zaplati. Recurring = Monthly, interval 1.\n")
    print("DPH: tento kod neposiela automatic_tax ani tax_behavior, takze Stripe k sume NIC")
    print("nepripocita. Ako platca DPH mas DPH obsiahnutu v tejto sume. Zadaj presne cisla")
    print("nizsie - nie sumy bez DPH.\n")
    for gate, label in GATES.items():
        rows = [e for e in manifest if e["gate"] == gate]
        if not rows:
            continue
        print(f"[{gate}] {label}")
        for e in rows:
            print(f"  {e['env']:38s} {eur(e['amount']):>12s}  {kind(e):26s} produkt: {e['product']}")
        print()
    print("Potom znova spusti VERIFY - vypise riadky KLUC=price_... pre krok B.")


def verify(manifest, prices, charges_ok=None):
    ok_lines, unresolved, gate_ok = [], 0, {g: True for g in GATES}
    for e in manifest:
        same_amount = [p for p in prices if p.get("unit_amount") == e["amount"]]
        hits = [p for p in same_amount if reject_reason(p, e) is None]
        if len(hits) == 1:
            line = f"{e['env']}={hits[0]['id']}"
            ok_lines.append(line)
            print(f"OK       {line}   ({eur(e['amount'])} {kind(e)}, produkt: {product_name(hits[0])})")
            continue
        unresolved += 1
        gate_ok[e["gate"]] = False
        if hits:
            ids = ", ".join(f"{p['id']} ({product_name(p)})" for p in hits)
            print(f"AMBIG    {e['env']}   -- {len(hits)} kandidati: {ids}. Archivuj nespravne v Stripe.")
        else:
            print(f"MISSING  {e['env']}   -- treba {eur(e['amount'])} {kind(e)}, eur, active, live")
            for p in same_amount:
                print(f"           blizko: {p['id']} ({product_name(p)}) -- {reject_reason(p, e)}")

    total = len(manifest)
    print(f"\n{total - unresolved}/{total} resolved.  active prices seen: {len(prices)}")
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

    if charges_ok is False:
        print("Ucet NEUCTUJE -> aj kompletne ceny su nepredajne, kym nedobehne krok B1.")
    elif charges_ok is None:
        print("Stav uctu NEMERANY -> VERIFY nevie povedat, ci live checkout prijme platbu.")

    # Exit kod hybu iba merane fakty: nemerany ucet nie je dovod hlasit chybu,
    # ale ani dovod tvrdit, ze je vsetko v poriadku - od toho je riadok vyssie.
    return 0 if (unresolved == 0 and charges_ok is not False) else 1


def main(argv):
    manifest = load_manifest()
    if "--spec" in argv:
        print_spec(manifest)
        return 0
    if "--fixture" in argv:
        charges_ok = None
        if "--account-fixture" in argv:
            with open(argv[argv.index("--account-fixture") + 1], encoding="utf-8") as f:
                raw = json.load(f)
            charges_ok = print_account(raw.get("account"), raw.get("note"))
        return verify(manifest, fetch_fixture(argv[argv.index("--fixture") + 1]), charges_ok)

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
    # Ucet ide PRVY: ked neuctuje, je to zavaznejsie nez ktorakolvek chybajuca
    # cena - ale ceny sa aj tak dopocitaju, aby founder dostal oba fakty naraz.
    charges_ok = print_account(*fetch_account(key))
    return verify(manifest, fetch_live(key), charges_ok)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
