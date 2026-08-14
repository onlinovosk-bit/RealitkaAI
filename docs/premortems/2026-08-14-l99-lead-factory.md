# PREMORTEM: L99 Lead Factory Initiative (Fáza 1 hranica + metrika)

**Cieľová cesta:** `docs/premortems/2026-08-14-l99-lead-factory.md`
**Podľa šablóny:** `docs/templates/premortem.md`
**Iniciatíva:** [`docs/briefs/l99-lead-factory-initiative.md`](../briefs/l99-lead-factory-initiative.md)
**Timebox:** dodržaný (dokumentácia, nie kampaň)

---

## KROK 1 — Podklad

| Časť | Stav |
|------|------|
| Cieľ | Zamknúť Fázu 1 na first-party/verejné zdroje; prijať definíciu „predhriaty lead“ pred kódom |
| Metrika úspechu | Návrh C0/C1/C2 v briefe §2 — **ešte nie je GO** |
| Stakeholderi | Founder (Andrej); platiaci klient = RK; zdroj leadu = predávajúci; spotrebiteľ = maklér (Smolko ako referencia) |
| Scope + rozpočet | Tento PR = dokumenty. Ads rozpočet **nie je** v tomto bet (existuje samostatný Ads A/B premortem 2026-07-23). External listy = OFF |
| Míľniky | (1) merge briefu · (2) GO na §2 · (3) až potom merací BO |
| Časová os | Fáza 1 = SR; CZ/EÚ neskôr |
| Komunikačný plán | Žiadny vonkajší announce. Otázka Smolkovi pred live C1 (nižšie) |

- [x] Plán: brief má 7 častí. Metrika je **návrh**, nie schválené číslo — premortem to berie ako riziko, nie ako fakt.

---

## KROK 2 — Perspektívy

1. **Founder (F):** biznis — agentúry odmietajú CRM bez predávajúcich (D-2026-08-06-01). Riziko, že program zje šírku backlogu namiesto jednej merateľnej veci.
2. **Adversariálny inžinier (T):** `last_contact` je text; C1 sa dnes nedá spočítať bez lži. AP-011/stealth drift. Chýbajúci `gdpr-advisor` súbor pri sľube v CLAUDE.md.
3. **Zákazník — Smolko (Z):** simulované z reálneho kontextu (1 owner-maklér, 439 identít, Ads na ocenenie, kapacita volania obmedzená). **Reálny hlas v tomto premorteme chýba.**
4. **Externý realizátor — Novák / Ads (N):** relevantný až keď C0 tečie z kampane. Použité riziká z premortemu `2026-07-23-ads-smolko-ab.md` (CPL, geo, UTM), nie nový odhad.

- [ ] Min. 1 hlas od reálnej druhej osoby: **NESPLNENÉ**. Premortem je **podmienečný** do odpovede Smolka.

**Otázka Smolkovi (draft, GO na odoslanie):**

> Koľko **nových** dopytov na ocenenie / predaj týždenne reálne stíhate **zavolať do 4 hodín** v pracovnej dobe — a kto je menovaný vlastník tej fronty, keď ste na obhliadke?

Bez odpovede nevyhlasovať C1 za live KPI (kill signál v Kroku 6, riziko #1).

---

## KROK 3+4 — Imaginácia zlyhania

Je **13. september 2026**. Iniciatíva zlyhala, pretože:

| # | Riziko (minulý čas, konkrétne) | Hlas | Kat. |
|---|---|---|---|
| 1 | Widget nabehol, Ads tĺkli C0, Smolko volal až na 3. deň — 12 majiteľov už malo zmluvu s inou RK; minuli sme budget na kontakty, ktoré vychladli | Z | TRH |
| 2 | Dashboard ukázal „67 % predhriatych“ spočítaných z `status=Nový` a textu „Práve vytvorený“ — číslo bolo falošné (AP-001), Molnár to videl na demo a prestal veriť | T | TECH |
| 3 | Niekto znovu otvoril stealth/recruiter pod iným menom „lead factory ingest“; AP-011 regex to nechytil, kým legal hold nebol v kóde | T | PRÁVO |
| 4 | Founder spustil „councily a knowledge base“ paralelne s meraním; za 30 dní pribudli dokumenty, C1 ostalo 0, D-2026-08-06-01 šírka zjedla prioritu | F | PREVÁDZKA |
| 5 | External provider sa zapol „len na test“ bez DPA; 800 riadkov PII v `leads` bez čl. 14; RK ako prevádzkovateľ nesie pokutu | F | PRÁVO |
| 6 | Geo Ads mimo Smolkovho rádiusa (celé SK) — 60 % C0, ktorým kancelária nevie slúžiť, CPL bez zmyslu | N | BIZNIS |
| 7 | UTM/GA4 sa zlomilo na redirecte; po 14 dňoch nešlo povedať, či widget bije ponuka-dopyt — A/B z `2026-07-23` sa zopakoval | N | TECH |
| 8 | Jurisdikcia sa hardcoded na SK v GDPR copy widgetu; prvý CZ tenant dostal SK privacy text — sťažnosť | T | PRÁVO |
| 9 | `gdpr-advisor` sa v briefe tvrdil ako existujúci skill; agent Fázy 1 „prešiel GDPR gate“ bez súboru — balancing test nikto neurobil | T | PREVÁDZKA |
| 10 | C0 rástlo, maklér nemal notifikáciu (e-mail v spame); leady ležali v CRM | Z | TRH |

---

## KROK 5 — Matica P×Z

| # | P | Z | Skóre | Pásmo |
|---|---|---|---|---|
| 1 | 3 | 3 | **9** | MITIGÁCIA POVINNÁ |
| 2 | 3 | 3 | **9** | MITIGÁCIA POVINNÁ |
| 4 | 3 | 2 | **6** | MITIGÁCIA POVINNÁ |
| 5 | 2 | 3 | **6** | MITIGÁCIA POVINNÁ |
| 6 | 2 | 3 | **6** | MITIGÁCIA POVINNÁ |
| 7 | 2 | 3 | **6** | MITIGÁCIA POVINNÁ |
| 10 | 2 | 3 | **6** | MITIGÁCIA POVINNÁ |
| 3 | 1 | 3 | 3 | vlastník sleduje |
| 8 | 1 | 3 | 3 | vlastník sleduje |
| 9 | 2 | 2 | 4 | zapísať + sledovať |

---

## KROK 6 — Mitigácie (zmena PLÁNU, nie sľub)

| # | Mitigácia v briefe / ďalšom BO | Vlastník | Kill / stop signál | Check-in |
|---|--------------------------------|----------|--------------------|----------|
| 1 | C1 vyžaduje zaznamenaný pokus o kontakt; C0 samotné nie je success. SLA číslo čaká na Smolka. Live C1 KPI až po odpovedi | Founder | 3 C0 bez pokusu o kontakt >24 h → PAUZA Ads na widget | denne prvý týždeň po GO merania |
| 2 | C1 sa nesmie renderovať ako live %, kým nie je timestamp kontaktu. Dovtedy `pending` (AP-001). Žiadny fake menovateľ | Agent v meracom BO | Akýkoľvek % „predhriatych“ bez `lead_events` / ekvivalentu → STOP merge | pri PR review |
| 4 | Scope tohto betu = definícia + neskôr meranie existujúceho widgetu. Councily/KB v BACKLOG. 1 PR = 1 logická zmena | Founder + task-loop | Nový PR s „council“ / „knowledge base 1000 strán“ bez samostatného GO → zatvoriť | každý PR |
| 5 | External providers default OFF; odomknutie len podpísaný 6(1)(f)+DPA. Tento PR nepridáva adapter | Founder | Insert do `leads` zo zdroja mimo allowlistu Fázy 1 → revert + legal | pri každom ingest PR |
| 6 | Ads geo ostáva v existujúcom Ads premorteme (okresy Smolka), nie v tomto bete | Novák / Founder | >20 % klikov mimo geo → oprava 24 h | týždenne keď Ads bežia |
| 7 | Tracking deň −1 pred kampaňou (už v Ads premorteme). Lead Factory nespúšťa kampaň | Novák | deň 1 bez GA4 → PAUZA Ads | deň 1, 3 |
| 10 | Reuse existujúcej inbound notifikácie (triage); merací BO overí, že C0 spúšťa alert | Agent | 2 C0 bez notifikácie v logu → hotfix pred ďalším Ads dňom | pri meracom BO |
| 9 (skóre 4) | Brief **explicitne** hovorí, že `gdpr-advisor` súbor chýba — nesľubovať gate | Founder | CLAUDE.md tvrdenie bez súboru = chore na samostatný PR | pri GDPR featúre |

- [x] Brief bol zmenený podľa mitigácií: C1 nie je submit; AP-001 pending; external OFF; gdpr-advisor označený ako MEDZERA; councily OUT.
- [ ] Top riziká v `brain/registry` s review dátumom: **až po merge tohto PR** (`npm run brain:ingest` nie je v tomto PR — catalog.ts nemeníme, 1 logická zmena = dokument). Review dátum návrhu: **2026-09-14**.
- [ ] Reálny hlas Smolka: otvorené.

### Kvalitatívna brána

- 4 hlasy vyplnené; **1 reálny externý chýba** (zapísané prečo) → premortem je slabší, C1 live zakázané do odpovede.
- ≥8 príčin, 5 kategórií ✓
- Matica + mitigácie pre skóre ≥6 ✓
- Plán (brief) upravený ✓
- Brain zápis odložený na po-merge (vedomý dlh, nie tichý)
