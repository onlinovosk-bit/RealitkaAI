#!/usr/bin/env python3
"""Validate the Revolis v3 catalog and optionally create it in Stripe TEST mode.

Uses only Python's standard library. No command in this script can create live
Stripe objects. It deliberately does not configure tax registrations or update
existing customers, subscriptions, environment variables, or checkout code.

Katalog v3: jeden produkt "Revolis licencia" s dvoma tiered (graduated) cenami, kupon akcie 9/12,
balíky kreditov na samostatnom produkte a jednorazový kredit. Zápis iba v TEST režime
(--test-create + sk_test_ kľúč z env STRIPE_TEST_SECRET_KEY alebo skrytého promptu).
"""

import argparse
import base64
import calendar
from decimal import Decimal, ROUND_HALF_UP
import getpass
import json
import os
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


CATALOG_PATH = Path(__file__).with_name("revolis-stripe-v2-catalog.json")
API = "https://api.stripe.com/v1"
CATALOG_VERSION = "revolis_v3_2026_10_19"
# Termin akcie 9/12: 2026-12-31T22:59:59Z (= 23:59:59 Europe/Bratislava).
PROMO_REDEEM_BY = calendar.timegm((2026, 12, 31, 22, 59, 59))
assert PROMO_REDEEM_BY == 1798757999

# Tiers licencie (centy bez DPH). Zdroj pravdy: apps/crm/src/lib/pricing-v2.ts PRICING_V3_SEAT_TIERS;
# zhodu strazi apps/crm/tests/verification/stripe-v2-catalog.verification.test.ts.
# Tvar: (up_to, flat_amount, unit_amount); up_to "inf" = bez hornej hranice.
SEAT_TIERS = {
    "month": [(1, 3000, 0), (5, 4800, 0), (10, 0, 1080), (20, 0, 720), ("inf", 0, 600)],
    "year": [(1, 30000, 0), (5, 48000, 0), (10, 0, 10800), (20, 0, 7200), ("inf", 0, 6000)],
}
# sku -> (suma v centoch | None pre tiered, kredity | None)
EXPECTED = {
    "licence_month": (None, None),
    "licence_year": (None, None),
    "credits_50_month": (2600, 50),
    "credits_100_month": (5100, 100),
    "credits_150_month": (7400, 150),
    "credits_200_month": (9400, 200),
    "credits_250_month": (11400, 250),
    "credits_300_month": (13100, 300),
    "credit_unit_one_time": (75, 1),
}
LICENCE_PRODUCT_NAME = "Revolis licencia"


def tiers_of(item):
    return [(t["up_to"], t["flat_amount"], t["unit_amount"]) for t in item["tiers"]]


def graduated_cents(tiers, quantity):
    """Simulacia Stripe graduated pricing: flat sa pripocita raz, ked mnozstvo zasiahne tier; unit x kusy v tieri."""
    total, prev = 0, 0
    for up_to, flat, unit in tiers:
        top = float("inf") if up_to == "inf" else up_to
        in_tier = min(quantity, top) - prev
        if in_tier > 0:
            total += flat + unit * in_tier
        if quantity <= top:
            break
        prev = top
    return total


def validate():
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    assert catalog["catalog_version"] == CATALOG_VERSION
    assert catalog["currency"] == "eur"
    assert catalog["tax_behavior"] == "exclusive"
    assert catalog["gross_example_vat_rate_percent"] == 23
    items = catalog["items"]
    assert len(items) == len(EXPECTED)
    assert {x["sku"] for x in items} == set(EXPECTED)
    assert len({x["lookup_key"] for x in items}) == len(items)
    assert len({x["env_key"] for x in items}) == len(items)
    for x in items:
        sku = x["sku"]
        assert x["lookup_key"] == "revolis_v3_" + sku, sku
        assert x["env_key"].startswith("STRIPE_PRICE_V3_"), sku
        assert x["tax_code_group"] in ("plan", "credit"), sku
        # Zdielany produkt: Price s product_sku ukazuje na produkt prvej polozky a nesie jeho nazov.
        if "product_sku" in x:
            base = next(i for i in items if i["sku"] == x["product_sku"])
            assert "product_sku" not in base, sku
            assert base["name"] == x["name"], sku
            assert base["tax_code_group"] == x["tax_code_group"], sku
        if x["kind"] == "seat_license_tiered":
            interval = x["recurring_interval"]
            assert sku == "licence_" + interval, sku
            assert x["name"] == LICENCE_PRODUCT_NAME, sku
            assert x["billing_scheme"] == "tiered" and x["tiers_mode"] == "graduated", sku
            assert "unit_amount_cents" not in x, sku
            assert tiers_of(x) == SEAT_TIERS[interval], sku
        else:
            assert x["unit_amount_cents"] == EXPECTED[sku][0], sku
            credits = x.get("credits_per_cycle", x.get("credits_per_unit"))
            assert credits == EXPECTED[sku][1], sku
            gross = (Decimal(x["unit_amount_cents"]) * Decimal("1.23")).quantize(
                Decimal("1"), rounding=ROUND_HALF_UP
            )
            assert x["gross_example_cents"] == int(gross), sku
        if x["kind"] == "monthly_credit_addon":
            assert x["recurring_interval"] == "month", sku
        elif x["kind"] == "one_time_credit":
            assert sku == "credit_unit_one_time" and x["recurring_interval"] is None
    # Rocna licencia vs mesacna pri kazdom pocte makleru (rovnaky vztah ako licenseNetCents v pricing-v2.ts).
    for n in range(1, 61):
        # mesacna = zaklad x 1,2; rocna = 12 x zaklad = 10 x mesacna
        assert graduated_cents(SEAT_TIERS["year"], n) == 10 * graduated_cents(SEAT_TIERS["month"], n), n
    coupons = catalog["coupons"]
    assert len(coupons) == 1
    c = coupons[0]
    assert (c["sku"], c["percent_off"], c["duration"]) == ("annual_promo", 25, "once")
    assert c["redeem_by"] == PROMO_REDEEM_BY
    assert c["env_key"] == "STRIPE_COUPON_V3_ANNUAL_PROMO"
    base = next(i for i in items if i["sku"] == c["applies_to_product_sku"])
    assert base["name"] == LICENCE_PRODUCT_NAME and "product_sku" not in base
    return catalog


def eur(cents):
    return f"{Decimal(cents) / 100:.2f}"


def tier_summary(item):
    parts = []
    for up_to, flat, unit in tiers_of(item):
        what = f"flat {eur(flat)}" if flat else f"{eur(unit)}/ks"
        parts.append(f"do {up_to}: {what}")
    return "; ".join(parts)


def show(catalog):
    print("Licencia: Stripe graduated tiers (centy bez DPH), quantity = pocet maklerov")
    for x in catalog["items"]:
        if x["kind"] == "seat_license_tiered":
            print(f"{x['sku']} | {tier_summary(x)}")
    print("n | mesacne EUR | rocne EUR (bez DPH)")
    for n in (1, 2, 3, 5, 6, 10, 11, 20, 21, 30, 50):
        print(f"{n} | {eur(graduated_cents(SEAT_TIERS['month'], n))} | {eur(graduated_cents(SEAT_TIERS['year'], n))}")
    c = catalog["coupons"][0]
    print(f"\nKupon {c['sku']}: -{c['percent_off']} %, duration={c['duration']}, "
          f"redeem_by={c['redeem_by_iso']} ({c['redeem_by']}), len produkt {LICENCE_PRODUCT_NAME}")
    print("\nSKU | bez DPH EUR | vzor s 23 % DPH EUR | kredity | EUR/kredit")
    for x in catalog["items"]:
        if x["kind"] == "seat_license_tiered":
            continue
        credits = x.get("credits_per_cycle", x.get("credits_per_unit"))
        per_credit = Decimal(x["unit_amount_cents"]) / 100 / credits
        print(f"{x['sku']} | {eur(x['unit_amount_cents'])} | "
              f"{eur(x['gross_example_cents'])} | {credits} | {per_credit:.3f}")
    print("\nPríklad interného cieľa 70 % príspevkovej marže pri plnom využití:")
    for x in catalog["items"]:
        if x["kind"] == "seat_license_tiered":
            continue
        credits = x.get("credits_per_cycle", x.get("credits_per_unit"))
        budget = Decimal(x["unit_amount_cents"]) / 100 * Decimal("0.30")
        print(f"  {x['sku']}: celkové priame náklady najviac {budget:.3f} EUR; "
              f"pri plnom využití najviac {budget / credits:.4f} EUR/kredit "
              "vrátane ostatných priamych nákladov")
    print("Toto sú limity, nie namerané náklady ani potvrdená marža.")


class StripeTest:
    def __init__(self, key):
        if not key.startswith("sk_test_"):
            raise ValueError("Odmietnuté: vyžaduje sa výlučne sk_test_ kľúč.")
        self.auth = "Basic " + base64.b64encode((key + ":").encode()).decode()

    def request(self, method, path, params=None, idempotency=None):
        params = params or {}
        url = API + path
        data = None
        if method == "GET" and params:
            url += "?" + urlencode(params)
        elif method == "POST":
            data = urlencode(params).encode("utf-8")
        headers = {"Authorization": self.auth, "Content-Type": "application/x-www-form-urlencoded"}
        if idempotency:
            headers["Idempotency-Key"] = idempotency
        try:
            with urlopen(Request(url, data=data, headers=headers, method=method), timeout=30) as resp:
                return json.load(resp)
        except HTTPError as exc:
            # Stripe API error bodies do not contain the secret key. Never print request headers.
            try:
                detail = json.load(exc).get("error", {}).get("message", "Stripe API error")
            except (ValueError, OSError):
                detail = "Stripe API error"
            raise RuntimeError(f"Stripe HTTP {exc.code}: {detail}") from None
        except URLError as exc:
            raise RuntimeError(f"Stripe spojenie zlyhalo: {exc.reason}") from None

    def account(self):
        return self.request("GET", "/account")

    def products(self):
        result = []
        params = {"limit": 100}
        while True:
            page = self.request("GET", "/products", params)
            result.extend(page["data"])
            if not page.get("has_more"):
                return result
            params["starting_after"] = page["data"][-1]["id"]

    def prices_for(self, lookup_key):
        response = self.request("GET", "/prices", {"lookup_keys[]": lookup_key, "limit": 100})
        return response["data"]

    def coupons(self):
        result = []
        params = {"limit": 100}
        while True:
            page = self.request("GET", "/coupons", params)
            result.extend(page["data"])
            if not page.get("has_more"):
                return result
            params["starting_after"] = page["data"][-1]["id"]


def product_params(item, tax_code, version):
    params = {
        "name": item["name"],
        "description": item["description"],
        "tax_code": tax_code,
        "metadata[revolis_sku]": item["sku"],
        "metadata[pricing_version]": version,
        "metadata[kind]": item["kind"],
    }
    # Kredity su vlastnostou Price (baliky zdielaju jeden produkt), nie produktu.
    return params


def price_params(item, product_id, version):
    params = {
        "product": product_id,
        "currency": "eur",
        "tax_behavior": "exclusive",
        "lookup_key": item["lookup_key"],
        "nickname": item["sku"] + " | " + version,
        "metadata[revolis_sku]": item["sku"],
        "metadata[pricing_version]": version,
        "metadata[kind]": item["kind"],
    }
    if item.get("billing_scheme") == "tiered":
        # quantity = pocet maklerov; Stripe pripocita flat_amount raz, ked mnozstvo zasiahne dany tier.
        params["billing_scheme"] = "tiered"
        params["tiers_mode"] = item["tiers_mode"]
        for i, (up_to, flat, unit) in enumerate(tiers_of(item)):
            params[f"tiers[{i}][up_to]"] = str(up_to)
            params[f"tiers[{i}][flat_amount]"] = flat
            params[f"tiers[{i}][unit_amount]"] = unit
    else:
        params["unit_amount"] = item["unit_amount_cents"]
    if item["recurring_interval"]:
        params["recurring[interval]"] = item["recurring_interval"]
    credits = item.get("credits_per_cycle", item.get("credits_per_unit"))
    if credits is not None:
        params["metadata[credits]"] = str(credits)
    return params


def normalize_tiers(price):
    """Tiers zo Stripe odpovede na tvar katalogu: up_to null -> "inf", chybajuce sumy -> 0."""
    return [("inf" if t.get("up_to") is None else t["up_to"], t.get("flat_amount") or 0, t.get("unit_amount") or 0)
            for t in price.get("tiers") or []]


def check_existing(item, product, price, tax_code, product_sku=None):
    product_sku = product_sku or item["sku"]
    if (product.get("metadata", {}).get("revolis_sku") != product_sku or
            product.get("name") != item["name"] or product.get("tax_code") != tax_code):
        raise ValueError(f"Produkt {product_sku} sa nezhoduje s katalógom alebo daňovým kódom.")
    if price is None:
        return
    interval = (price.get("recurring") or {}).get("interval")
    tiered = item.get("billing_scheme") == "tiered"
    actual = (price.get("currency"), None if tiered else price.get("unit_amount"),
              price.get("tax_behavior"), interval, price.get("product"),
              price.get("metadata", {}).get("revolis_sku"), price.get("active"),
              price.get("billing_scheme", "per_unit"),
              price.get("tiers_mode") if tiered else None,
              normalize_tiers(price) if tiered else [])
    expected = ("eur", None if tiered else item["unit_amount_cents"], "exclusive",
                item["recurring_interval"], product["id"], item["sku"], True,
                "tiered" if tiered else "per_unit",
                item["tiers_mode"] if tiered else None,
                tiers_of(item) if tiered else [])
    if actual != expected:
        raise ValueError(f"Price {item['sku']} existuje, ale parametre nesedia: {actual}")


def coupon_params(coupon, product_id, version):
    """Kupon akcie 9/12: percent_off, duration=once, redeem_by, len na produkt licencie."""
    return {
        "name": coupon["name"],
        "percent_off": coupon["percent_off"],
        "duration": coupon["duration"],
        "redeem_by": coupon["redeem_by"],
        "applies_to[products][0]": product_id,
        "metadata[revolis_sku]": coupon["sku"],
        "metadata[pricing_version]": version,
    }


def find_coupon(coupons, coupon, version):
    """Kupon z tohto katalogu podla metadata (idempotencia); viac zhod = chyba."""
    found = [c for c in coupons if c.get("metadata", {}).get("revolis_sku") == coupon["sku"]
             and c.get("metadata", {}).get("pricing_version") == version]
    if len(found) > 1:
        raise ValueError(f"Viac kuponov {coupon['sku']} v tejto verzii katalogu.")
    return found[0] if found else None


def check_existing_coupon(coupon, found, product_id):
    products = (found.get("applies_to") or {}).get("products") or []
    actual = (found.get("percent_off"), found.get("amount_off"), found.get("duration"),
              found.get("redeem_by"), products)
    expected = (coupon["percent_off"], None, coupon["duration"], coupon["redeem_by"], [product_id])
    if actual != expected:
        raise ValueError(f"Kupon {coupon['sku']} existuje, ale parametre nesedia: {actual}")


def ensure_coupons(stripe, catalog, known, idempotency_prefix, livemode_error):
    """Zalozi chybajuci kupon (alebo overi existujuci). Spolocne pre test aj live; vrati {env_key: coupon_id}."""
    ids = {}
    existing = stripe.coupons()
    for coupon in catalog["coupons"]:
        product = known[coupon["applies_to_product_sku"]]
        found = find_coupon(existing, coupon, catalog["catalog_version"])
        if found is None:
            found = stripe.request(
                "POST", "/coupons", coupon_params(coupon, product["id"], catalog["catalog_version"]),
                f"{idempotency_prefix}{catalog['catalog_version']}:{coupon['sku']}:coupon",
            )
            livemode_error(found, "kupon")
        check_existing_coupon(coupon, found, product["id"])
        ids[coupon["env_key"]] = found["id"]
        print(f"{coupon['sku']}: {found['id']}")
    return ids


def create_test_catalog(catalog, args):
    key = get_test_key()
    stripe = StripeTest(key)
    account = stripe.account()
    if account["id"] != args.expect_account:
        raise ValueError(f"Iný Stripe účet: {account['id']} (očakávaný {args.expect_account}).")
    if account.get("livemode") is True:
        raise ValueError("Odmietnuté: odpoveď Stripe hlási livemode.")
    print(f"Stripe testovací účet: {account['id']}")
    known = {}
    for product in stripe.products():
        if product.get("metadata", {}).get("pricing_version") == catalog["catalog_version"]:
            sku = product.get("metadata", {}).get("revolis_sku")
            if sku in known:
                raise ValueError(f"Dva v3 produkty s rovnakým SKU: {sku}")
            known[sku] = product
    ids = {}
    for item in catalog["items"]:
        sku = item["sku"]
        code = args.plan_tax_code if item["tax_code_group"] == "plan" else args.credit_tax_code
        # Rocna cena je druha Price na produkte mesacneho planu (nezaklada sa druhy produkt).
        product_sku = item.get("product_sku", sku)
        product = known.get(product_sku)
        prices = stripe.prices_for(item["lookup_key"])
        if len(prices) > 1:
            raise ValueError(f"Nejednoznačný lookup_key: {item['lookup_key']}")
        price = prices[0] if prices else None
        if price and not product:
            raise ValueError(f"Price pre {sku} existuje bez očakávaného v3 produktu.")
        if not product and product_sku != sku:
            raise ValueError(f"Produkt {product_sku} pre rocnu cenu {sku} este neexistuje (poradie polozok v katalogu).")
        if not product:
            product = stripe.request(
                "POST", "/products", product_params(item, code, catalog["catalog_version"]),
                f"{catalog['catalog_version']}:{sku}:product",
            )
            if product.get("livemode") is True:
                raise ValueError("Stripe vytvoril produkt v live režime; zastavené.")
            known[sku] = product
        check_existing(item, product, price, code, product_sku)
        if not price:
            price = stripe.request(
                "POST", "/prices", price_params(item, product["id"], catalog["catalog_version"]),
                f"{catalog['catalog_version']}:{sku}:price",
            )
            if price.get("livemode") is True:
                raise ValueError("Stripe vytvoril cenu v live režime; zastavené.")
            check_existing(item, product, price, code, product_sku)
        ids[item["env_key"]] = price["id"]
        print(f"{sku}: {product['id']} / {price['id']}")

    def refuse_live(obj, what):
        if obj.get("livemode") is True:
            raise ValueError(f"Stripe vytvoril {what} v live režime; zastavené.")

    ids.update(ensure_coupons(stripe, catalog, known, "", refuse_live))
    if args.output:
        Path(args.output).write_text(json.dumps({
            "stripe_account": account["id"], "catalog_version": catalog["catalog_version"],
            "mode": "test", "price_ids": ids,
        }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Zoznam testovacích Price ID: {args.output}")


def get_test_key():
    return os.environ.get("STRIPE_TEST_SECRET_KEY") or getpass.getpass("Stripe sk_test_ kľúč: ")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--inspect-account", action="store_true", help="iba prečítať ID testovacieho Stripe účtu")
    group.add_argument("--test-create", action="store_true", help="vytvoriť produkty, ceny a kupón výlučne v test režime")
    parser.add_argument("--expect-account", help="požadované Stripe acct_...; povinné pri zápise")
    parser.add_argument("--plan-tax-code", help="potvrdený Stripe Tax kód produktu pre plány")
    parser.add_argument("--credit-tax-code", help="potvrdený Stripe Tax kód produktu pre kredity")
    parser.add_argument("--output", help="voliteľný JSON súbor s výslednými testovacími Price ID")
    args = parser.parse_args()
    try:
        catalog = validate()
        if args.inspect_account:
            stripe = StripeTest(get_test_key())
            account = stripe.account()
            if account.get("livemode") is True:
                raise ValueError("Odmietnuté: účet je v live režime.")
            print(f"Testovací Stripe účet: {account['id']}")
        elif args.test_create:
            if not re.fullmatch(r"acct_[A-Za-z0-9]+", args.expect_account or ""):
                parser.error("--expect-account acct_... je povinný")
            for field in ("plan_tax_code", "credit_tax_code"):
                if not re.fullmatch(r"txcd_[0-9]{8}", getattr(args, field) or ""):
                    parser.error(f"--{field.replace('_', '-')} txcd_XXXXXXXX je povinný")
            create_test_catalog(catalog, args)
        else:
            show(catalog)
    except (AssertionError, ValueError, RuntimeError, KeyError, OSError) as exc:
        print(f"CHYBA: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
