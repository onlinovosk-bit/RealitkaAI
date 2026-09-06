---
id: ONL-MCP-001
title: Onlinovo MCP Gateway — feasibility audit
status: STOP (feasibility only; no implementation)
created: 2026-08-25
owner: founder
verdict: BUILD (own gateway) + DON'T BUY Premium solely for official MCP
related:
  - docs/reports/2026-08-25-onl-mcp-001-feasibility.md
  - .ai/bus/tasks/TASK-0005.md
---

# ONL-MCP-001 — Onlinovo MCP Gateway feasibility

> **Táto noc (25. 8. 2026):** founder override kalendára 26.→27. 8. Audit ide **dnes**. Revolis nočná vlna je agent-STOP (PRs mimo tejto vetvy). Tento PR **neimplementuje** gateway, **nezapisuje** do Shoptet prod, **nemení** `apps/crm`.
>
> Každé tvrdenie je **FAKT** / **PREDPOKLAD** / **NEZNÁME**. Neoznačené tvrdenie = chyba.

---

## 0. Verdikt (jedna strana)

| Otázka | Odpoveď |
|---|---|
| **BUILD / BUY / DON'T BUILD** | **BUILD** vlastný vendor-neutral MCP Gateway pre Onlinovo. |
| Kúpiť Shoptet Premium **len kvôli oficiálnemu MCP**? | **DON'T BUY.** Oficiálny MCP je zadarmo len na Premium; Premium floor je **12 000 Kč/měs. bez DPH** ([shoptet.cz/cenik](https://www.shoptet.cz/cenik/)). To nie je cena za MCP — je to iná platforma. |
| Ak Onlinovo **už je** Premium? | **BUY (nainštalovať oficiálny MCP, 0 Kč prírastok) + stále BUILD** gateway. Oficiálny MCP je Shoptet-only, bez Onlinovo audit logu, bez GA4/GSC/LeadHub/P&L, bez approval kernelu. |
| Path D (browser) ako primár? | **DON'T BUILD.** Fallback, nie architektúra. |
| Community MCP (`tomkalina/shoptet-mcp`) ako primár? | **DON'T BUILD.** Neoficiálne; token v env; nie ToS-safe. |
| Implementovať gateway v tomto PR? | **NIE. STOP.** Ďalší kód až po `GO ONL-MCP-002` a po potvrdení tarifu. |
| ONL-MCP-002 / 003 / 004? | **Neštartovať**, kým tento verdikt founder prijme. |

**Prečo BUILD, nie BUY:** Onlinovo potrebuje **jednu bránu** pre Ruffo + ľudský chat + neskôr akcie s ľudským schválením. Oficiálny Shoptet MCP rieši len Shoptet admin chat a viaže sa na Premium. REST API na štandardnom tarife ide **len cez schválený addon** — a Shoptet explicitne nepíše cestu „súkromné API pre jeden e-shop bez marketplace“.

**Čo musí founder povedať pred kódom (STOP-AND-ASK):**

1. Je Onlinovo **Premium**, alebo **štandardný tarif** (Basic/Business/Profi/Enterprise)? Verejný web dokazuje Shoptet, **nie** tarif.
2. Aký je **reálny** mesačný náklad Premium vs dnešný tarif (zmluva, nie blog)?
3. Aký je **mesačný príspevok na krytie** (contribution), nie tržba — inak ROI ostane citlivosť, nie číslo.

---

## 1. Účel, rozsah, STOP

**Účel:** rozhodnúť, či Onlinovo stavia vlastný MCP gateway, kupuje Shoptet Premium kvôli oficiálnemu MCP, alebo nestavia nič.

**V rozsahu:** štyri cesty (A oficiálny MCP, B vlastný addon+API, C export/feed, D browser), TCO 1r+3r, ROI na contribution, security, vendor-neutral architektúra, verdikt, MVP plán.

**Mimo rozsahu (tento PR):** produkčný gateway, Shoptet zápisy, secrets v repe, zmeny Revolis CRM, merge, ONL-MCP-002+.

**DONE tohoto auditu:** tento súbor v repe + report + bus result + draft PR + STOP.

---

## 2. Protokol dôkazu

| Nálepka | Význam |
|---|---|
| **FAKT** | Overené z aktuálnej oficiálnej dokumentácie, HTTP odpovede, alebo git. Zdroj v zátvorke. |
| **PREDPOKLAD** | Explicitný model (kurz, hodiny, hosting). Nesmie sa tváriť ako zmluva Onlinova. |
| **NEZNÁME** | Chýba dôkaz. Rozhodnutie sa na tom nesmie stavať ako na istej veci. |

Kontrolór (10 bodov) je v §16. Engineering Constitution: tento PR je **dokumentácia**, nie runtime modul — žiadny nový npm/komponent.

---

## 3. Onlinovo.sk — čo je overené o platforme

### FAKT — je to Shoptet

Verejný GET `https://www.onlinovo.sk/` (2026-08-25):

- `link rel=preconnect` → `https://cdn.myshoptet.com`
- `<meta name="web_author" content="Shoptet.sk">`
- JS objekt `shoptet` + `shoptet.consent` / `shoptet.config`
- cookie `PHPSESSID`, header `x-cache-pagetype: index` (typický Shoptet front)

Firma na webe: ONLINOVO, zákaznícka linka a `info@onlinovo.sk`. **Žiadny admin scrape, žiadne PII dump.**

### NEZNÁME — tarif Premium vs standard

Z verejného HTML **nevieš spoľahlivo** povedať, či ide o Shoptet Premium (Private API + oficiálny MCP) alebo krabicový tarif.

**PREDPOKLAD (slabý, nestačí na nákup):** storefront ťahá `cdn.myshoptet.com` šablóny (`frontend_templates`, `shop/dist`), plus CSS z `paxio.myshoptet.com` (partner blank). To vyzerá ako šablónový Shoptet, nie čistý custom Premium frontend. Premium však **môže** stále používať Shoptet CDN. **Nepoužiť ako dôkaz „nie sme Premium“.**

### Zámena pojmov (nepliesť)

| Pojem | Čo to je |
|---|---|
| Shoptet **standard** (Basic…Enterprise) | Krabicový tarif. REST API **len cez addon**. Oficiálny MCP **nie**. Private API **nie**. |
| Shoptet **Premium** | Samostatná platforma, nie „vyšší stupeň Enterprise“. Private API + oficiálny MCP (doplnok zadarmo). Cena individuálna, oficiálny floor **od 12 000 Kč/měs.** |
| **Oficiálny MCP** | Remote `https://mcp.shoptet.com/mcp`, OAuth, Premium-only. |
| **Private API** | Header `Shoptet-Private-API-Token`, host `https://api.myshoptet.com/api/`, až 10 tokenov. Premium-only. **Nie je to MCP.** |
| **Addon REST API** | Marketplace inštalácia → dlhodobý OAuth Access Token → krátke API tokeny 30 min. Jediná dokumentovaná cesta k REST na non-Premium. |

---

## 4. Cesta A — oficiálny Shoptet MCP (BUY Premium)

### Čo existuje (FAKT)

- Oficiálny MCP **existuje** a je **len pre Shoptet Premium**: [podpora.shoptet.cz/shoptet-mcp](https://podpora.shoptet.cz/shoptet-mcp/).
- Doplnok je **zadarmo pre Premium e-shopy**: [doplnky.shoptet.cz/mcp](https://doplnky.shoptet.cz/mcp) (SK zrkadlo: [doplnky.shoptet.sk/mcp](https://doplnky.shoptet.sk/mcp)).
- Remote URL: `https://mcp.shoptet.com/mcp`.
- Auth: OAuth. „Přihlašovací údaje zůstávají na Shoptetu a s AI se nikdy nesdílí.“
- Klient si pri autorizácii **vyberie nástroje**.
- Dokumentovaní klienti: Claude.ai, ChatGPT (web Developer mode), Codex, Claude Code (`claude mcp add --transport http`), plus zmienka Cursor / Gemini / Copilot.

**ChatGPT obmedzenia (FAKT, podpora):** vlastný MCP len web + Developer mode. Write tools v beta na Business / Enterprise / Edu. ChatGPT Pro = custom MCP **len čítanie**. Desktop/mobil ChatGPT = custom MCP **nie**.

### Čo MCP vie (FAKT, zoznam z podpory — nie OpenAPI MCP)

Objednávky (hľadanie, detail, podporovaná správa), produkty, zásoby, zákazníci, kategórie, cenníky/doprava/platby, faktúry a dodacie listy, kupóny zo šablón, blog, recenzie.

**Mazanie a hromadné zmeny cez oficiálny MCP nie sú dostupné.** Pred zmenou má človek skontrolovať operáciu. AI **môže upravovať**, ak to oprávnenia dovolia.

### Čo A nerieši

- Žiadny Onlinovo-owned audit log, policy, human-approval queue mimo Shoptet OAuth picker.
- Žiadny GA4, GSC, LeadHub, P&L, produktový dátový sklad mimo Shoptetu.
- Žiadny stabilný tool contract pre Ruffo/swarm (vendor môže meniť tool set).
- ChatGPT write path je tarifne a klientsky obmedzený.
- **Premium ≠ MCP.** Kúpa Premium kvôli MCP kupuje celú platformu.

### Cena Premium (FAKT floor + PREDPOKLAD kurz)

| Položka | Hodnota | Nálepka |
|---|---|---|
| Oficiálny ceník | Premium **od 12 000 Kč/měs.** | FAKT ([shoptet.cz/cenik](https://www.shoptet.cz/cenik/), overené 2026-08-25; stránka občas 500, floor je v verejných rešeršiach 2026 konzistentný) |
| Reálna faktúra Onlinova | ? | **NEZNÁME** — individuálna ponuka |
| Founder príklad €1 000/mes. | hypotéza, nie zmluva | **PREDPOKLAD** |
| Kurz | 25 Kč = 1 € → ~€480/mes. floor | **PREDPOKLAD** |
| MCP doplnok | 0 Kč na Premium | FAKT |

**Odpoveď na „kúpiť Premium kvôli MCP?“:** nie, pokiaľ Onlinovo nepotrebuje Premium **aj z iných dôvodov** (custom FE, Private API, limity). MCP samotný tú cenu neobháji.

---

## 5. Cesta B — vlastný addon + REST API (bez Premium)

### Čo API je (FAKT)

- REST + JSON. **„It can only be used by addons.“** ([API documentation](https://developers.shoptet.com/api/documentation/), [basic information](https://developers.shoptet.com/api/documentation/basic-information-about-api/)).
- Inštalácia **len** cez marketplace `doplnky.shoptet.cz`. ([installing the addon](https://developers.shoptet.com/home/addons/documentation/installing-the-addon/) / dokumentačný index).
- OAuth `code` → dlhodobý **OAuth Access Token** (255 znakov, `expires_in: null`) → krátke **API access tokeny**, `expires_in: 1800` (30 min), max **5** platných na jeden OAuth token. ([getting API access token](https://developers.shoptet.com/api/documentation/getting-api-access-token/)).
- Rate limit: 50 conn/IP, 3 conn/token, leaky bucket 200 drops / −10/s, 429 + `Retry-After`. Write duplicity → 423 lock ≤5 s. ([rate limiter](https://developers.shoptet.com/api/documentation/rate-limiter/)).
- Webhooky: registrácia per inštalácia, 200 do 4 s, retry 15 min ×2, IP `185.184.254.0/24`, HMAC `Shoptet-Webhook-Signature`. Voliteľné `sendPayload: "full"`. ([webhooks](https://developers.shoptet.com/api/documentation/webhooks/)).
- Addon beží **na infra partnera**. Shoptet nehostuje dáta addonu.

### Partner lifecycle (FAKT)

[Addons life cycle](https://developers.shoptet.com/home/addons/documentation/addons-life-cycle/):

1. Idea form → feedback **do ~4 týždňov** (approved / denied / backlog).
2. Zmluva API partner + T&C → test e-shop + Partner admin.
3. Submit addonu do **6 mesiacov** od podpisu.
4. Final review znova **~4 týždne**.
5. Launch na marketplace (Starter’s guide).

### Tvrdá veta, ktorú neslobodno obísť (FAKT)

Z [basic information about API](https://developers.shoptet.com/api/documentation/basic-information-about-api/):

> „Presently, not every e-shop operator can use the API, or partners that would develop only single e-shop.“

**Význam:** Shoptet **neponúka** „dajte nám API token na náš jeden e-shop“. Očakáva **marketplace addon**. Partner, ktorý chce API **len pre Onlinovo**, môže dostať **denied**.

**NEZNÁME:** či existuje interný / unlisted addon len pre vlastný shop. Dokumentácia to **nepopisuje**. Nepredpokladať skratku.

### Odpoveď na otázku brifu

> Vie Onlinovo stavať compliant Shoptet integráciu **bez** kúpy Premium?

| Ak | Odpoveď |
|---|---|
| Stať sa API partnerom, addon schválený, nainštalovaný na Onlinovo | **ÁNO** — to je dokumentovaná non-Premium cesta. |
| Private token API bez Premium | **NIE.** Private API je Premium. |
| Istota, že Shoptet schváli „len náš shop“ | **NIE.** Idea môže byť denied. Kalendár 8+ týždňov ešte pred kódom v prod. |

### Neoficiálny community MCP

`tomkalina/shoptet-mcp` (nástroje + `SHOPTET_API_TOKEN`) **nie je** primár. ToS, token handling, žiadna zmluva. Maximálne laboratórium na test shope partnera — nie Onlinovo prod.

---

## 6. Cesta C — export / feed / dátový most

### FAKT — admin exporty

[Data export](https://developers.shoptet.com/shoptet-tools/data-export/):

| Entita | Formáty | Poznámka |
|---|---|---|
| Produkty | XLSX, CSV, XML | Custom full export nie v XML |
| Zákazníci | XLSX, CSV, XML | Re-import len CSV; len registrovaní |
| Objednávky | **XLSX, CSV** | XML objednávok v tejto oficiálnej stránke **nie** |

XML/CSV feedy (Heureka, Zboží, Google, Glami…) sú samostatná Shoptet funkcia — dobré na **katalóg a ceny**, zlé ako live order bus.

### Čo C je a nie je

- **Je:** read analytics vrstva (katalóg, ceny, hrubé objednávky po exporte), nízky cash cost, žiadny Premium.
- **Nie je:** event-driven order sync (okrem kombinácie s API webhookmi — to už je B).
- **NEZNÁME / FLAG:** oficiálna data-export stránka **neopisuje import objednávok**. Tvrdím len: **dokumentovaný import objednávok tu nie je.** Tretie strany môžu tvrdiť opak — neoverené.

PII: customer/order export = osobné údaje. Súbory mimo Shoptet = vlastný GDPR režim (účel, retencia, šifrovanie, žiadny git).

**Verdikt C:** doplnok k A/B (katalóg), **nie** náhrada za akčný MCP.

---

## 7. Cesta D — browser automation

**DON'T BUILD ako primár.**

- 2FA, session, CSRF, UI drift, detekcia, ToS.
- Píše tam, kde API zámerne obmedzuje (delete/bulk) — presne tam, kde nechceš agenta.
- Údržba rastie s každým Shoptet UI releasom.

Prípustné len ako **manuálny fallback** (človek v admin) alebo neskôr explicitný founder GO na úzky read-only scraper **až keď A/B/C zlyhajú** a s právnym posúdením. Teraz: nie.

---

## 8. Matica štyroch ciest

| | A Official MCP | B Addon REST | C Export/feed | D Browser |
|---|---|---|---|---|
| Potrebuje Premium? | Áno | Nie (ak partner OK) | Nie | Nie |
| Live dáta | Áno | Áno + webhooky | Nie (batch/URL) | Krehké |
| Zápisy | Obmedzené; nie delete/bulk | Áno podľa schválených endpointov | Spravidla nie | Nebezpečné |
| GA4/GSC/P&L | Nie | Nie (len Shoptet) | Čiastočne offline | Nie |
| Ruffo/audit/approval | Nie | Len ak **my** obalíme | Nie | Nie |
| Vendor lock | Vysoký (Shoptet MCP tools) | Stredný (API, náš adapter) | Nízky | Vysoký (UI) |
| Čas do prvého read | Minúty, ak už Premium | 8+ týždňov kalendár + deny riziko | Dni (manuál/cron na feed) | Hodiny, potom rozpad |
| ToS | Oficiálne | Oficiálne ak schválené | Oficiálny export | Riziko |
| Primár pre Onlinovo? | Ľudský chat, ak Premium | Shoptet adapter, ak partner/Private API | Katalóg fallback | Nie |

**Žiadna cesta A–D sama o sebe nie je Onlinovo MCP Gateway.** Gateway je **naša** vrstva nad adaptermi.

---

## 9. TCO 1 rok a 3 roky

Kurz **25 Kč = 1 €** je **PREDPOKLAD**. DPH sa v tabuľkách nepočíta (ceník bez DPH). **Onlinovo zmluva = NEZNÁME.**

### 9.1 BUY Premium len kvôli MCP (floor)

| | 1 rok | 3 roky |
|---|---|---|
| 12 000 Kč/měs. | 144 000 Kč | 432 000 Kč |
| ~€480/měs. | ~€5 760 | ~€17 280 |
| Founder hypotéza €1 000/měs. | €12 000 | €36 000 |

Ak je Onlinovo **už** na Premium, **prírastok MCP = 0 Kč**. Táto tabuľka platí len pre **upgrade kvôli MCP**.

Premium TCO v praxi býva vyššie (individuálna cena, partner údržba). To je **PREDPOKLAD z blogov**, nie FAKT — do rozhodnutia nevstupuje ako číslo.

### 9.2 BUILD vlastný gateway (PREDPOKLAD nákladov)

| Položka | 1 rok | 3 roky | Poznámka |
|---|---|---|---|
| Hosting MCP (HTTP worker + logy) | €120–600 | €360–1 800 | PREDPOKLAD |
| Secret store (nie git) | €0–120 | €0–360 | PREDPOKLAD |
| Partner/addon (Shoptet fee) | **NEZNÁME** | **NEZNÁME** | Test shop je free; marketplace monetizácia je iný biznis |
| Vývoj MVP read-only (agent+founder) | 40–80 h | +40–80 h/rok údržba | PREDPOKLAD; súťaží s Revolis hodinami |
| Opportunity cost vs Revolis P0 | vysoký | vysoký | FAKT ako riziko, nie ako € |

Aj horný odhad hostingu **«** floor Premium. **Rozhoduje partner deny a hodiny**, nie VPS.

### 9.3 Path C only

Cash ~0. Náklad = ľudský čas na exporty + GDPR na súboroch. Žiadny write bus.

### 9.4 Hybrid (odporúčaný TCO model)

- Gateway vždy (malý cash, náš audit).
- Shoptet dáta: Private API **ak** Premium; inak addon **ak** schválený; inak C kým partner nerozhodne.
- Oficiálny MCP: len ak už Premium — 0 Kč, ľudský chat, **nie** Ruffo kernel.

---

## 10. ROI na contribution / zisku — nie na tržbe

**Zákaz:** „ušetříme 2 % obratu“ bez merania. Obrat ≠ zisk.

**Mechanizmus (kvalitatívne, FAKT ako logika):**

1. Menej času v admin na „ktoré objednávky čakajú / čo dochádza“ → uvoľnený čas na nákup, CS, kampane.
2. Rýchlejší zásah pri low-stock / nezaplatených → menej strateného **príspevku na krytie** (cena − variabilné náklady), nie tržby.
3. Write nástroje (kupón, blog, úprava produktu) majú ROI len so **schválením** — inak jedna chyba zje mesiac úspor.

**Čísla Onlinovo P&L = NEZNÁME.** Citlivosť:

| Mesačný prínos contribution | Payback vs Premium floor €480/mes. | Payback vs gateway ~€50/mes. |
|---|---|---|
| €100 | Premium sa neoplatí | Gateway áno |
| €480 | Premium na nule (len MCP dôvod) | Gateway silne áno |
| €1 000 | Premium áno *ak* iné Premium benefitov niet a MCP to naozaj doručí | Gateway áno |

**PREDPOKLAD na vyvrátenie:** ak founder nameria, že ľudský Shoptet MCP na už-zaplatenom Premium šetrí ≥1 h/deň práce, ktorá inak ide do contribution, oficiálny MCP ako **doplnok** má zmysel. Stále to **nenahrádza** gateway pre GA4/GSC/P&L.

**Revolis Constitution Q1** tu mapuje na Onlinovo P&L, nie na CRM klienta. Hodiny do gateway **súťažia** s Revolis retenciou — to je Q7/Q11, nie dôvod nestavať audit.

---

## 11. Bezpečnostný model

### Princípy

1. **Secrets nikdy v repe, chate, bus súboroch, PR.** OAuth client secret, Private API token, GA4, GSC — len secret manager / env na runtime, ktorý ešte neexistuje.
2. **Split oprávnení:** READ / ANALYTICS / WRITE / ACTIONS. Default deny na WRITE/ACTIONS.
3. **Human approval** pred každým zápisom do Shoptet (aj keď oficiálny MCP umožňuje write po OAuth picker — náš kernel to musí vedieť zopakovať).
4. **Audit log** (kto, ktorý tool, argumenty, výsledok, schvaľovateľ) vlastní Onlinovo, nie len Shoptet.
5. **PII minimization:** tool vracia ID + agregát, keď stačí; plný zákazník/objednávka len pri explicitnom READ s účelom.
6. **Webhook verify:** HMAC + allowlist IP Shoptet.
7. **Fail closed:** neplatný token / neznámy tool / vypršaný approval = 403, nie „best effort write“.
8. **Žiadny prod write v MVP.**

### Mapovanie na Shoptet

| Vrstva | Kto authuje | Riziko |
|---|---|---|
| Oficiálny MCP | User OAuth voči Shoptet | Write bez nášho approval; tool set mimo našej kontroly |
| Private API | Statický token v admin | Únik tokenu = plné API podľa práv skupiny |
| Addon API | Náš server drží OAuth Access Token | Kompromitovaný gateway = Shoptet pod našimi schválenými endpointmi |
| Exporty | Človek / URL feed | Súbor na disku, email, Drive |

**Odporúčanie:** aj pri oficiálnom MCP **nezapínať** write tools pre Ruffo. Ľudský Claude/ChatGPT môže mať read; write len cez náš gateway + approval.

### GDPR

- Zákazníci a objednávky = osobné údaje.
- Právny základ pre interný ops AI: **PREDPOKLAD 6(1)(f)** oprávnený záujem (prevádzka e-shopu) + balancing — **nevykonaný plný posudok v tomto PR** (FLAG, nie bloker pre feasibility).
- Žiadny tréning verejných modelov na raw PII ako default.
- Cudzie MCP servery (Shoptet) = spracovateľ; zmluva Premium/T&Cs = NEZNÁME detaily, founder overí DPA.

---

## 12. Vendor-neutral MCP architektúra (cieľový stav, nie kód)

```text
 AI klienti (Claude, Cursor, ChatGPT*, Ruffo)
                    |
                    | Streamable HTTP  POST /mcp
                    | (ChatGPT navyše OAuth 2.1 + DCR)
                    v
         ┌──────────────────────┐
         │  Onlinovo MCP Gateway │  auth, tool allowlist,
         │  READ | ANALYTICS     │  approval queue, audit
         │  WRITE | ACTIONS      │
         └──────────┬───────────┘
                    |
     ┌────────┬─────┴──────┬──────────┬─────────┐
     v        v            v          v         v
 Shoptet   LeadHub      GA4/GSC     P&L     ProductData
 Adapter   Adapter      Adapter   Adapter   Adapter
     |
     +-- official MCP (optional, humans only)
     +-- Private API (ak Premium)
     +-- Addon REST + webhooks (ak partner)
     +-- XML/CSV feeds (fallback)
```

\*ChatGPT remote MCP v praxi vyžaduje **OAuth 2.1 + Dynamic Client Registration** (dokumentácia OpenAI / MCP). Claude a Cursor vystačia s HTTP + OAuth; Cursor aj stdio lokálne. **PREDPOKLAD náročnosti:** ChatGPT-compliant OAuth je drahší než Claude/Cursor stdio. MVP môže byť **Claude/Cursor first**, ChatGPT až keď OAuth stoja.

### Transport

- Jeden endpoint `/mcp`, Streamable HTTP (aktuálny MCP).
- Žiadny SSE-only legacy ako primár.
- Health `/healthz` mimo MCP.

### Tool skupiny (názvy, nie implementácia)

| Skupina | Príklady | MVP |
|---|---|---|
| `shop.read` | order_get, product_search, stock_low | Áno, ak adapter existuje |
| `shop.write` | product_patch, coupon_from_template | Nie (stub approval) |
| `analytics.read` | gsc_queries, ga4_revenue | Áno, read-only kľúče |
| `finance.read` | contribution_mtd (z P&L zdroja) | Len ak zdroj existuje — inak honest empty |
| `actions` | „pošli reklamáciu dopravcovi“ | Nie |

**Fikcia dát zakázaná:** ak GA4 nie je napojené, tool vráti `source: unconnected`, nie vymyslené číslo.

---

## 13. GDPR / dáta / sourcing

Toto **nie je** Revolis kadaster/portál. Zdroje Onlinovo:

| Dáta | Zdroj | Stav |
|---|---|---|
| Katalóg, ceny, sklad | Shoptet | Overené ako platforma; tarif NEZNÁME |
| Objednávky, zákazníci | Shoptet | PII |
| Search / ads výkon | GSC / GA4 | NEZNÁME či Onlinovo má property |
| LeadHub | interný | NEZNÁME existencia v tomto clone |
| P&L | účtovníctvo | NEZNÁME; **nikdy** nepočítať z tržby e-shopu ako zisk |

Ak zdroj nie je pripojený → `computed from {source}` / `unconnected`. Žiadny fake KPI.

---

## 14. Ústava — 12 otázok (Onlinovo P&L, nie Revolis CRM feature)

Toto **nie je** featura pre platiaceho CRM klienta. Je to interný ops stack e-shopu Onlinovo. Q1 preto: **zaplatilo by za to Onlinovo zo svojho contribution?**

| # | Otázka | Skóre | Poznámka |
|---|---|---|---|
| 1 | Zaplatil by dnešný klient? | ÁNO ako interný P&L | VETO sa nespúšťa. Premium-only-for-MCP = Onlinovo by **nemalo** zaplatiť 12k Kč. |
| 2 | Viac peňazí do 90 dní? | PODMIENEČNE | Len read+zásah na sklad/objednávky; write bez approval môže prerobiť. |
| 3 | Skráti funnel? | N/A CRM | Mapuj na: dopyt → sklad → objednávka → marža. |
| 4 | Moat? | Slabý navonok, silný dnu | Audit+approval+multi-source je moat voči „len Shoptet MCP“. |
| 5 | Flywheel? | Áno ak meriame | Použitie toolov → ktoré otázky šetria čas. |
| 6 | Unikátne dáta? | Áno ak spojíme Shoptet×GA4×P&L | Samotný Shoptet MCP dáta nevlastníme. |
| 7 | Najlepšie ROI vs backlog? | NAPÄTIE | Súťaží s Revolis P0. Feasibility **áno**; implementácia **až GO**. |
| 8 | Timing? | Správny čas na **rozhodnutie** | Implementácia nie je „príliš skoro“, ale **blokovaná** tarifom + partner deny. Žiadny timing VETO na audit. |
| 9 | MVP < 2 týždne? | Read stub áno; plný ChatGPT OAuth nie | |
| 10 | Founder trap? | Technology bias áno ako riziko | „Máme MCP“ nie je cieľ; cieľ je contribution. |
| 11 | Najlepší čas foundera? | Audit áno (objednané dnes) | Kód nie, kým Revolis merge/smoke stoja. |
| 12 | Jediná vec kvartálu? | NIE | Gateway nie je jediná vec; je to Onlinovo lane. |

**Skóre:** ~9/12 na **VALIDATE→BUILD po GO**, nie silent implementácia. Veto timing na audit: nie. Veto „nikto nezaplatí“ na kúpu Premium-kvôli-MCP: **strop DON'T BUY**.

---

## 15. Strategic analysis

### Fáza 1 — slabiny (konkrétne)

1. **Partner deny / single-shop.** Shoptet píše, že API nie je pre operátorov ani pre partnerov len na jeden e-shop. Celá Path B môže zomrieť vo week 4. Stojí na **FAKT** vety z docs; výsledok Onlinovo žiadosti = **NEZNÁME**.
2. **Tarif Onlinova neoverený.** Verdikt sa vetví. Kúpa Premium naslepo je drahá chyba. Stojí na **NEZNÁME**.
3. **ChatGPT OAuth 2.1 + DCR.** Ak je success criterion „funguje v ChatGPT“, MVP exploduje. Stojí na **FAKT** Shoptet podpory (Developer mode + tarif) + **PREDPOKLAD** náročnosti vlastného DCR.
4. **Oficiálny MCP write obchádza náš gate.** Človek zapne write tools v Claude a Ruffo to nemá pod kontrolou. Single point = Shoptet OAuth picker.
5. **Opportunity cost voči Revolis.** Každá hodina gateway je hodina mimo platiaceho CRM. Už raz (stealth funnel / doc-only drift) sme stavali „šikovné“ mimo retencie.

### Fáza 2 — varianty

| Variant | Čo dá | Náklad | Reverzibilita | Ústava | Overenie ≤1 deň |
|---|---|---|---|---|---|
| **V1 BUILD gateway + adapter podľa tarifu** | Jedna brána, audit, neskôr GA4 | Hodiny + hosting | Ľahká (vypnúť server) | Prejde ako BUILD po GO | Founder: screenshot tarifu v admin |
| **V2 BUY Premium kvôli MCP** | Ľudský chat za 12k+ Kč | Vysoký lock-in | Ťažká | FAIL Q1 ak jediný dôvod je MCP | Ceník + zmluva |
| **V3 DON'T BUILD, len exporty** | Katalóg v sheetoch | Ľudský čas | Ľahká | VALIDATE | Jeden XML feed URL |
| **V4 Official MCP only (už Premium)** | Rýchly ľudský win | 0 Kč prírastok | Ľahká | Doplnok, nie stratégia | Nainštalovať doplnok, 1 read query |
| **V5 Community MCP** | Rýchle demo | ToS/token riziko | Ľahká technicky | FAIL | — neskúšať na prod |

**Odporúčaný variant:** **V1**, s **V4** ako voliteľný deň-1 win **iba ak** už Premium, a **V3** ako dočasný katalóg kým B/Private API nie je.

---

## 16. Kontrolór

| Bod | Verdikt | Poznámka |
|---|---|---|
| 1 FAKT/PREDPOKLAD/NEZNÁME | PASS | Tarif a P&L ostávajú NEZNÁME |
| 2 Dôkaz | PASS | URL v §20; HTML fingerprint Onlinovo |
| 3 Nepodložený predpoklad | FLAG | Kurz 25, hosting €, hodiny vývoja |
| 4 Zámena pojmov | PASS | MCP ≠ Private API ≠ addon REST |
| 5 Biznis brána | PASS | DON'T BUY Premium-for-MCP; BUILD až GO |
| 6 Fikcia dát | PASS | Žiadne vymyslené Onlinovo marže |
| 7 Scope | PASS | 1 logická zmena = feasibility |
| 8 Verifikácia | FLAG | Runtime gateway neexistuje — zámer |
| 9 STOP-AND-ASK | STOP na implementáciu | Tarif + contribution pred kódom |
| 10 Artefakt | PASS po merji tohto súboru v PR | |
| 11 Eng. Constitution | PASS | Docs only; reuse N/A; žiadny nový runtime |

**KONTROLÓR verdikt na IMPLEMENTÁCIU:** **STOP.**  
**KONTROLÓR verdikt na FEASIBILITY DOKUMENT:** **PASS s FLAG** (tarif, P&L, partner deny).

---

## 17. Jednoznačný verdikt

### BUILD

Vlastný **Onlinovo MCP Gateway** (vendor-neutral, Streamable HTTP, split READ/WRITE, audit, approval stub).

### DON'T BUY

Shoptet Premium **ako nákup oficiálneho MCP**. Floor 12 000 Kč/měs. je iná platforma. MCP doplnok je na Premium zadarmo — to nie je dôvod na upgrade.

### BUY (podmienené)

**Ak už ste Premium:** nainštalovať oficiálny MCP pre ľudí v Claude/ChatGPT (read-first). To **nie je** nákup; je to aktivácia doplnku.

**Ak nie ste Premium a partner vás odmietne a zároveň potrebujete live REST:** vtedy je Premium **kúpa Private API** (a MCP zadarmo), nie kúpa MCP. To je **iné rozhodnutie** (custom FE, limity, B2B) — otvoriť až s ponukou v Kč, nie z tohto auditu.

### DON'T BUILD

- Browser automation ako primár.
- Community MCP na produkcii.
- Write/actions v MVP.
- ONL-MCP-002 v tejto noci.
- Čokoľvek v `apps/crm` v tomto PR.

### Vetvenie (povinné)

```text
Je Onlinovo Shoptet Premium?
 ├─ ÁNO → nainštaluj oficiálny MCP (ľudia, read)
 │         + Private API ako ShoptetAdapter pre gateway
 │         + BUILD gateway pre GA4/GSC/P&L/approval
 └─ NIE → BUILD gateway aj tak (analytics adapters)
           + podaj API-partner idea (Path B)
           + Path C na katalóg hneď
           + čakaj approved/denied
           + ak DENIED a live orders sú must → samostatné rozhodnutie Premium (Private API), nie „kúp MCP“
```

---

## 18. MVP (len po `GO ONL-MCP-002`)

**Cieľ MVP:** Ruffo alebo Claude vie **read-only** spýtať sa na nízky sklad / otvorené objednávky **alebo** čestne povedať `unconnected`, plus jeden analytics read ak kľúč existuje.

**Mimo MVP:** prod writes, ChatGPT DCR, LeadHub/P&L kým nie je zdroj, Revolis kríženie.

**Kroky MVP (návrh, nie práca tejto noci):**

1. Potvrdiť tarif (screenshot admin, žiadny token v repe).
2. Secret store + prázdny gateway `/mcp` ping (auth fail-closed).
3. Jeden ShoptetAdapter: Private API **alebo** addon test shop **alebo** feed parser — podľa vetvy.
4. Tools: `shop.stock_low`, `shop.orders_open` — read.
5. Approval stub, ktorý **odmietne** write.
6. Audit log na stdout/tabuľku bez PII v default výpise.

**Odhad:** < 2 týždne kalendára **ak** Private API alebo test addon už beží. **Nie** < 2 týždne, ak treba partner idea+zmluvu.

---

## 19. Ďalších 5 krokov (founder, nie autonómny agent)

1. **Founder:** v Shoptet admin overiť tarif (Premium áno/nie) a či je viditeľný doplnok MCP / Private API. Odpoveď do bus / jedna veta v chate.
2. **Founder:** doplniť contribution/mesiac (alebo povedať „nechcem čísla v repe“) — bez toho ROI ostane citlivosť.
3. **Founder GO alebo NO-GO** na podanie Shoptet addon idea form (Path B). Bez GO formulár neposielať.
4. **Až GO ONL-MCP-002:** scaffold gateway na **novej** vetve, žiadny prod write, žiadny Revolis CRM diff.
5. **Neotvárať ONL-MCP-003/004** (write tools / ChatGPT OAuth) kým MVP read nemá dôkaz (log + 1 tool call).

Agent po tomto PR: **STOP.**

---

## 20. Zdroje (overené 2026-08-25)

| Zdroj | Použitie |
|---|---|
| https://podpora.shoptet.cz/shoptet-mcp/ | Oficiálny MCP, URL, tool list, OAuth, ChatGPT limity, no delete/bulk |
| https://doplnky.shoptet.cz/mcp | Premium-only, zadarmo, aktivácia |
| https://www.shoptet.cz/cenik/ | Premium od 12 000 Kč/měs. |
| https://developers.shoptet.com/home/premium/private-api/ | Private API token, host, 10 tokenov, 403 |
| https://developers.shoptet.com/api/documentation/ | Addon-only API |
| https://developers.shoptet.com/api/documentation/basic-information-about-api/ | Single-shop partner veta, 30 min token |
| https://developers.shoptet.com/api/documentation/getting-api-access-token/ | `expires_in: 1800`, max 5 tokenov |
| https://developers.shoptet.com/home/addons/documentation/installing-the-addon/ | Marketplace install, OAuth code, IP, 5 s / 200 |
| https://developers.shoptet.com/home/addons/documentation/addons-life-cycle/ | 4 týždne / 6 mesiacov / 4 týždne |
| https://developers.shoptet.com/api/documentation/rate-limiter/ | 50/3, bucket 200/−10 |
| https://developers.shoptet.com/api/documentation/webhooks/ | 4 s, retries, HMAC, payload |
| https://developers.shoptet.com/shoptet-tools/data-export/ | XLSX/CSV/XML entity |
| GET https://www.onlinovo.sk/ | Shoptet fingerprint |

**Neskúmané / mimo noci:** plný OpenAPI zoznam oficiálnych MCP tools (Shoptet ho verejne nedá ako spec), Onlinovo admin, Onlinovo zmluva, GSC/GA4 property IDs, LeadHub existencia, DPA Shoptet, idea-form výsledok.

---

## Engineering justification (docs-only PR)

- **Trigger:** founder ONL-MCP-001, override „dnes v noci“.
- **Decision path:** new doc tree `docs/onlinovo/` — Revolis `docs/architecture/` ostáva CRM ústava.
- **Alternatives:** `docs/architecture/ONL-MCP-FEASIBILITY.md` (brif) — zamietnuté, aby sa Onlinovo nerozrastalo do Revolis constitution tree.
- **Why not reuse:** v `origin/main` neexistuje Onlinovo MCP audit.
- **Contradiction check:** none. Žiadny runtime. Žiadny merge.
)
