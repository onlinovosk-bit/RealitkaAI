#!/usr/bin/env python3
"""Zaloz katalog Revolis v2 v Stripe LIVE rezime. Spusta ho VYLUCNE founder.

Bod 10 zadania 2026-10-15: kampan stoji na 14-dnovom triale bez karty a na
cennikoch Start 25 / Team 60 / Kancelaria 149 / Siet od 349 EUR bez DPH.
Ceny musia v Stripe existovat skor, nez sa prvy klient dostane na /upgrade.

Co skript robi:
  * bez argumentov        -- iba vypise plan (ziadna siet, ziadny kluc),
  * --inspect-account     -- precita ID uctu a ci je v live rezime,
  * --apply               -- ZALOZI chybajuce produkty a ceny v LIVE rezime.

Co skript nerobi nikdy: nemeni ani nedeaktivuje existujuce produkty, ceny,
zakaznikov ani predplatne; nenastavuje danove registracie; nezapisuje do
Vercelu ani do repozitara. Vytvara len to, co chyba.

Idempotencia: kazda cena ma `lookup_key`. Ked uz existuje a sedi s katalogom,
skript ju preskoci; ked existuje a NESEDI, zastavi sa a nic nemeni.

Kluc sa necita z repozitara ani z argumentu (bol by v historii shellu):
berie sa z premennej STRIPE_LIVE_SECRET_KEY, inak sa pyta skryto.

Validaciu katalogu a tvar parametrov zdiela so `stripe_test_catalog.py`, aby
test aj live zakladali to iste; zo Stripe klienta toho skriptu sa nepouziva nic.
"""

import argparse
import base64
import getpass
import json
import os
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parent))
import stripe_test_catalog as shared  # noqa: E402  (ten isty katalog, ta ista validacia)

API = "https://api.stripe.com/v1"
LIVE_KEY_PREFIX = "sk_live_"


class StripeLive:
    """Minimalny klient. Prijme VYLUCNE live kluc; testovaci odmietne."""

    def __init__(self, key):
        if not key.startswith(LIVE_KEY_PREFIX):
            raise ValueError(
                "Odmietnute: tento skript pracuje vylucne s live klucom. "
                "Na testovaci rezim je stripe_test_catalog.py."
            )
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
            # Telo chyby zo Stripe neobsahuje kluc. Hlavicky sa nevypisuju nikdy.
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
        return self.request("GET", "/prices", {"lookup_keys[]": lookup_key, "limit": 100})["data"]


def get_live_key():
    return os.environ.get("STRIPE_LIVE_SECRET_KEY") or getpass.getpass("Stripe live kluc: ")


def plan(catalog):
    """Offline vypis: co by skript v LIVE rezime zalozil. Nepotrebuje kluc."""
    items = catalog["items"]
    produkty = [x for x in items if "product_sku" not in x]
    print(f"Katalog {catalog['catalog_version']}: {len(produkty)} produktov, {len(items)} cien, mena "
          f"{catalog['currency'].upper()}, tax_behavior {catalog['tax_behavior']}.")
    print("SKU | produkt | bez DPH EUR | vzor s 23 % DPH EUR | interval | lookup_key | env")
    for x in items:
        interval = x["recurring_interval"] or "jednorazovo"
        print(f"{x['sku']} | {x['name']} | {shared.eur(x['unit_amount_cents'])} | "
              f"{shared.eur(x['gross_example_cents'])} | {interval} | {x['lookup_key']} | {x['env_key']}")
    print("\nToto je iba plan. Nic sa neposlalo do Stripe. Zalozenie: --apply "
          "s --expect-account, --plan-tax-code, --credit-tax-code a --yes-live.")


def apply_live(catalog, args):
    stripe = StripeLive(get_live_key())
    account = stripe.account()
    if account["id"] != args.expect_account:
        raise ValueError(f"Iny Stripe ucet: {account['id']} (ocakavany {args.expect_account}).")
    if account.get("livemode") is not True:
        raise ValueError("Odmietnute: ucet nehlasi live rezim, a tento skript je urceny pre live.")
    if account.get("charges_enabled") is not True:
        raise ValueError("Odmietnute: ucet nema povolene platby (charges_enabled=false). "
                         "Najprv dokonci overenie uctu v Stripe.")
    print(f"Stripe live ucet: {account['id']} (charges_enabled=true)")

    known = {}
    for product in stripe.products():
        meta = product.get("metadata", {})
        if meta.get("pricing_version") == catalog["catalog_version"]:
            sku = meta.get("revolis_sku")
            if sku in known:
                raise ValueError(f"Dva v2 produkty s rovnakym SKU: {sku}")
            known[sku] = product

    ids = {}
    zalozene = 0
    for item in catalog["items"]:
        sku = item["sku"]
        code = args.plan_tax_code if item["tax_code_group"] == "plan" else args.credit_tax_code
        # Rocna cena je druha Price na produkte mesacneho planu, nie novy produkt.
        product_sku = item.get("product_sku", sku)
        product = known.get(product_sku)
        prices = stripe.prices_for(item["lookup_key"])
        if len(prices) > 1:
            raise ValueError(f"Nejednoznacny lookup_key: {item['lookup_key']}")
        price = prices[0] if prices else None
        if price and not product:
            raise ValueError(f"Price pre {sku} existuje bez ocakavaneho v2 produktu.")
        if not product and product_sku != sku:
            raise ValueError(f"Produkt {product_sku} pre rocnu cenu {sku} este neexistuje.")

        if not product:
            product = stripe.request(
                "POST", "/products", shared.product_params(item, code, catalog["catalog_version"]),
                f"live:{catalog['catalog_version']}:{sku}:product",
            )
            known[sku] = product
            zalozene += 1
        shared.check_existing(item, product, price, code, product_sku)
        if not price:
            price = stripe.request(
                "POST", "/prices", shared.price_params(item, product["id"], catalog["catalog_version"]),
                f"live:{catalog['catalog_version']}:{sku}:price",
            )
            shared.check_existing(item, product, price, code, product_sku)
            zalozene += 1
            stav = "zalozene"
        else:
            stav = "uz existovalo"
        ids[item["env_key"]] = price["id"]
        print(f"{sku}: {product['id']} / {price['id']} ({stav})")

    print(f"\nHotovo. Novych objektov: {zalozene}.")
    if args.output:
        Path(args.output).write_text(json.dumps({
            "stripe_account": account["id"], "catalog_version": catalog["catalog_version"],
            "mode": "live", "price_ids": ids,
        }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Zoznam live Price ID: {args.output}")
    print("\nPremenne do Vercelu (Production). Price ID nie je tajomstvo, ale kluc ano:")
    for env_key, price_id in ids.items():
        print(f"  {env_key}={price_id}")
    print("Az ked su vsetky nastavene, zapni PRICING_V2_ENABLED. Predtym cennik v2 necakaj v UI.")


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--inspect-account", action="store_true",
                       help="iba precitat ID a rezim live uctu")
    group.add_argument("--apply", action="store_true",
                       help="zalozit chybajuce produkty a ceny v LIVE rezime")
    parser.add_argument("--expect-account", help="pozadovane Stripe acct_...; povinne pri --apply")
    parser.add_argument("--plan-tax-code", help="potvrdeny Stripe Tax kod produktu pre plany")
    parser.add_argument("--credit-tax-code", help="potvrdeny Stripe Tax kod produktu pre kredity")
    parser.add_argument("--yes-live", action="store_true",
                        help="vedome potvrdenie, ze sa zapisuje do LIVE rezimu")
    parser.add_argument("--output", help="volitelny JSON subor s vyslednymi live Price ID")
    args = parser.parse_args()
    try:
        catalog = shared.validate()
        if args.inspect_account:
            account = StripeLive(get_live_key()).account()
            print(f"Stripe ucet: {account['id']} | livemode={account.get('livemode')} | "
                  f"charges_enabled={account.get('charges_enabled')}")
        elif args.apply:
            if not args.yes_live:
                parser.error("--yes-live je povinne: --apply zapisuje do LIVE rezimu")
            if not re.fullmatch(r"acct_[A-Za-z0-9]+", args.expect_account or ""):
                parser.error("--expect-account acct_... je povinny")
            for field in ("plan_tax_code", "credit_tax_code"):
                if not re.fullmatch(r"txcd_[0-9]{8}", getattr(args, field) or ""):
                    parser.error(f"--{field.replace('_', '-')} txcd_XXXXXXXX je povinny")
            apply_live(catalog, args)
        else:
            plan(catalog)
    except (AssertionError, ValueError, RuntimeError, KeyError, OSError) as exc:
        print(f"CHYBA: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
