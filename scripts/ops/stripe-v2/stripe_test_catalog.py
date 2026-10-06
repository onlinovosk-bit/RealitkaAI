#!/usr/bin/env python3
"""Validate the Revolis v2 catalog and optionally create it in Stripe TEST mode.

Uses only Python's standard library. No command in this script can create live
Stripe objects. It deliberately does not configure tax registrations or update
existing customers, subscriptions, environment variables, or checkout code.
"""

import argparse
import base64
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
EXPECTED = {
    "start_month": (2500, 20, 1, 1),
    "team_month": (6000, 50, 2, 6),
    "office_month": (14900, 100, 7, 25),
    "network_month": (34900, 150, 26, None),
    # Rocne ceny planov: 12 x mesacna, druha Price na tom istom produkte (interval year).
    "start_year": (30000, 20, 1, 1),
    "team_year": (72000, 50, 2, 6),
    "office_year": (178800, 100, 7, 25),
    "network_year": (418800, 150, 26, None),
    "credits_60_month": (3400, 60),
    "credits_120_month": (6200, 120),
    "credits_180_month": (8600, 180),
    "credits_240_month": (10800, 240),
    "credits_300_month": (12900, 300),
    "credit_unit_one_time": (70, 1),
}


def validate():
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    assert catalog["catalog_version"] == "revolis_v2_2026_10_06"
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
        assert x["unit_amount_cents"] == EXPECTED[sku][0], sku
        credits = x.get("credits_per_cycle", x.get("credits_per_unit"))
        assert credits == EXPECTED[sku][1], sku
        assert x["lookup_key"] == "revolis_v2_" + sku, sku
        assert x["env_key"].startswith("STRIPE_PRICE_V2_"), sku
        assert x["tax_code_group"] in ("plan", "credit"), sku
        gross = (Decimal(x["unit_amount_cents"]) * Decimal("1.23")).quantize(
            Decimal("1"), rounding=ROUND_HALF_UP
        )
        assert x["gross_example_cents"] == int(gross), sku
        if x["kind"] == "base_plan":
            assert x["recurring_interval"] == "month", sku
            assert (x["seat_min"], x["seat_max"]) == EXPECTED[sku][2:], sku
        elif x["kind"] == "base_plan_yearly":
            assert x["recurring_interval"] == "year", sku
            base = next(i for i in items if i["sku"] == x["product_sku"])
            assert base["kind"] == "base_plan", sku
            # 12 x mesacna cena, bez zlavy; rovnake pasmo a kredity ako mesacny plan
            assert x["unit_amount_cents"] == base["unit_amount_cents"] * 12, sku
            assert (x["seat_min"], x["seat_max"]) == EXPECTED[sku][2:], sku
            assert x["credits_per_cycle"] == base["credits_per_cycle"], sku
        elif x["kind"] == "monthly_credit_addon":
            assert x["recurring_interval"] == "month", sku
        else:
            assert sku == "credit_unit_one_time" and x["recurring_interval"] is None
    return catalog


def eur(cents):
    return f"{Decimal(cents) / 100:.2f}"


def show(catalog):
    print("SKU | bez DPH EUR | vzor s 23 % DPH EUR | kredity | EUR/kredit")
    for x in catalog["items"]:
        credits = x.get("credits_per_cycle", x.get("credits_per_unit"))
        # Ročná cena pokrýva 12 mesačných grantov, takže cena za kredit sa počíta zo všetkých 12 mesiacov.
        if x.get("recurring_interval") == "year":
            credits = credits * 12
        per_credit = Decimal(x["unit_amount_cents"]) / 100 / credits
        print(f"{x['sku']} | {eur(x['unit_amount_cents'])} | "
              f"{eur(x['gross_example_cents'])} | {credits} | {per_credit:.3f}")
    print("\nPríklad interného cieľa 70 % príspevkovej marže pri plnom využití:")
    for x in catalog["items"]:
        credits = x.get("credits_per_cycle", x.get("credits_per_unit"))
        if x.get("recurring_interval") == "year":
            credits = credits * 12
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


def product_params(item, tax_code, version):
    params = {
        "name": item["name"],
        "description": item["description"],
        "tax_code": tax_code,
        "metadata[revolis_sku]": item["sku"],
        "metadata[pricing_version]": version,
        "metadata[kind]": item["kind"],
    }
    if "credits_per_cycle" in item:
        params["metadata[credits_per_cycle]"] = str(item["credits_per_cycle"])
    if item["kind"] == "base_plan":
        params["metadata[seat_min]"] = str(item["seat_min"])
        if item["seat_max"] is not None:
            params["metadata[seat_max]"] = str(item["seat_max"])
    return params


def price_params(item, product_id, version):
    params = {
        "product": product_id,
        "currency": "eur",
        "unit_amount": item["unit_amount_cents"],
        "tax_behavior": "exclusive",
        "lookup_key": item["lookup_key"],
        "nickname": item["sku"] + " | " + version,
        "metadata[revolis_sku]": item["sku"],
        "metadata[pricing_version]": version,
        "metadata[kind]": item["kind"],
    }
    if item["recurring_interval"]:
        params["recurring[interval]"] = item["recurring_interval"]
    credits = item.get("credits_per_cycle", item.get("credits_per_unit"))
    params["metadata[credits]"] = str(credits)
    return params


def check_existing(item, product, price, tax_code, product_sku=None):
    product_sku = product_sku or item["sku"]
    if (product.get("metadata", {}).get("revolis_sku") != product_sku or
            product.get("name") != item["name"] or product.get("tax_code") != tax_code):
        raise ValueError(f"Produkt {product_sku} sa nezhoduje s katalógom alebo daňovým kódom.")
    if price is None:
        return
    interval = (price.get("recurring") or {}).get("interval")
    actual = (price.get("currency"), price.get("unit_amount"),
              price.get("tax_behavior"), interval, price.get("product"),
              price.get("metadata", {}).get("revolis_sku"), price.get("active"))
    expected = ("eur", item["unit_amount_cents"], "exclusive",
                item["recurring_interval"], product["id"], item["sku"], True)
    if actual != expected:
        raise ValueError(f"Price {item['sku']} existuje, ale parametre nesedia: {actual}")


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
                raise ValueError(f"Dva v2 produkty s rovnakým SKU: {sku}")
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
            raise ValueError(f"Price pre {sku} existuje bez očakávaného v2 produktu.")
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
    group.add_argument("--test-create", action="store_true", help="vytvoriť 10 produktov a cien výlučne v test režime")
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
