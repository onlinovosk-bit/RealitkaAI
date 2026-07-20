# Validation brief — Valuation Widget `/odhad/[agencySlug]`

**Verdikt:** VALIDATE pred BUILD  
**Cieľ:** Overiť, či verejný odhad vytvorí kvalifikované seller leady pre Reality Smolko a AA Reality Molnár bez nepravdivého cenového odhadu alebo právneho rizika.

## Hypotéza

Ak agentúra pošle vlastný odkaz na orientačný odhad svojej databáze, sociálnym sieťam a QR materiálom, majiteľ nehnuteľnosti vyplní kontakt výmenou za užitočný prvý výsledok. Maklér ho kontaktuje do dohodnutého času a získa viac relevantných predajných rozhovorov.

**Nie je hypotéza:** že LLM vie určiť trhovú cenu bez doložených a licencovaných dát.

## Dôkaz dopytu (2026-07-19)

Reality Smolko už dnes prevádzkuje `realitysmolko.sk/ponuka-dopyt` — generický formulár, v ktorom „Mám záujem o…“ obsahuje priamo položku **„Ocenenie nehnuteľnosti“**, a na stránku vedie **platená Google Ads kampaň** (`gclid` v URL). Dôsledky:

- **Dopyt je validovaný ním samým** — postavil na ocenenie formulár a platí zaň reklamu. Otázka dopytu sa mení z „chceli by ste?“ na potvrdenie.
- **Distribučný kanál č. 1 existuje** — stránka s platenou návštevnosťou. Zostáva potvrdiť kanál č. 2 (databáza / sociálne siete / QR).
- **Predajný rámec = upgrade, nie výmena:** jeho formulár nedáva návštevníkovi nič (odmena je „ozveme sa“), takže väčšina platených klikov odchádza; leady končia v e-mailovej schránke mimo CRM. Widget dá okamžitý orientačný výsledok (vyššia konverzia toho istého rozpočtu) a leady padajú rovno do Revolis triage/Action Queue so SLA.
- **GDPR poznámka (nepoužívať ako útok):** jeho formulár podmieňuje odoslanie povinným súhlasom podľa čl. 6 ods. 1 písm. a) — súhlas ako podmienka vybavenia žiadosti je anti-pattern. Widget to rieši správne (vyžiadaná služba + informačná povinnosť).

## Cenová stratégia (rozhodnuté 2026-07-19)

Widget sa **nespoplatňuje samostatne** — je súčasťou balíka Revolis, monetizácia ostáva cez seaty. Dôvody: (1) samostatný poplatok by vyvolal cenové porovnanie s trhovahodnota.sk namiesto diferenciácie „formulár + CRM, ktoré z leadu urobí obchod“; (2) widget je akvizičný a retenčný nástroj — leady tečú do triage a Action Queue, viac leadov → viac maklérov → viac seatov; (3) „v cene balíka“ je konkrétny argument na podpis Molnára ako 2. platiaceho zákazníka. Ak náklady na odhady časom porastú, fair-use limit alebo vyšší tier sa rieši až vtedy.

## Webex bypass stratégia (L99)

**Kontext:** Webex (p. Seliga) spravuje web realitysmolko.sk. Export/API integráciu sme odmietli (2026); zvolená **Varianta 1 — vlastný web** (utajenie pred Webexom). Seliga môže widget blokovať („nedá sa“) alebo naceniť vysoko — preto **pilot nesmie závisieť od Webexu**.

**Princíp:** Nerozprávaj sa s gatekeeperom o revenue. Rozdeľ ekonomického vlastníka (Smolko = reklama, leady, provízie) od technického dodávateľa (Webex = údržba webu). Widget je hosted outbound stránka — **žiadny export, API, webhook ani zásah do Realvia feedu**.

### Tri fázy (Seliga je voliteľný, nie brána)

| Fáza | Čo | Webex? | Kedy |
|---|---|---|---|
| **0 — Revenue capture** | A/B v Google Ads: polovica budgetu → `app.revolis.ai/odhad/reality-smolko`, polovica → ponuka-dopyt | **Nie** | Deň 1 — GO od Smolka stačí |
| **1 — Web mirror** | Tlačidlo na ponuka-dopyt: externý odkaz na ten istý Revolis URL | Áno — 1 hyperlink | Po dôkaze z Fázy 0, alebo paralelne ak Smolko chce |
| **2 — Brand URL** (voliteľné) | `odhad.realitysmolko.sk` → CNAME na Revolis | Áno — DNS záznam | Až po Fáze 1; stále bez backend integrácie |

### Prečo Seliga nemá páku

1. **Pilot nepotrebuje jeho súhlas** — cieľovú URL reklamy mení Smolko (alebo jeho Ads agentúra), nie Webex.
2. **Úloha pre Webex je triviálna** — `<a href="https://app.revolis.ai/odhad/reality-smolko">` alebo Gutenberg tlačidlo. Ťažko obhájiť „nedá sa“ alebo €500+.
3. **Ak odmietne / nacení vysoko** — Smolko nechá reklamu na Revolise + QR + databázu. Webex príde o budúcu prácu; Revolis už generuje leady.
4. **Stealth** — Revolis neoslovuje Seligu/Webex pred dôkazom. Smolko neposiela Seligovi „integráciu Revolis CRM“ — len „pridajte odkaz na náš odhadový formulár“.

### A/B meranie (14 dní)

- **Ad skupina A:** existujúca landing ponuka-dopyt (baseline).
- **Ad skupina B:** Revolis odhad pod značkou Smolko.
- **Metriky:** cost/lead, completion rate, kvalifikované rozhovory (nie len kliky).
- **Výstup:** Smolko ide k Webexu s číslami: *„Z reklamy cez Revolis prišlo X leadov, cez formulár Y — chcem tlačidlo na web.“*

### Seliga playbook (interné — neposielať Smolkovi)

| Námietka Seligu | Smolko odpovedá |
|---|---|
| „Potrebujeme integráciu / export“ | „Nie — len externý odkaz, žiadne dáta z Realvia.“ |
| „To stojí X €“ | „Jeden `<a>` tag. Ak X > cena jedného leadu z reklamy, nechám reklamu smerovať mimo web.“ |
| „Nedá sa / bezpečnostné dôvody“ | „Je to HTTPS odkaz ako na akýkoľvek iný externý formulár. Pošlem presný text tlačidla.“ |
| „Musíme to projektovo posúdiť“ | „Pilot už beží z reklamy. Web je doplnok, nie predpoklad.“ |

### Micro-spec pre Webex (Smolko forwardne až po GO)

```
Úloha: Pridať na stránku /ponuka-dopyt tlačidlo (nad existujúci formulár).
Text: „Získajte orientačný odhad online zadarmo“
URL: https://app.revolis.ai/odhad/reality-smolko
Otvorenie: rovnaké okno (nie popup).
Integrácia: žiadna. Žiadny export, API, iframe, databáza.
Odhad práce: < 15 min.
```

### Stealth pravidlá (Revolis tím)

- V e-maili Smolkovi **nemenovať Seligu/Webex** v prvej správe — len „Vaša reklama“ / „ak budete chcieť rovnaké na webe“.
- Neoslovovať Webex pred Fázou 0 výsledkami.
- Nezmieňovať odmietnutý export — widget s ním nesúvisí.
- Ak Seliga kontaktuje Revolis priamo: odpoveď = „hosted landing page pre klienta, bez integrácie s Realvia“.


| Overiť | Otázka | Pass |
|---|---|---|
| Dopyt | Zodpovedané dôkazom (vlastný formulár + Ads) — len potvrdiť: „Koľko dopytov na ocenenie mesačne dnes príde cez ponuka-dopyt?“ | Číslo alebo aspoň rádový odhad |
| Distribúcia | Kanál č. 1 = Ads A/B (Revolis URL vs. ponuka-dopyt, **bez Webexu**). „Aký bude kanál č. 2?“ + „Kto mení cieľovú URL reklamy — Vy, agentúra, alebo Webex?“ | Fáza 0 spustiteľná bez webmastera |
| Kvalita | „Ktoré 3 údaje rozhodnú, či lead stojí za hovor?“ | Jasná minimálna kvalifikácia bez zbytočných polí |
| SLA | „Kto odpovie a do koľkých minút/hodín?“ | Menovaný vlastník fronty + merateľný čas |

Cenová otázka sa klientovi **nekladie** (widget je v balíku — pozri Cenovú stratégiu). Cenovú hypotézu validuje trh: prispeje widget k podpisu Molnára ako 2. platiaceho zákazníka Revolisu?

## Pilotný kontrakt (14 dní)

- **Tenant:** len Reality Smolko; Molnár až po samostatnej dohode a vytvorení vlastnej agentúry.
- **Nasadenie:** pozri **Webex bypass stratégia** — Fáza 0 (Ads → Revolis, bez Webexu) je povinná; Fáza 1 (tlačidlo na webe) voliteľná až po dôkaze alebo paralelne ak Smolko tlačí na Webex.
- **Distribúcia:** kanál č. 1 = Google Ads A/B (Revolis URL vs. ponuka-dopyt); agentúra dodá kanál č. 2. Revolis nemá robiť externú kampaň bez GO.
- **SLA:** prvý osobný kontakt do `__` minút počas pracovných hodín; mimo nich najneskôr nasledujúce pracovné ráno.
- **Úspech:** minimálne `__` odoslaných formulárov, `__` kvalifikovaných seller rozhovorov a `__` obhliadok. Bez vopred doplnených čísel sa pilot nespúšťa.
- **Meranie:** `valuation_started`, `valuation_completed`, `lead_submitted`, prvý kontakt a výsledok kvalifikácie; žiadne fikčné KPI.

## Dátová brána — pred akýmkoľvek cenovým pásmom

1. Zapísať konkrétny zdroj, licenciu, územné pokrytie, dátum aktualizácie a metodiku.
2. Zdroj musí povoľovať komerčné použitie. Portálové dáta bez partnerstva/API sa nepoužijú; osobné údaje z inzerátov sa nikdy nezbierajú.
3. Cenové pásmo vypočítať deterministicky z verziovaných vstupov. LLM smie vysvetliť rozsah, nie ho vymyslieť.
4. Ak zdroj nepokrýva lokalitu alebo má nízku kvalitu, výsledok musí byť: **„Na spoľahlivý online rozsah nemáme dáta; maklér pripraví osobný odhad.“**

**GO DATA:** pomenovaný, licencovaný a reprodukovateľný zdroj.  
**NO-GO DATA:** „hodnoty dodá Claude/founder“, neoverený scraping alebo placeholder prezentovaný ako trhový odhad.

## Právny text a GDPR brána

- Pred odoslaním: link na tenantovo správny Privacy Notice, identita prevádzkovateľa, účel (vyžiadaný orientačný odhad + kontakt maklérom), retenčná lehota a kontakt na uplatnenie práv.
- Povinné potvrdenie: „Beriem na vedomie Privacy Notice.“ Nie je to marketingový súhlas.
- Marketingový kontakt: samostatný, nepovinný opt-in; nesmie blokovať odhad.
- Uložiť: verziu privacy textu, timestamp potvrdenia, tenant/agency ID a minimálne potrebné kontaktné údaje.
- Pred pilotom potvrdiť s AKMV právny základ a controller/processor roly; žiadne spracovanie len na základe neurčitého checkboxu.

## Rozhodnutie po validácii

| Stav | Podmienka | Ďalší krok |
|---|---|---|
| BUILD | Dopyt, 2 distribučné kanály, SLA a data/GDPR brány sú potvrdené | Wave 0 v samostatnom PR |
| ITERATE | Dopyt existuje, ale chýba distribúcia alebo SLA | Upraviť pilotný kontrakt, bez kódu |
| BACKLOG | Chýba legálny cenový zdroj alebo klient nezaviaže distribúciu/SLA | Nespúšťať widget; zbierať dôkaz |

