# OVERNIGHT BRIEF — Guardian Quality Panel (zákaznícky viditeľný)

**Repo cesta tohto súboru:** `docs/briefs/overnight/overnight-brief-guardian-panel.md`
**Repo:** `onlinovosk-bit/RealitkaAI` · lokálne `C:\RealitkaAI` · PROD `app.revolis.ai`
**Vercel projekt:** `realitka-ai` · Root Directory `apps/crm`
**Base:** `main` @ `4ebb56ad9`
**Zákazník:** Reality Smolko (`agency_id 11111111-1111-1111-1111-111111111111`)
**Confidence:** Medium (1 production project, 1 paying customer)

---

## 1. CIEĽ (jedna veta)

Vyrenderovať **už existujúci** výstup Guardiana (completeness score + FLAGy) na detaile nehnuteľnosti ako zákaznícky viditeľný panel dôvery, plus ľudská brána pred zverejnením — aby maklér videl, že AI dáta pripravila, čo má skontrolovať, a že von nič nejde bez jeho potvrdenia.

Vizuálna predloha: panel „Guardian — kontrola kvality" so skóre, PASS položkami, FLAG kartou (rozpor v ploche) a zamknutým tlačidlom „Potvrdiť a zverejniť". (Mockup dodaný samostatne — drž sa jeho štruktúry, nie pixelov.)

## 2. PREČO (governance)

Toto je veto-pozitívne na všetkých 6 otázkach Ústavy:
- **01 Zaplatí konkrétny zákazník?** Áno — Smolko dostane viditeľnú istotu kvality inzerátu pred zverejnením.
- **04 Mám dáta?** Áno — Guardian skóre aj FLAGy už existujú (#235 Guardian multi-area, #231 HTML strip). NEVYMÝŠĽAME žiadne nové skóre.
- **05 Reverzibilné?** Áno — read-only view + brána je UI gate, žiadna deštruktívna akcia.
- **06 Hodnota pre zákazníka, nie architektúru?** Áno — jedna komponenta, žiadny nový systém.

## 3. ROZSAH — a explicitne NIE rozsah

**JE v rozsahu:**
1. Načítať existujúci Guardian výstup (completeness score + zoznam FLAGov) pre konkrétnu nehnuteľnosť do detailu.
2. Vyrenderovať `GuardianPanel` komponentu podľa mockupu (skóre, progress, PASS položky, FLAG karty, footer s bránou).
3. Ľudská brána: tlačidlo „Potvrdiť a zverejniť" je zamknuté, kým existuje aspoň jeden **blokujúci** FLAG. Vyriešenie FLAGu = štandardná reverzibilná editácia poľa (existujúca edit cesta), NIE nová mutácia, NIE delete.

**NIE je v rozsahu (ak sa to objaví → STOP a flag, nepokračovať):**
- Žiadna nová Guardian logika / nové skórovacie pravidlá / nový typ FLAGu.
- Žiadna nová DB migrácia. Ak panel potrebuje dáta, ktoré v zázname/API nie sú → STOP, napíš čo chýba, NEVYMÝŠĽAJ stĺpec.
- Žiadne nafúknuté skóre. Ak nehnuteľnosť nemá Guardian výstup → honest empty state („Kontrola ešte neprebehla"), NIE fiktívnych 100 %.
- Žiadny redesign detailu nehnuteľnosti, žiadne „pri tom aj…".

## 4. VLNA MODEL

**Jedna vlna, sekvenčne (NIE paralelný swarm).** Dôvod: všetky tri kroky sa stretávajú na tom istom detaile nehnuteľnosti a majú dátovú závislosť (panel potrebuje dáta; brána potrebuje stav FLAGov). Disjunktné cesty sa nedajú garantovať → pravidlo „pochybnosť = sekvenčne". Jeden branch, jedna PR, jedna CI.

**Branch:** `feat/guardian-visible-panel`

## 5. PHASE 0 — DISCOVERY (povinné pred písaním kódu)

Nepíš nič, kým toto nie je potvrdené v PR popise:
1. **Kde žije detail nehnuteľnosti?** Nájdi route/page komponentu (pravdepodobne `apps/crm/src/app/.../[id]/...` alebo ekvivalent). Zapíš presnú cestu.
2. **Odkiaľ prísť Guardian dáta?** `buildVerticalPackDemo()` → `scoreListingCompleteness()` + `generateListingDraft()` → `reviewGeneratedListing()`. Jediný completeness %: rubrika **9 polí** v `apps/crm/src/lib/capabilities/listing-score/score.ts`. Pre `13303557`: **44 %** (4/9) — úprimné; po #235 **žiadny** area FLAG (167/120/4500 m² validné). Test `free_text_area_mismatch` stále chytí fiktívnu plochu (napr. 999 m²).
3. **Existuje „zverejniť" akcia?** Nájdi publish/export akciu pre inzerát.
   - Ak existuje → brána ju podmieni stavom FLAGov.
   - Ak NEEXISTUJE → brána sa degraduje na nezablokujúci warning v paneli; bránu zaznač ako follow-up. NEVYMÝŠĽAJ publish flow.
4. **Write-probe:** over zápisovú cestu pre „vyriešenie FLAGu" (editácia plochy) na staging/lokálnej Supabase, nie na PROD.

## 6. KROKY

**Krok A — dátový hook (cesta podľa PHASE 0)**
Vystaviť Guardian výstup do detailu cez existujúci data layer. Tvar napr.:
`{ completeness: number, fields_checked: number, flags: Array<{ id, severity: 'blocking'|'warning', label, message }> }`
Žiadna nová logika — len mapovanie existujúceho výstupu.

**Krok B — komponenta**
`apps/crm/src/components/property/GuardianPanel.tsx` (cestu potvrď v PHASE 0)
- Skóre + progress bar (skóre úprimné, z dát).
- PASS položky (z reálnych checkov, nie hardcoded).
- FLAG karty (severity-farbené; blocking = warning štýl).
- Footer: zámka + text „AI pripravila. Ty potvrdíš. Von to nejde bez teba." + tlačidlo „Potvrdiť a zverejniť".
- Empty state ak nie sú dáta.
- Dizajn tokeny: purple `#8b22ff` / `#cf25d9`, dark theme, slovenské labely. Sentence case.

**Krok C — brána**
Tlačidlo „Potvrdiť a zverejniť" `disabled` pokiaľ `flags.some(f => f.severity === 'blocking')`. Vyriešenie FLAGu cez existujúcu edit cestu poľa → reverzibilné. Po vyriešení sa brána odomkne.

## 7. AKCEPTAČNÉ KRITÉRIÁ (Done = artefakt, nie text)

- [ ] Panel na `/vertical-pack/13303557` so skutočným completeness **44 %** (4/9), konzistentné so spodnou kartou.
- [ ] Chýbajúce polia (cena, GPS, video, …) v „Doplniť v ponuke"; **žiadny** area FLAG po #235 (167/120 legitímne).
- [ ] Blokujúci FLAG stále funguje v kóde (test: `free_text_area_mismatch` na neexistujúcu plochu).
- [ ] CTA „Upraviť ponuku" / „Pozrieť text inzerátu" fungujú; publish flow follow-up ak nie je zapojený.
- [ ] Nehnuteľnosť bez Guardian výstupu → honest empty state, žiadne fiktívne číslo.
- [ ] Žiadna nová migrácia v PR. Žiadny nový Guardian scoring.
- [ ] Unit test na bránu + render panelu; CI zelené.
- [ ] **Merge ≠ deployed ≠ verified:** vizuálny smoke na PROD (Andy).

## 8. DÁTA / BEZPEČNOSŤ

- Read-only voči Guardian výstupu. Žiadny DELETE. (PROD DELETE anti-reflex sa neaplikuje — nič nemažeme.)
- Vyriešenie FLAGu = editácia existujúceho poľa cez existujúcu cestu, reverzibilné.
- RLS rešpektovať — panel sa scopuje na `agency_id` prihláseného používateľa.

## 9. ZAKÁZANÉ AKCIE

- Žiadny stealth recruiter.
- Žiadny arbitrage cron.
- Žiadny portal scraping.
- Žiadny auto-send prospektom bez ľudského schválenia.
- Žiadne automatické zverejnenie inzerátu — brána je human gate, nie auto-publish.

## 10. ZÁVER ÚLOHY (task-loop, povinný výstup v PR popise)

- **HOTOVO:** čo presne pribudlo (súbory + cesty).
- **ODOMKLO:** čo táto zmena umožnila (napr. Guardian ako predajný argument; rozšírenie na ďalšie FLAG typy).
- **ĎALŠIA ÚLOHA alebo VLNA:** návrh JEDNEJ ďalšej úlohy, rankovanej podľa Ústavy.
- **BRÁNA:** čo je zablokované, kým toto nie je verified na PROD.

---
*Guardian Visible Panel · Brief v1 · jedna vlna sekvenčne · Confidence: Medium*
