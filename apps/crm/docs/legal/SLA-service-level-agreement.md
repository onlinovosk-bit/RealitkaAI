# SERVICE LEVEL AGREEMENT (SLA)

**Príloha k VOP / MSA platformy Revolis.AI**
**Účinnosť od:** 15. apríla 2026
**Verzia:** 2.0

---

## 1. PREHĽAD

Táto dohoda o úrovni služieb (SLA) definuje garantované parametre dostupnosti, výkonu a podpory platformy Revolis.AI. SLA je neoddeliteľnou súčasťou VOP a, ak existuje, MSA.

---

## 2. DOSTUPNOSŤ PLATFORMY

### 2.1 Garantovaná dostupnosť

| Plán | Mesačná dostupnosť | Maximálny výpadok/mesiac |
|---|---|---|
| Starter | 99,5 % | ~3,6 hodiny |
| Pro | 99,7 % | ~2,2 hodiny |
| Enterprise | 99,9 % | ~43 minút |

### 2.2 Výpočet dostupnosti

Dostupnosť (%) = ((Celkový čas v mesiaci − Neplánovaný výpadok) / Celkový čas v mesiaci) × 100

**„Celkový čas v mesiaci"** = počet minút v kalendárnom mesiaci.

**„Neplánovaný výpadok"** = čas v minútach, počas ktorého bola Platforma pre Zákazníka nedostupná z dôvodu na strane Poskytovateľa, meraný monitorovacím systémom Poskytovateľa (uptime monitoring).

### 2.3 Výnimky z výpadku (nezapočítavajú sa)

Do výpadku sa NEZAPOČÍTAVAJÚ:
- (a) plánované údržbové okná (oznámené min. 48h vopred);
- (b) výpadky spôsobené tretími stranami (ISP, cloud provider force majeure);
- (c) výpadky spôsobené konaním Zákazníka (DDoS z jeho systémov, porušenie fair use);
- (d) výpadky spôsobené vyššou mocou (čl. 7 tohto SLA);
- (e) výpadky funkcionality závislej na externých API (Stripe, e-mail provideri), ak externé API nie je dostupné.

### 2.4 Plánovaná údržba

- Okno: nedeľa 02:00 – 06:00 CET
- Frekvencia: max. 2× mesačne
- Oznam: min. 48 hodín vopred (e-mail + notifikácia v Platforme)
- Núdzové patche (kritické bezpečnostné záplaty): bez predchádzajúceho oznámenia, s následnou informáciou do 24 hodín

---

## 3. VÝKON (PERFORMANCE)

### 3.1 Odozva aplikácie

| Metrika | Cieľ (P95) | Meranie |
|---|---|---|
| Načítanie dashboardu | < 2 s | Server-side render + initial load |
| API response (CRUD operácie) | < 500 ms | Server response time |
| AI skórovanie (IPK) | < 3 s | End-to-end výpočet |
| AI odporúčania (generatívne) | < 8 s | Vrátane inference externého modelu |
| AI asistent (NEXUS AI) odpoveď | < 30 s | End-to-end čas odpovede asistenta |
| Vyhľadávanie | < 1 s | Full-text + sémantické vyhľadávanie |
| Export dát (CSV, do 10 000 záznamov) | < 30 s | Generovanie + download |

P95 = 95. percentil, t.j. 95 % požiadaviek je vybavených v rámci uvedeného limitu.

Poskytovateľ negarantuje fixnú percentuálnu presnosť AI scoringu, keďže výsledky závisia od kvality, úplnosti a aktuálnosti vstupných dát Zákazníka a od vonkajších trhových faktorov. Poskytovateľ sa zaväzuje k odbornej starostlivosti pri vývoji, testovaní, monitorovaní a priebežnom zlepšovaní modelov.

### 3.2 Kapacita

| Parameter | Starter | Pro | Enterprise |
|---|---|---|---|
| Max. záujemcov (leads) | 500 | 5 000 | neobmedzené |
| Max. nehnuteľností | 200 | 2 000 | neobmedzené |
| Max. používateľov | 3 | 15 | individuálne |
| API volaní/hodinu | 100 | 1 000 | 10 000+ |
| Úložisko dokumentov | 1 GB | 10 GB | individuálne |

---

## 4. TECHNICKÁ PODPORA

### 4.1 Kanály podpory

| Kanál | Starter | Pro | Enterprise |
|---|---|---|---|
| Knowledge base / dokumentácia | ✅ | ✅ | ✅ |
| E-mailová podpora | ✅ | ✅ | ✅ |
| Chat podpora (pracovné dni) | ❌ | ✅ | ✅ |
| Telefónna podpora | ❌ | ❌ | ✅ |
| Dedikovaný account manager | ❌ | ❌ | ✅ |
| Prioritná eskalácia | ❌ | ❌ | ✅ |

### 4.2 Klasifikácia incidentov a reakčné doby

| Priorita | Definícia | Reakčná doba (Pro) | Reakčná doba (Enterprise) | Cieľ vyriešenia |
|---|---|---|---|---|
| **P1 — Kritický** | Platforma je úplne nedostupná pre všetkých používateľov, alebo dochádza k strate dát | 1 hodina | 30 minút | 4 hodiny |
| **P2 — Vysoký** | Kritická funkcionalita (AI moduly, párovanie, komunikácia) je nefunkčná bez workaround-u | 4 hodiny | 2 hodiny | 12 hodín |
| **P3 — Stredný** | Funkčnosť je narušená, existuje workaround. Výkon je výrazne degradovaný | 8 hodín (prac. dní) | 4 hodiny | 3 pracovné dni |
| **P4 — Nízky** | Estetická chyba, vylepšenie, nízky dopad na používanie | 2 pracovné dni | 1 pracovný deň | Podľa roadmapy |

**Reakčná doba** = čas od prijatia hlásenia do prvej kvalifikovanej odpovede (potvrdenie, klasifikácia, prvá diagnostika).

**Cieľ vyriešenia** = cieľový čas na vyriešenie alebo dodanie workaround-u. Nie je garantovaný, je to best-effort cieľ (okrem P1 pri Enterprise).

### 4.3 Prevádzkové hodiny podpory

| Plán | Hodiny |
|---|---|
| Starter | Po–Pia, 9:00–17:00 CET |
| Pro | Po–Pia, 8:00–20:00 CET |
| Enterprise | Po–Ne, 8:00–22:00 CET (P1: 24/7) |

---

## 5. KREDITY ZA NEDODRŽANIE SLA (SERVICE CREDITS)

### 5.1 Nárok na kredit

Ak mesačná dostupnosť klesne pod garantovanú úroveň, Zákazník má nárok na kredit podľa nasledovnej tabuľky:

| Dostupnosť | Kredit (% mesačného poplatku) |
|---|---|
| < garantovaná, ≥ 99,0 % | 5 % |
| < 99,0 %, ≥ 98,0 % | 10 % |
| < 98,0 %, ≥ 95,0 % | 25 % |
| < 95,0 % | 30 % |

### 5.2 Podmienky uplatnenia

- (a) Zákazník musí uplatniť kredit písomne (e-mail) do 30 dní od konca dotknutého mesiaca;
- (b) žiadosť musí obsahovať dátumy a časy výpadkov;
- (c) Poskytovateľ overí výpadky na základe vlastného monitorovacieho systému;
- (d) kredit sa uplatní ako zápočet voči nasledujúcej faktúre;
- (e) kredit sa NEVYPLÁCA v hotovosti.

### 5.3 Maximálny kredit

Celkový kredit za jeden kalendárny mesiac nesmie presiahnuť 30 % mesačného poplatku Zákazníka. Kredity sú jediným a výlučným opravným prostriedkom Zákazníka za nedodržanie dostupnosti podľa SLA (okrem práva na ukončenie zmluvy podľa VOP čl. 12.2(b) v prípade opakovaného nedodržania).

---

## 6. ESKALAČNÝ PROCES

### 6.1 Eskalačné úrovne (Enterprise)

| Úroveň | Kontaktná osoba | Čas eskalácie (od nahlásenia) |
|---|---|---|
| L1 | Technická podpora | 0 – 2 hodiny |
| L2 | Seniorný inžinier / DevOps | 2 – 4 hodiny |
| L3 | CTO / Technical Lead | 4 – 8 hodín |
| L4 | CEO / Executive escalation | > 8 hodín alebo na žiadosť |

### 6.2 Postmortem

Pre každý P1 incident Poskytovateľ vypracuje a doručí Zákazníkovi postmortem správu do 5 pracovných dní, obsahujúcu:
- opis incidentu a timeline;
- root cause analysis;
- dotknutí zákazníci a rozsah dopadu;
- prijaté opatrenia a preventívne kroky.

---

## 7. VYŠŠIA MOC (FORCE MAJEURE)

Poskytovateľ nie je zodpovedný za nedodržanie SLA spôsobené okolnosťami mimo jeho primeranú kontrolu, vrátane: prírodných katastrof, vojnových konfliktov, teroristických útokov, pandémií, vládnych opatrení, výpadkov elektrickej energie alebo internetu v celom regióne, a výpadkov cloud infraštruktúry poskytovateľa (AWS/Vercel) presahujúcich ich vlastné SLA záväzky.

---

## 8. REPORTING A TRANSPARENTNOSŤ

### 8.1 Status stránka

Poskytovateľ prevádzkuje verejne dostupnú status stránku s informáciami o aktuálnej dostupnosti, plánovanej údržbe a histórii incidentov.

### 8.2 Mesačný report (Enterprise)

Zákazníci s plánom Enterprise dostávajú mesačný report obsahujúci:
- dosiahnutú dostupnosť;
- výkonnostné metriky (P95 odozvy);
- prehľad incidentov a ich riešenia;
- využitie kapacity (leads, API volania, úložisko).

---

## 9. AI RELEASE GOVERNANCE A ROLLBACK SLA

9.1. Poskytovateľ nebude zavádzať podstatné zmeny AI správania bez zákaznícky dostupného changelogu.

9.2. Každá podstatná AI zmena obsahuje minimálne:
- (a) dátum nasadenia;
- (b) stručný popis dopadu;
- (c) dotknuté moduly/funkcie;
- (d) dostupný rollback alebo mitigation plán.

9.3. Pri preukázanej regresii spôsobenej AI release Poskytovateľ:
- (a) poskytne workaround bezodkladne;
- (b) rozhodne o rollbacku alebo oprave najneskôr do 5 pracovných dní;
- (c) poskytne incident summary zákazníkom s dotknutými tenantmi.

9.4. Operačný rámec k tomuto článku je detailne popísaný v `ANNEX-E-AI-CHANGE-LOG-RELEASE-GOVERNANCE.md`.

---

## 10. BCP/DR ANNEX (BUSINESS CONTINUITY A DISASTER RECOVERY)

10.1. Poskytovateľ prevádzkuje plán kontinuity prevádzky a obnovy po havárii (BCP/DR) pre kritické časti služby.

10.2. Cieľové parametre obnovy:
- **RTO (Recovery Time Objective):** 8 hodín pre produkčné služby;
- **RPO (Recovery Point Objective):** 1 hodina pre transakčné dáta.

10.3. Poskytovateľ vykoná minimálne 1 plánovaný DR test ročne a na vyžiadanie poskytne enterprise zákazníkovi executive summary výsledkov testu.

10.4. Ak incident presiahne RTO/RPO ciele, Poskytovateľ poskytne zákazníkovi korektívny plán s termínmi nápravy.

10.5. Detailné BCP/DR postupy sú uvedené v `ANNEX-F-BCP-DR.md`.

---

## 11. KRITICKÉ THIRD-PARTY ZÁVISLOSTI A DEGRADE MODE

11.1. Ak je kritická tretia strana (AI API, cloud, komunikačný gateway) nedostupná, Poskytovateľ aktivuje degrade mode.

11.2. Degrade mode môže zahŕňať:
- (a) dočasné vypnutie generatívnych funkcií pri zachovaní core CRM;
- (b) nahradenie AI odpovedí fallback logikou;
- (c) obmedzenie throughputu API pre stabilizáciu prevádzky.

11.3. Aktivácia degrade mode sa považuje za oprávnené mitigation opatrenie, nie za zmenu zmluvného rozsahu služby.

---

## 12. AI INCIDENT TAXONÓMIA A KOMUNIKAČNÝ ŠTANDARD

12.1. Poskytovateľ klasifikuje AI incidenty minimálne na:
- (a) model quality incident (výrazná regresia kvality výstupov);
- (b) safety/content incident (nevhodný alebo rizikový výstup);
- (c) automation incident (neželaná automatizovaná akcia);
- (d) privacy/security incident.

12.2. Pri P1/P2 AI incidente Poskytovateľ zverejní prvý zákaznícky update do 2 hodín od potvrdenia incidentu a následne aktualizácie minimálne každé 4 hodiny do stabilizácie.

12.3. Zákaznícka komunikácia obsahuje minimálne: rozsah dopadu, dočasné opatrenia, ETA nápravy a odporúčané kroky na strane zákazníka.

12.4. Bezpečnostné a operačné kontrolné opatrenia použité pri incidente sú mapované na `ANNEX-G-SECURITY-CONTROLS-SCHEDULE.md`.

---

**Revolis.AI**
Účinné od: 15. apríla 2026
Verzia: 2.0
