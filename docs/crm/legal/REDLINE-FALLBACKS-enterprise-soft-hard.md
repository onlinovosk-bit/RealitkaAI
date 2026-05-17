# REDLINE-READY ENTERPRISE FALLBACKS (SOFT/HARD)

**Produkt:** Revolis.AI  
**Dátum:** 15. apríla 2026  
**Účel:** Vyjednávací manuál pre legal/sales pri enterprise redlinoch.

---

## Ako používať

- **Hard** = ideálna pozícia Poskytovateľa (max ochrana).  
- **Soft** = obchodne prijateľný kompromis, ak je deal strategický.  
- Nikdy neponúkať soft fallback bez výmeny hodnoty (vyššia cena, dlhší term, menší scope záväzku).

---

## 1) Limitácia zodpovednosti

### Hard
„Celková kumulatívna zodpovednosť Poskytovateľa za všetky nároky vyplývajúce zo Zmluvy je obmedzená na sumu poplatkov skutočne zaplatených Zákazníkom za posledných 12 mesiacov pred vznikom nároku. Nepriame a následné škody sú vylúčené.“

### Soft
„Celková kumulatívna zodpovednosť Poskytovateľa je obmedzená na 150 % poplatkov zaplatených za posledných 12 mesiacov. Nepriame škody zostávajú vylúčené; výnimky len pre úmysel, hrubú nedbanlivosť, porušenie mlčanlivosti a IP indemnity.“

---

## 2) Indemnification (IP + Data)

### Hard
„Poskytovateľ odškodní Zákazníka len za nároky tretích strán z porušenia IP práv samotnou Platformou. Zákazník odškodní Poskytovateľa za nároky súvisiace s dátami vloženými bez právneho základu, porušením GDPR zo strany Zákazníka a reverse engineeringom.“

### Soft
„Poskytovateľ poskytne rozšírené IP indemnity vrátane primeraných nákladov právnej obrany, pričom strop indemnity je 150 % 12-mesačných poplatkov. Zákazník poskytne recipročné data indemnity.“

---

## 3) AI Liability a presnosť

### Hard
„AI výstupy sú pravdepodobnostné odporúčania. Poskytovateľ negarantuje konkrétnu presnosť modelu a nenesie zodpovednosť za finálne obchodné rozhodnutia Zákazníka.“

### Soft
„Poskytovateľ sa zaväzuje k odbornej starostlivosti pri vývoji modelov, monitoringu driftu a incident review. Finálna zodpovednosť za použitie výstupov zostáva na Zákazníkovi.“

---

## 4) Explainability vs. obchodné tajomstvo

### Hard
„Poskytovateľ poskytuje explainability light (hlavné faktory vstup/výstup). Zdrojový kód, váhy modelov, prompt knihovňa a interná logika zostávajú neverejné.“

### Soft
„Poskytovateľ poskytne rozšírené business-level vysvetlenie faktorov skóre a decision rationale, bez sprístupnenia interných modelových parametrov.“

---

## 5) Data residency

### Hard
„Primárne spracovanie v EÚ; cezhraničné prenosy len pri nevyhnutnosti a pod SCC + TIA.“

### Soft
„EÚ-only processing addendum pre enterprise plán, s explicitným zoznamom výnimiek (AI inference/komunikácie) a audit trailom prenosov.“

---

## 6) Audit práva

### Hard
„1 audit ročne, 30 dní notice, remote-first, na náklady Zákazníka. Alternatívne SOC2/ISO report.“

### Soft
„1 audit ročne + ad hoc audit pri P1 incidente. On-site audit len ak remote dôkazy nestačia. NDA povinné.“

---

## 7) SLA kredity

### Hard
„Service credits sú jediný a výlučný nárok za nedostupnosť. Strop kreditov 30 % mesačného poplatku.“

### Soft
„Pri opakovanom porušení SLA 3 mesiace po sebe má Zákazník právo na ukončenie bez sankcie + kredity podľa SLA.“

---

## 8) Price increase / CPI

### Hard
„Ročná CPI indexácia + mimoriadna úprava pri preukázanom raste third-party costs (AI API/cloud).“

### Soft
„CPI indexácia ostáva; mimoriadna úprava max 1× ročne a len nad definovaný cost-threshold (napr. +15 %).“

---

## 9) Reverse engineering / benchmarking

### Hard
„Výslovný zákaz reverse engineeringu, dekompilácie, benchmarkingu a extrakcie logiky; podstatné porušenie so skutkovou sankciou.“

### Soft
„Benchmarking možný len po písomnom súhlase Poskytovateľa a bez verejného zverejnenia výsledkov.“

---

## 10) Termination assistance

### Hard
„30-dňové export window, štandardné formáty CSV/JSON, bez povinnosti custom migrácie.“

### Soft
„30 dní + platená transition assistance (time & material), max 60 dní pri enterprise.“

---

## Vyjednávacie pravidlá (internal playbook)

1. **Nedávať uncapped liability** okrem zákonom nevylúčiteľných prípadov.  
2. **Nedávať raw model access** ani audit source code.  
3. **Každý soft fallback podmieniť trade-offom** (cena, termín, záväzok, scope).  
4. **Pri požiadavke na veľké výnimky eskalovať na CEO/GC** pred akceptáciou.  
5. **Všetky odchýlky evidovať v Deal Memo** pre budúce obnovy.

