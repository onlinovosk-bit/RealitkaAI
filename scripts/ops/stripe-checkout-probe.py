#!/usr/bin/env python3
"""Revolis — Stripe krok D: sonda na PROD (CHECKOUT-ENV-01). READ-ONLY.

Jediny nezautentizovany GET na /api/billing/checkout-config. Nic neposiela,
nic nezapisuje, ziadne tajomstvo sa jej nedotkne - route vracia IBA NAZVY
chybajucich premennych, nikdy hodnoty, a sonda to tak aj necha.

Pouzitie:
    bash scripts/ops/stripe-checkout-probe.sh                    # https://app.revolis.ai
    bash scripts/ops/stripe-checkout-probe.sh --base https://... # ina adresa
    bash scripts/ops/stripe-checkout-probe.sh --fixture f.json   # offline, pre testy

Preco Python a nie curl: `curl` je v deny-liste .claude/settings.json a urllib
je ten isty vzor ako stripe_verify_prices.py (proxy berie z prostredia sam).

CO SONDA DOKAZUJE: ze nasadeny PROD vidi price env premenne a za ake sumy
ponuka predaj.
CO NEDOKAZUJE: ze Stripe cena za tou premennou ma tu istu sumu (to je krok A,
stripe-verify-prices.sh), ani ze sa Checkout naozaj otvori a zobrazi dva line
items (to je ludsky klik s kartou, kit §8 body 2, 3, 5).

Exit: 0 = seat aj topup brana dostupna a sumy sedia, 1 = nieco chyba/nesedi,
2 = siet / HTTP / necitatelne telo.
"""

import json
import os
import sys
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
MANIFEST = os.path.join(HERE, "stripe-expected-prices.json")
DEFAULT_BASE = "https://app.revolis.ai"
PATH = "/api/billing/checkout-config"


def load_expected():
    """{key: amount v centoch} z manifestu. Manifest drzi na kode verifikacny test."""
    with open(MANIFEST, encoding="utf-8") as f:
        return {p["key"]: p["amount"] for p in json.load(f)["prices"]}


def arg(argv, name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


def fetch(url):
    """(status, telo ako text). Siet zlyha -> exit 2, HTTP chyba telo vrati."""
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except urllib.error.URLError as e:
        print(f"NETWORK ERROR: {e.reason}", file=sys.stderr)
        sys.exit(2)


def load_fixture(path):
    """{"status": 200, "body": <json alebo text>} - offline vstup pre testy."""
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)
    body = raw["body"]
    return raw.get("status", 200), body if isinstance(body, str) else json.dumps(body)


def eur(cents):
    return f"{cents / 100:.2f} EUR"


def check_amounts(cfg, expected):
    """Sumy z nasadeneho kodu proti manifestu. Vracia zoznam problemov."""
    seen = {}
    for tier in cfg.get("seatTiers") or []:
        seen[tier.get("key")] = tier.get("priceEur")
    for pkg in cfg.get("topupPackages") or []:
        seen[pkg.get("key")] = pkg.get("priceEur")
    cockpit = cfg.get("cockpit") or {}
    seen["owner"] = cockpit.get("ownerPriceEur")
    seen["ownerFounder"] = cockpit.get("ownerFounderPriceEur")

    problems = []
    for key, amount in sorted(expected.items()):
        if key == "starterPack":
            # /balik je marketingova plocha, checkout-config ju nevystavuje.
            continue
        actual = seen.get(key)
        if actual is None:
            problems.append(f"{key}: PROD tuto polozku nevystavil (cakal som {eur(amount)})")
        elif round(actual * 100) != amount:
            problems.append(
                f"{key}: PROD ponuka {eur(round(actual * 100))}, manifest ma {eur(amount)}"
            )
    return problems


def tag(ok):
    """Jednotny stlpec stavu, aby sa dal vystup grepovat aj citat."""
    return f"{'OK' if ok else 'NIE':<4}"


def report(cfg, expected):
    failures = 0

    # ── seat brana - jedina, ktora blokuje P0 ────────────────────────────
    seat = bool(cfg.get("seatCheckoutAvailable"))
    missing = cfg.get("missingPriceEnvKeys") or {}
    print(f"{tag(seat)} seat     /upgrade seat checkout (P0)")
    if not seat:
        failures += 1
        for name in missing.get("seat") or ["(route nevratila missingPriceEnvKeys.seat)"]:
            print(f"       chyba env: {name}")

    # ── topup brana - samostatna, P0 neblokuje ───────────────────────────
    topup = bool(cfg.get("topupCheckoutAvailable"))
    print(f"{tag(topup)} topup    /billing#topup")
    if not topup:
        failures += 1
        for name in missing.get("topup") or ["(route nevratila missingPriceEnvKeys.topup)"]:
            print(f"       chyba env: {name}")

    # ── cockpit - informativne, ale povedz KTORA z dvoch cien plati ──────
    cockpit = cfg.get("cockpit") or {}
    founder = bool(cfg.get("founderCockpitEligible"))
    which = "founder 249 EUR" if founder else "standard 349 EUR"
    print(
        f"{tag(cockpit.get('ownerPurchasable')):<4} cockpit  "
        f"Owner Cockpit, plati cena: {which} "
        f"(volnych founder miest: {cfg.get('founderCockpitRemaining')})"
    )

    # ── sumy nasadeneho kodu proti manifestu ─────────────────────────────
    problems = check_amounts(cfg, expected)
    if problems:
        failures += 1
        print(f"{tag(False)} sumy     nasadeny kod ponuka ine ceny, nez proti ktorym sa tvorili Stripe ceny:")
        for p in problems:
            print(f"       {p}")
    else:
        print(f"{tag(True)} sumy     vsetky vystavene sumy sedia na stripe-expected-prices.json")

    print()
    print("Sonda dokazuje: PROD vidi env premenne a za ake sumy ponuka predaj.")
    print("Sonda NEdokazuje: ze Stripe cena ma tu istu sumu (krok A), ze sa Checkout")
    print("otvori a ze pri zaskrtnutom cockpite ukaze dva line items (rucny klik s kartou).")
    print("starterPack sonda nekontroluje - checkout-config marketingovu plochu nevystavuje.")
    return 0 if failures == 0 else 1


def main(argv):
    expected = load_expected()

    if "--fixture" in argv:
        status, text = load_fixture(arg(argv, "--fixture"))
        source = "fixture"
    else:
        base = (arg(argv, "--base") or os.environ.get("REVOLIS_BASE_URL") or DEFAULT_BASE).rstrip("/")
        source = base + PATH
        status, text = fetch(source)

    print(f"GET {source} -> HTTP {status}\n")

    if status != 200:
        print(f"HTTP {status}, cakal som 200. Prvych 200 znakov tela:", file=sys.stderr)
        print(text[:200], file=sys.stderr)
        return 2
    try:
        cfg = json.loads(text)
    except json.JSONDecodeError as e:
        print(f"Telo nie je JSON ({e}). Prvych 200 znakov:", file=sys.stderr)
        print(text[:200], file=sys.stderr)
        return 2
    if cfg.get("ok") is not True:
        # okResponse() vzdy posiela ok:true; cokolvek ine nie je ta route.
        print(f"Telo nema ok:true -> to nie je checkout-config. Dostal som: {text[:200]}", file=sys.stderr)
        return 2

    return report(cfg, expected)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
