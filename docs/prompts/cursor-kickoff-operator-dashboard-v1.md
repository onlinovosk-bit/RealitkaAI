# CURSOR KICKOFF — Operator Dashboard v1

**Cieľová cesta:** `docs/prompts/cursor-kickoff-operator-dashboard-v1.md`
**Priložiť k zadaniu:** `build-package-operator-dashboard.md`,
`revolis-operator-dashboard.html`

---

Ulož priložené súbory: `build-package-operator-dashboard.md` →
`docs/briefs/overnight/`, `revolis-operator-dashboard.html` →
`docs/design/`. Sekciu PREMORTEM z balíka vyextrahuj do
`docs/premortems/2026-07-29-operator-dashboard.md`.

Potom implementuj **výhradne v1 scope** podľa Build Package. HTML mockup je
referencia pre štruktúru a názvy metrík — nie kód na skopírovanie; použi
existujúci dizajnový systém CRM (Tailwind + naše komponenty).

## KROK 0 — repo-first (povinné, nahlás nálezy pred implementáciou)
Nájdi a použi existujúce vzory, nevymýšľaj nové:
1. Ako sa dnes robí autorizácia a ochrana route (middleware, `proxy.ts`,
   `PUBLIC_PATHS`) — kde presne sa rozhoduje o prístupe.
2. Či na `profiles`/`agencies` existuje admin/platform príznak. Ak
   neexistuje, navrhni najmenšiu možnú zmenu (jeden boolean/enum) a
   ČAKAJ na moje GO — je to zmena schémy.
3. Vzor paralelného načítania sekcií — `dashboard-insights-gather.ts`
   (`Promise.all`) — použi ho.
4. Allowlist vzor z Guardiana (`GUARDIAN_AGENCY_ALLOWLIST`) — rovnaký
   princíp použi na vylúčenie systémových/demo tenantov.
5. Existujúci audit vzor (`integrity_alerts` alebo iný) — pre budúci
   drill-down v1.1 len zisti, nič nestavaj.

## V1 SCOPE — implementuj
- **F1 Attention feed** — zoradený podľa dopadu. Zdroje signálov: otvorené
  `guardian_findings` s pravidlom HOT_IGNORED/NO_OWNER, tenant bez
  spustenej kalkulačky (onboarding nedokončený), widget nedostupný
  (z heartbeat), prvý týždeň kampane ak je príznak.
- **F2 Tabuľka kancelárií** — stav, kontakty 7 d + celkom, trend 14 d
  (sparkline z denných počtov), podiel reakcií do 24 h, počet bez reakcie,
  won/lost z `deal_outcomes`, otvorené nálezy, kompozitné skóre zdravia
  (definuj váhy v kóde ako konštanty a zdokumentuj ich).
- **F4 Health strip** — stav widgetov, posledný beh strážcu a watchdogu,
  či je denný súhrn zapnutý.
- Route `/operator` mimo agency layoutu, za feature flagom.

## MIMO V1 SCOPE — NEIMPLEMENTUJ
F3 panel kampaní (Ads/GA4) · F5 drill-down do osobných údajov ·
akákoľvek nová tabuľka · akýkoľvek zápis do zákazníckych dát ·
metriky presnosti odhadov.

## NEPREROKOVATEĽNÉ (bezpečnosť — pri pochybnosti STOP a spýtaj sa)
1. Prístup výhradne pre platform-admin. Agency user aj anonym dostane
   **404**, nie 403 — existencia route sa neprezrádza.
2. Agregačné views/RPC vracajú **len počty a metriky per `agency_id`**.
   **Žiadny stĺpec s osobnými údajmi** (meno, email, telefón) sa
   z operátorských dotazov nevracia — ani „len na zobrazenie".
   Attention feed zobrazuje: kancelária + typ signálu + vek, NIE meno leadu.
3. Systémové/demo/sandbox tenanty sú vždy oddelené a mimo hodnotenia.
4. **`unavailable` ≠ `0`.** Ak metrika nemá dátový zdroj (napr. reakcia
   do 24 h pri prázdnych `lead_events`), zobraz „zatiaľ bez dát".
   Nikdy nezobraz vypočítanú nulu ako fakt.
5. Feature flag `OPERATOR_DASHBOARD_ENABLED`, default **false**.
6. Žiadny full-scan v request ceste — agregáty s indexmi, cieľ < 2 s.

## PRED-ROZHODNUTIA (neblokuj sa otázkami)
- Skóre zdravia: navrhni váhy sám, zdokumentuj ich v kóde a v reporte.
- Ak chýba platform-admin príznak: navrhni riešenie a STOP (schéma).
- Čokoľvek iné nejasné: konzervatívna voľba + zápis do ODCHÝLOK.

## ACCEPTANCE
- authz test: agency user → 404, platform-admin → 200
- test na výstupnej schéme agregátov: neobsahuje PII stĺpce
- izolačný test s 2 seed agentúrami: čísla sa nemiešajú
- test prázdnych dát: metriky bez zdroja hlásia „zatiaľ bez dát"
- systémový tenant vylúčený (fixture s demo agentúrou)
- výkon: seed 50 agentúr × 5 000 leadov → načítanie < 2 s
- CI + `brain:check` zelené · registrácia v brain registry ·
  `brain/decisions` záznam „operator dashboard = agregát-first"

## REPORT
ČO SA ZMENILO · KROK 0 nálezy (cesty) · váhy skóre zdravia ·
DÔKAZ (CI run, testy) · ODCHÝLKY · ČO ČAKÁ NA FOUNDERA.

Jeden branch + PR. **STOP po zelenej CI** — merge, zapnutie flagu aj
prípadná zmena schémy sú moje brány.
