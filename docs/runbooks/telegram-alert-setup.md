# Runbook: Telegram Founder Alert — setup

**Komponent:** `apps/crm/src/lib/alerts/`
**Architektúra:** `docs/architecture/founder-alert-adapter-v0.1.md`
**Kto to robí:** founder. Agent nemá prístup k BotFatherovi ani k secrets storu.

## Čo potrebuješ vytvoriť

### 1. Bot cez @BotFather

V Telegrame otvor [@BotFather](https://t.me/BotFather):

```
/newbot
→ názov:      Revolis Control
→ username:   <nieco>_revolis_bot      (musí končiť na "bot")
```

BotFather vráti token v tvare `123456789:AAH...`. **Je to credential, nie konfigurácia** —
kto ho má, ovláda bota. Nedávaj ho do chatu, do commitu ani do issue.

Odporúčané hneď po vytvorení:

```
/setprivacy  → Enable      (bot nevidí bežné správy v skupinách)
/setjoingroups → Disable   (ak bude písať len tebe)
```

### 2. Chat ID

Bot nemôže napísať prvý — musíš mu najprv poslať `/start` ty.

```bash
# po odoslaní /start botovi:
curl -s "https://api.telegram.org/bot<TOKEN>/getUpdates" | jq '.result[-1].message.chat.id'
```

Pre osobný chat je to kladné číslo, pre skupinu záporné (`-100…`).

### 3. Secrets

| premenná | kde | povinná |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Vercel → Project → Settings → Environment Variables | áno |
| `TELEGRAM_CHAT_ID` | to isté | áno |
| `SLACK_WEBHOOK_URL` | už existuje | nie (ak chceš aj Slack) |
| `ALERTS_MIN_SEVERITY` | voliteľné, default `WARNING` | nie |

Adaptér je **fail-safe**: keď premenné chýbajú, ticho neposiela a vráti
`reason: "not_configured"`. Nenakonfigurovaný kanál nikdy nezhodí volajúci kód.

## Overenie, že to funguje

```bash
curl -s -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id":"<CHAT_ID>","text":"Revolis Control — test"}'
```

Očakávanie: `{"ok":true,...}` a správa v Telegrame. Ak príde `{"ok":false,"error_code":403}`,
nespravil si botovi `/start`.

## Ako sa alert posiela z kódu

Agent **neposiela text**. Vytvorí typovaný event; Router rozhodne o doručení.

```ts
import { routeAlert } from "@/lib/alerts/router";

await routeAlert({
  type: "CI_FAILURE",
  severity: "CRITICAL",
  title: "main CI FAILED",
  agent: "executor",
  dedupKey: "ci:main",          // rovnaký incident = rovnaký kľúč
  actionRequired: true,
  fields: { PR: "#566", check: "Lint, test, build", commit: "9235643" },
  evidenceRef: "https://github.com/onlinovosk-bit/RealitkaAI/actions/runs/...",
});
```

Keď incident pominie, pošli ten istý `dedupKey` s `resolved: true` — prejde aj v tichom
intervale a zároveň incident uzavrie.

### Pravidlo obsahu (povinné)

`fields` je jediný voľný text, ktorý sa dostane k founderovi. Podľa `CLAUDE.md` §2 a §4:

- **patrí sem:** `task_id`, číslo PR, commit SHA, názov checku, stav brány
- **nepatrí sem:** meno referenčného klienta, PII, riadky z DB, telá e-mailov

Dôkaz sa odovzdáva cez `evidenceRef` (cesta alebo URL), **nikdy vložením obsahu**.
Text správy Router skladá z týchto polí — nepreberá hotový reťazec od volajúceho,
takže sa toto pravidlo nedá obísť omylom.

## Severity a čo sa reálne doručí

| úroveň | Slack | Telegram | default |
|---|---|---|---|
| 🟢 `INFO` | áno | nie | **ticho** |
| 🔵 `EVENT` | áno | nie | **ticho** |
| 🟠 `WARNING` | áno | áno | doručí sa |
| 🔴 `CRITICAL` | áno | áno | doručí sa |
| ⚫ `GOVERNANCE` | áno | áno | doručí sa |

`INFO` a `EVENT` sú štandardne tiché — zapneš ich cez `ALERTS_MIN_SEVERITY=INFO`.
Tiché okno na incident: 10 minút pre `CRITICAL`/`GOVERNANCE`, 30 minút pre `WARNING`,
60 minút pre zvyšok.

## Známe obmedzenie v0.1

Dedup drží v pamäti procesu. V serverless behu je pamäť per-inštancia, takže dva
súbežné lambda kontajnery môžu ten istý incident poslať dvakrát. Spoľahlivý dedup naprieč
inštanciami potrebuje zdieľané úložisko — to je nová DB tabuľka, teda migrácia, a tá je
mimo rozsahu v0.1. Vedený ako otvorený bod v architektúre.

## Bezpečnosť tokenu

- Token nikdy nie je v tele HTTP requestu — ide v URL path na `api.telegram.org`, a do logov
  sa z adaptéra nedostane (pri chybe sa loguje iba HTTP status, nie telo ani URL).
- Pri podozrení na únik: BotFather → `/revoke` → nový token → prepísať vo Verceli.
- Bot smie **iba posielať**. Prijímanie príkazov (webhook, polling) v v0.1 neexistuje zámerne —
  Telegram je jednosmerná siréna, nie ovládací kanál.
