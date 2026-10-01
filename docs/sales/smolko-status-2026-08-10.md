# Smolko status — founder briefing (2026-08-10)

**Cieľová cesta:** `docs/sales/smolko-status-2026-08-10.md`
**Účel:** interný stav voči Reality Smolko (čo bolo sľúbené / pripravené, čo je na `main`, čo ešte nie).
**Nie je:** email, outreach draft ani text na odoslanie.
**Dôkazy:** len `docs/sales/` + merged/open PRs a `git log` na `origin/main` (stav k merge-base `b4681a98c`, 2026-08-11).
**„Na produkcii“** = mergnuté do `main` (Vercel production track). Runtime smoke produkcie v tomto briefingu nebol spúšťaný.

---

## 1) Čo bolo sľúbené / pripravené voči Smolkovi a kedy

| Dátum | Zdroj v `docs/sales/` | Čo (interný záväzok / demo materiál) |
|---|---|---|
| **2026-07-30, 8:00** | `smolko-inzerat-demo-2026-07-30.md` | Živá ukážka AI prepisu inzerátu na hovore: PRED→PO do 3 s. Konkrétny listing: 2i Sabinov, 131 000 €, 64 m² (maklérka Eva Burgrová). Predávať **metódu**, nie jeden odsek; priznať `[DOPLNIŤ]` polia. |
| **2026-08-06** | `smolko-inzeraty-3x-2026-08-06.md` | Tri ďalšie prepisy z live realitysmolko.sk: (1) RD Teriakovce 325k, (2) dva stavebné pozemky Ľubotice od 155,5k, (3) RD Modrá nad Cirochou (cena v RK). Rovnaký rukopis ako Sabinov; vstup do promptu generátora (A3). |
| *(playbook, bez dátumu hovoru)* | `listing-video-playbook.md` | Pilot #1 Listing Video u Smolka: 15 s Reel z 1 aktívnej ponuky + CTA na kalkulačku (`odhad.realitysmolko` / widget). Track B produktový modul **nestavať**. |
| *(mimo `docs/sales/`, kontext produktu)* | validation brief + Wave 0 PR #303 | Verejný odhadový widget pod značkou Smolko: `app.revolis.ai/odhad/reality-smolko`. Pilot Ads A/B (ponuka-dopyt vs. Revolis URL) — GO od Smolka, Webex nie je brána (`docs/briefs/validation-valuation-widget.md`, premortem `docs/premortems/2026-07-23-ads-smolko-ab.md`). |

**Poznámka k sľubom:** v `docs/sales/` nie je zápis „podpísanej“ feature roadmapy od Smolka — sú demo/hovorové podklady (inzeráty) + produktový pilot widgetu. CRM tenancy / Realvia / triage už bežia ako platiaci klient (ops mimo tohto briefingu).

---

## 2) Čo je skutočne na produkcii (`main`)

### Valuation / odhad widget

| Položka | Stav | Dôkaz |
|---|---|---|
| Public widget Smolko (`/odhad/reality-smolko`) | **ÁNO** | #303 merged 2026-07-20 — „public odhad widget for Smolko pilot (Wave 0)“ |
| Estimate flow + contact/property kroky, band UI | **ÁNO** | #306, #307, #309, #311, #313, #338 (júl 2026); smoke URL docs #346 (2026-08-02): `app.revolis.ai/odhad/reality-smolko` |
| **City anchors** (Poprad, Prešov, Michalovce, Humenné) — koniec tichého national fallback | **ÁNO** | **#372** merged 2026-08-06 |
| **Priznané cenové rozpätie v UI** | **ÁNO** | **#373** merged 2026-08-06 |
| **NBS atribúcia** (povinný text po povolení 2026-08-10) | **NIE** | Legal doc je na `main` (`docs/legal/nbs-povolenie-2026-08-10.md` cez #383), ale UI/API atribúcia je **open PR #382** (`feat/nbs-atribucia`) — CI zelené, **nemerged** |
| ŠÚ SR sp3801qr ingest (PO+KE) | Dáta na `main`, **neprepojené** do výpočtu | #380 merged 2026-08-11 — explicitne „not wired“ |

### Listing generator (AI inzerát)

| Položka | Stav | Dôkaz |
|---|---|---|
| Starší capability Listing Generator (UC properties) | **ÁNO** (jún) | #219 |
| Persist draftov `ai_generations` | **ÁNO** (kód na `main`) | #359 merged 2026-08-04 — migráciu mal aplikovať founder pred merge; overenie DB mimo tohto briefingu |
| FINAL system prompt wire (PR-A) | **ÁNO** | #375 merged 2026-08-07 |
| `charakterLokality` + minimálna UI `/inzerat-generator` (PR-B) | **ÁNO** | #376 merged 2026-08-10 — page existuje na `main` |
| Plný „broker UI“ stack zo staršieho chainu (#360–#363) | **NIE / supersedované** | Open PRs #360–#366 — #376 poznamenáva, že #361 nebol na `main` a PR-B landol minimálny surface |

**Verdikt listing generator:** jadro (prompt + API + minimálna generátorová stránka) je na `main`. Sales demo texty (Sabinov + 3× 06.08.) sú podklady, nie automaticky publikované na realitysmolko.sk.

### Ostatné relevantné na `main`

- Docs pack so Smolko podkladmi / legal rename: #383 (2026-08-11).
- Isolácia SYSTEM usage od Smolko tenant ID: #343 / #355.

---

## 3) Hotové v repozitári, ale nenasadené (alebo nespustené voči nemu)

| Vec | Kde | Prečo ešte nie „u Smolka“ |
|---|---|---|
| **NBS attribution line** vo widgete + `sources` v estimate API | Open **PR #382** (CI OK, Preview OK) | Čaká merge do `main` / production deploy |
| ŠÚ SR indexy vo valuácii | #380 na `main`, bez wire | Ingest only — žiadna atribúcia/calc |
| Listing video 15 s pilot | `listing-video-playbook.md` | Playbook; v `docs/sales/` nie je dôkaz odovzdaného Reelu |
| Google Ads A/B (ponuka-dopyt vs `/odhad/reality-smolko`) | validation brief + premortem 2026-07-23 | Premortem: chýba rozpočet/cap/metrika + reálny hlas Smolka pred GO — v sales docs nie je záznam „kampaň beží“ |
| Publikácia AI textov na portál/web | `smolko-inzerat-*.md` | Interné demo; `[DOPLNIŤ]` polia otvorené |
| Starší listing-gen chain PRs | #360–#366 open | Prekryté minimálnym surface z #376; nechať zatvoriť / rebase podľa foundera |

---

## 4) Otvorené otázky smerom k Smolkovi

Z `smolko-inzeraty-3x-2026-08-06.md` a súvisiacich sales/produkt docs — **na neho**, nie interný backlog:

1. **Ľubotice — sú dva pozemky skutočne susediace?** Inzerát to nepíše explicitne; spoločná cesta to len naznačuje. Ak áno → silný uhol „kúpte oba / dom pri rodičoch“. Ak nie → preformulovať titulok č. 2 a odsek „kúpte oba“.
2. **Ľubotice — šírka každého pozemku samostatne?** V inzeráte je 24–26 m bez priradenia k parcelám.
3. **Teriakovce / Modrá / Sabinov — `[DOPLNIŤ]` pred publikáciou** (vzdialenosť do centra, energetický certifikát, parkovanie, solár, stav dokončenia Modrá, cena Modrá namiesto „v RK“, orientácia/výmera záhradky Sabinov, …).
4. **Ads A/B GO:** koľko nových dopytov týždenne stíha tím zavolať do 24 h? (premortem — bez odpovede neštartovať kampaň.)
5. **Listing video pilot:** ktorá 1 aktívna ponuka + súhlas s fotkami na 15 s Reel s CTA na odhad?
6. **Widget distribúcia:** ostáva Ads → `app.revolis.ai/odhad/reality-smolko`, alebo chce mirror/tlačidlo na realitysmolko.sk (Webex len 1 link — validation brief)?

---

## 5) Jednovetový status pre foundera

**Widget s city anchors + priznaným pásmom je na `main`; NBS atribúcia ešte nie (PR #382). Listing generator (FINAL prompt + `/inzerat-generator`) je na `main`. Sales materiál = 1 hovorový demo inzerát (30.07.) + 3 prepisy (06.08.) s otvorenou otázkou na susednosť Ľubotíc; Ads A/B a listing video pilot v docs nie sú potvrdené ako spustené.**

---

## Zdroje (evidence index)

- `docs/sales/smolko-inzerat-demo-2026-07-30.md`
- `docs/sales/smolko-inzeraty-3x-2026-08-06.md`
- `docs/sales/listing-video-playbook.md`
- `docs/briefs/validation-valuation-widget.md`
- `docs/premortems/2026-07-23-ads-smolko-ab.md`
- `docs/legal/nbs-povolenie-2026-08-10.md`
- Merged: #303, #372, #373, #359, #375, #376, #380, #346, #383
- Open: #382 (NBS atribúcia); listing-gen leftovers #360–#366
