#!/usr/bin/env python3
"""Zaloz katalog Revolis v3 (cennik v3) v Stripe LIVE rezime. Spusta ho VYLUCNE founder (Andrej),
az PO merge PR "Cennik v3" - nikdy agent, nikdy skor.

Cennik v3 (GO foundera 2026-10-19): jeden produkt "Revolis licencia" s dvoma tiered (graduated)
cenami (mesacna a rocna, quantity = pocet maklerov), kupon akcie 9/12 (percent_off 25,
duration once, redeem_by 2026-12-31T22:59:59Z, len na produkt licencie), 6 balikov kreditov
na samostatnom produkte a jednorazovy kredit 0,75 EUR. Vsetko bez DPH, tax_behavior exclusive.

Predvolene je skript DRY-RUN:
  * bez argumentov        -- iba vypise plan (ziadna siet, ziadny kluc),
  * --inspect-account     -- precita ID uctu a ci je v live rezime (iba cita),
  * --apply               -- ZALOZI chybajuce produkty, ceny a kupon v LIVE rezime;
                             vyzaduje vsetky vedome potvrdenia naraz:
                             --yes-live --expect-account acct_... --plan-tax-code txcd_...
                             --credit-tax-code txcd_... --i-am-the-founder

Co skript nerobi nikdy: nemeni ani nedeaktivuje existujuce produkty, ceny, kupony,
zakaznikov ani predplatne; nenastavuje danove registracie; nezapisuje do Vercelu ani do
repozitara. Vytvara len to, co chyba.

Idempotencia: kazda cena ma `lookup_key`, kupon metadata `revolis_sku` + `pricing_version`.
Ked uz existuje a sedi s katalogom (vratane tiers a kuponu), skript ho preskoci; ked
existuje a NESEDI, zastavi sa a nic nemeni.

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

    def coupons(self):
        result = []
        params = {"limit": 100}
        while True:
            page = self.request("GET", "/coupons", params)
            result.extend(page["data"])
            if not page.get("has_more"):
                return result
            params["starting_after"] = page["data"][-1]["id"]


def get_live_key():
    return os.environ.get("STRIPE_LIVE_SECRET_KEY") or getpass.getpass("Stripe live kluc: ")


def plan(catalog):
    """Offline vypis (DRY-RUN): co by skript v LIVE rezime zalozil. Nepotrebuje kluc, nic nezapisuje."""
    items = catalog["items"]
    produkty = {x.get("product_sku", x["sku"]) for x in items}
    print(f"Katalog {catalog['catalog_version']}: {len(produkty)} produkty, {len(items)} cien, "
          f"{len(catalog['coupons'])} kupon, mena {catalog['currency'].upper()}, "
          f"tax_behavior {catalog['tax_behavior']}.")
    print("SKU | produkt | bez DPH EUR / tiers | vzor s 23 % DPH EUR | interval | lookup_key | env")
    for x in items:
        interval = x["recurring_interval"] or "jednorazovo"
        if x.get("billing_scheme") == "tiered":
            amount, gross = f"tiered graduated ({shared.tier_summary(x)})", "-"
        else:
            amount, gross = shared.eur(x["unit_amount_cents"]), shared.eur(x["gross_example_cents"])
        print(f"{x['sku']} | {x['name']} | {amount} | {gross} | {interval} | {x['lookup_key']} | {x['env_key']}")
    for c in catalog["coupons"]:
        print(f"{c['sku']} | kupon | -{c['percent_off']} % duration={c['duration']} "
              f"redeem_by={c['redeem_by_iso']} ({c['redeem_by']}) | len produkt {shared.LICENCE_PRODUCT_NAME} | {c['env_key']}")
    print("\nDRY-RUN: toto je iba plan. Nic sa neposlalo do Stripe. Zalozenie robi iba founder po merge: "
          "--apply s --yes-live, --expect-account, --plan-tax-code, --credit-tax-code a --i-am-the-founder.")


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
                raise ValueError(f"Dva v3 produkty s rovnakym SKU: {sku}")
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
            raise ValueError(f"Price pre {sku} existuje bez ocakavaneho v3 produktu.")
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

    def require_live(obj, what):
        if obj.get("livemode") is not True:
            raise ValueError(f"Stripe vytvoril {what} mimo live rezimu; zastavene.")

    ids.update(shared.ensure_coupons(stripe, catalog, known, "live:", require_live))

    print(f"\nHotovo. Novych objektov: {zalozene} (produkty a ceny; kupon sa hlasi riadkom vyssie).")
    if args.output:
        Path(args.output).write_text(json.dumps({
            "stripe_account": account["id"], "catalog_version": catalog["catalog_version"],
            "mode": "live", "price_ids": ids,
        }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Zoznam live Price ID: {args.output}")
    print("\nPremenne do Vercelu (Production). Price/kupon ID nie je tajomstvo, ale kluc ano:")
    for env_key, obj_id in ids.items():
        print(f"  {env_key}={obj_id}")
    print("Dalsi krok: bash scripts/ops/stripe-verify-prices.sh (live verify). Az ked su vsetky env nastavene "
          "vo Verceli, zapni PRICING_V2_ENABLED; PRICING_PUBLIC_ENABLED az neskor.")


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--inspect-account", action="store_true",
                       help="iba precitat ID a rezim live uctu")
    group.add_argument("--apply", action="store_true",
                       help="zalozit chybajuce produkty, ceny a kupon v LIVE rezime (inak je skript DRY-RUN)")
    parser.add_argument("--expect-account", help="pozadovane Stripe acct_...; povinne pri --apply")
    parser.add_argument("--plan-tax-code", help="potvrdeny Stripe Tax kod produktu pre plany")
    parser.add_argument("--credit-tax-code", help="potvrdeny Stripe Tax kod produktu pre kredity")
    parser.add_argument("--yes-live", action="store_true",
                        help="vedome potvrdenie, ze sa zapisuje do LIVE rezimu")
    parser.add_argument("--i-am-the-founder", action="store_true", dest="founder",
                        help="vedome potvrdenie, ze --apply spusta founder (Andrej) po merge PR")
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
            if not args.founder:
                parser.error("--i-am-the-founder je povinne: live katalog zaklada iba founder po merge")
            apply_live(catalog, args)
        else:
            plan(catalog)
    except (AssertionError, ValueError, RuntimeError, KeyError, OSError) as exc:
        print(f"CHYBA: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
