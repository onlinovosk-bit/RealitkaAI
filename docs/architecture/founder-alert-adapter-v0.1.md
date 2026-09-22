# Founder Alert Adapter v0.1 — Telegram ako výstupná siréna

**Stav:** `BUILD` — v0.1 implementovaná 2026-09-17, **v0.2 (zdroje alertov) implementovaná 2026-09-17**.
**Dátum:** 2026-09-17
**Zdroj:** founderov návrh v chate 2026-09-17. Pôvodne odložený („neimplementoval by som to ako ďalší veľký projekt teraz"), o niekoľko minút neskôr founder rozhodnutie **opravil**: *„opravujem, chcem telegram nasadiť hneď teraz."*
**Constitution gate:** pôvodné VETO `too early` **zrušené founderom**. Rozsah držaný malý (5 súborov, žiadna migrácia, žiadny nový cron) presne preto, aby to nebol „ďalší veľký projekt".
**Setup runbook:** `docs/runbooks/telegram-alert-setup.md`
**Kód:** `apps/crm/src/lib/alerts/`

## Princíp, na ktorom sa zhodujeme

Telegram **nie je BUS**. BUS zostáva interný mechanizmus medzi agentmi. Telegram je jednosmerná
výstupná vrstva k founderovi.

```
Agent → BUS EVENT → Alert Router → Policy → Telegram → Founder
```

Agent **neposiela** ľubovoľné správy. Vzniká typovaný event; až Router rozhodne, čo sa doručí.
Nikdy nie `Claude ↔ Telegram ↔ Claude`.

### Severity škála (founderov návrh, zachovaný)

| úroveň | doručiť | príklad |
|---|---|---|
| 🟢 INFO | voliteľne | task complete |
| 🔵 EVENT | nie vždy | PR merged |
| 🟠 WARNING | áno | retry, stale contract |
| 🔴 CRITICAL | okamžite | security, produkčné zlyhanie |
| ⚫ GOVERNANCE | okamžite | agent chce prekročiť Gate |

## FINDING — toto nie je greenfield

**V repe už existuje notification adapter a je zapojený.**

`apps/crm/src/lib/slack.js` — `sendSlackMessage(text)` cez `SLACK_WEBHOOK_URL`.

Volajú ho **štyri** miesta plus guard:

- `apps/crm/src/app/api/agents/competitor-watch/route.ts`
- `apps/crm/src/app/api/agents/social-scout/route.ts`
- `apps/crm/src/app/api/cron/night-watch/route.ts`
- `apps/crm/src/app/api/outreach/route.ts`
- `apps/crm/src/lib/revolis-guard.ts:87-89` (vlastný `fetch` na ten istý webhook, nie cez helper)

**Dôsledok pre v0.1:** problém nie je chýbajúci kanál. Problém je, že existujúci kanál je zapojený
**ad-hoc, bez severity, bez routera a bez dedup**. Postaviť Telegram rovnakým spôsobom by vyrobilo
druhý kanál s tým istým nedostatkom a dvojnásobnou údržbou.

Hodnota návrhu leží v **Alert Routeri a policy**, nie v tom, že kanál je Telegram. Router sa dá
postaviť raz a mať dva výstupy (Slack, Telegram), alebo Telegram Slack nahradí — to je otvorené
rozhodnutie nižšie.

## FINDING — dnes nie je čo alertovať

Founderov diagram má vetvu `Monitors` (Deploy · Links · Health) ako rovnocennú k `Executors`.
Takí monitori dnes **neexistujú**:

| čo by bolo monitorom | skutočný stav | dôkaz |
|---|---|---|
| nočná vlna (runner) | **vypnutá** 2026-09-17 06:51 UTC | `.ai/bus/decisions/DEC-20260917-002-operating-mode-b.md:17` |
| `schema-governance-guard` | cron **zakomentovaný** od 2026-06-17, iba `workflow_dispatch` | `.github/workflows/schema-governance-guard.yml:3-11` |
| `nightly-playwright` | beží `0 3 * * *`, má `if: failure()` vetvu | `.github/workflows/nightly-playwright.yml:4-5,108` |
| `brain-weekly-audit` | beží Po 05:00 UTC, **nesledovaný** — žiadny lokálny záznam behov | `.github/workflows/brain-weekly-audit.yml:7-10` |

Reálne periodické zdroje eventov sú teda dnes **dva** (`nightly-playwright`, `brain-weekly-audit`),
z toho jeden bez akéhokoľvek odberateľa výsledku.

**Dôsledok:** adaptér je hotový skôr než monitory, ktoré ho majú kŕmiť. To nie je chyba — kanál
musí existovať prv, než doň niekto začne písať — ale znamená to, že **v0.1 sama od seba nič
nepošle**. Prvý reálny prevádzkový alert príde až keď na Router napojíme existujúcich päť volaní
(bod 7 nižšie) alebo keď sa vráti runner.

## Otvorené otázky — stav po v0.1

1. **Slack alebo Telegram, alebo oba?** Ak oba, Router musí mať fan-out a jednotný event formát.
   Ak Telegram nahrádza Slack, je to migrácia piatich call sites, nie nový komponent.
2. **Kde žije Router a čo ho spúšťa?** Vercel cron má dnes otvorený problém: lokálny `CRON_SECRET`
   vracia v PROD `401` (`memory/open-tasks.md:63`). Bez vyriešenia tohto nemá Router spoľahlivý beh.
3. ~~**Dedup a cooldown.**~~ **VYRIEŠENÉ v v0.1** — `dedupKey` + tiché okno podľa severity
   + `resolved` správa, ktorá incident uzavrie. Obmedzenie: dedup drží v pamäti procesu, takže
   v serverless behu je per-inštancia. Spoľahlivý dedup naprieč inštanciami potrebuje zdieľané
   úložisko, teda migráciu — mimo rozsahu v0.1.
4. **Kde je uložený token.** GitHub Actions secrets, Vercel env, alebo oboje. Kto ho rotuje.
   Kto má bota môže bota ovládať — token je credential, nie konfigurácia.
5. ~~**Obsah alertu podlieha stealth pravidlu.**~~ **VYRIEŠENÉ v v0.1** — text správy sa **skladá**
   z whitelistovaných polí (`alerts/format.ts`), nepreberá sa hotový reťazec od volajúceho.
   Sanitizácia cudzieho textu je hra, ktorú obranca prehráva; skladanie z polí je hranica,
   ktorú nemožno obísť omylom. Dôkaz ide cez `evidenceRef` ako cesta alebo URL, nikdy ako obsah.
6. **Duplicita s GitHubom.** GitHub už notifikuje o CI a review. Prínos Telegramu je vo **filtri
   podľa severity**, nie v samotnom kanáli — inak vznikne tretí neprečítaný zdroj notifikácií.

## Event formát (founderov návrh, zachovaný ako východisko)

Founderov návrh:

```yaml
event:
  type: GOVERNANCE_ALERT
  severity: CRITICAL
  task_id: DEC-20260917-002
  agent: executor
  gate: GATE_1
  action_required: true
```

Implementované ako `AlertEvent` (`alerts/types.ts`), doplnené o `dedupKey`, `resolved`,
`fields` a `evidenceRef`. `task_id` a `gate` sa nesú vo `fields` — tým zostáva typ stabilný
a doménové kľúče voľné.

## Rozsah v0.1 — čo je hotové

| # | čo | stav | súbor |
|---|---|---|---|
| 1 | `AlertEvent` typ + severity + `dedupKey` + `resolved` + `evidenceRef` | **hotové** | `alerts/types.ts` |
| 2 | Policy: severity → kanály, prah `ALERTS_MIN_SEVERITY`, tiché okná | **hotové** | `alerts/policy.ts` |
| 3 | Skladanie správy z whitelistovaných polí + HTML escape | **hotové** | `alerts/format.ts` |
| 4 | Telegram Bot API výstup, fail-safe | **hotové** | `alerts/telegram.ts` |
| 5 | Router s fan-out na Slack + Telegram, dedup | **hotové** | `alerts/router.ts` |
| 6 | Testy (22), mutačne overené | **hotové** | `alerts/__tests__/alerts.test.ts` |
| 7 | Prepojiť existujúcich **päť** call sites na Router | **hotové (v0.2)** | viď nižšie |
| 8 | Nové monitory | **NEUROBENÉ** — závisí od runnera | — |

Router má fan-out zámerne: pokrýva všetky tri možné odpovede na otázku 1 nižšie bez prepisovania.
Telegram-only sa nastaví policy, nie zmenou kódu.

### v0.2 — čo migrácia piatich ciest naozaj našla

Bod 7 bol zadaný ako „prepísať volania na Router". Pri čítaní tých piatich miest
sa ukázalo, že **žiadne z nich nebolo iba zle zapojené** — každé posielalo von
niečo, čo tam nemalo byť. Migrácia na Router to nerieši ako vedľajší efekt:
Router skladá text z `fields`, takže hranicu drží až to, čo do `fields` vložíme.

| cesta | čo posielala von | po v0.2 |
|---|---|---|
| `outreach/route.ts` | **telefónne číslo leadu**, mesto a cenu — a jednu správu **na každý lead** | jeden agregovaný alert: počet + segment, odkaz do CRM |
| `agents/social-scout/route.ts` | **meno autora** zo sociálnej siete + jeho text + navrhovaný koncept odpovede | `leadId` + platforma, odkaz na lead |
| `lib/revolis-guard.ts` | **telo chybovej správy** (`error.message`) | typ chyby (`TypeError`, …); telo ostáva v server logu |
| `cron/night-watch/route.ts` | tri spočítané počty + vetu „príležitosti **v hodnote tisícov eur**" | tie isté tri počty; vymyslená hodnota odstránená |
| `agents/competitor-watch/route.ts` | alert „Cenový skok!" zostavený z **natvrdo napísaného poľa v kóde** | žiadny alert; endpoint vracia `state: "not_connected"` |

Tri z nich (telefón, meno autora, telo chyby) sú osobné údaje odchádzajúce do
externého kanála — `CLAUDE.md` §4. Dve (night-watch, competitor-watch) sú
vymyslené čísla — `CLAUDE.md` §4, „nikdy fake number".

**competitor-watch si zaslúži vetu navyše.** Pole `priceDrops` bolo literál
priamo v kóde (`Byt Centrum`, 155 000 → 149 000 €). Endpoint teda pri každom
zavolaní poslal founderovi alert o cenovom pohybe, ktorý sa nikdy nestal, a od
skutočného alertu sa nedal odlíšiť. Podľa
`docs/architecture/master-data-sourcing-map.md` (ZHLUK 5) zdroj pre pohyb cien
nie je pripojený a vyžaduje partnerstvo/API s portálom. Endpoint preto mlčí
a priznáva svoj stav.

### Zmena správania, ktorú treba vedieť

`night-watch` má teraz severity `EVENT`, nie `WARNING` — denná bilancia nie je
incident. Pri štandardnom prahu (`ALERTS_MIN_SEVERITY=WARNING`) sa preto
**nedoručí**. Kým sa posielala vždy, teraz ju zapína `ALERTS_MIN_SEVERITY=EVENT`.
Je to vedomé: ak má byť siréna počuť, nesmie hrať každú noc.

### Hranica vrstvy je odteraz vynútená testom

`lib/slack.js` bol zmazaný — nemal už žiadneho importéra a existoval len ako
obchádzka Routera. Dva testy v `alerts/__tests__/alert-sources.test.ts` prechádzajú
strom zdrojov a padnú, keď sa mimo `lib/alerts/` objaví `SLACK_WEBHOOK_URL`
alebo import `@/lib/slack`. Mutačne overené: umelo pridaný súbor s priamym
prístupom na webhook test zhodí.

### Čo v0.2 NEROBÍ

Dva reálne nálezy mimo územia tohto PR, vedené ako otvorené:

1. `social-scout/route.ts` zapisuje lead **bez `agency_id`**. Cesta je chránená
   HMAC podpisom, nie user session, takže agentúru nemá odkiaľ vziať — je to
   samostatná úloha, nie oprava v alertoch.
2. `cron/night-watch/route.ts` číta `leads` **bez tenant filtra**, takže počty
   sú naprieč agentúrami. To isté: samostatná úloha.

## Ďalší krok

1. **Founder:** vytvoriť bota a doplniť `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` do Vercelu
   podľa `docs/runbooks/telegram-alert-setup.md`. **Bez nich adaptér ticho neposiela** — po v0.2
   už zdroje existujú, takže toto je jediná vec, ktorá delí founderov telefón od prvého alertu.
2. **Founder rozhodne otázku 1** (Slack aj Telegram, alebo migrácia na Telegram). Kód je na oboje
   pripravený; mení sa len policy tabuľka v `alerts/policy.ts`.
3. **Otvorené (`GO REQUIRED`):** tenant scope pre `social-scout` insert a `night-watch` select
   — viď „Čo v0.2 NEROBÍ" vyššie.
