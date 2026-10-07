# W2-D — texty a právne znenie cenníka v2: zoznam zmien a otvorené otázky

**Stav:** NÁVRH na revíziu. Vetva D kontraktu `docs/pricing/2026-10-05-pricing-v2-w2-contract.md`, bázový commit 26641e8, 2026-10-05.
**Dôležité:** text VOP (`apps/crm/src/app/(public)/terms`) je **návrh, nie schválené znenie**. Pred zapnutím `PRICING_V2_ENABLED` ho musí odobriť **founder a právnik**. Stránka v2 variantu to sama hlásí (žltý pruh „NÁVRH VOP…“) a nedoriešené miesta nesú viditeľný text „DOPLNIŤ — rozhodnutie foundera“, takže sa nedá nechtiac zverejniť ako hotová.
**Čo nie je rozhodnuté, v texte nie je vymyslené:** lehoty, sankcie, výpovedné doby, expirácia kreditov, výška onboardingu, ceny add-onov, platnosť záruky.

## 1. Ako to funguje
- Prepínač `isPricingV2Enabled()` (`apps/crm/src/lib/pricing-v2.ts`) sa číta **na serveri** cez `getPricingV2CatalogIfEnabled()` (`apps/crm/src/components/marketing/pricing-v2-copy.ts`). Vypnutý = `null` = pôvodný výstup. Zapnutý = `buildPricingV2Catalog()`; ceny sa nikde nepíšu ručne.
- Klientske komponenty dostanú katalóg ako prop (`FinalCTA`, `AiInsightsPanel`) alebo cez `PricingV2Provider` (`pricing-v2-context.tsx`: `UnifiedDemo` / `RoiCalculator`, `CompetitionMap`). Bez providera/propu = pôvodný výstup.
- Stránky `terms` a `landing` sú server komponenty bez dynamických API: hodnota prepínača sa vyhodnotí pri builde/nasadení (zmena env = nové nasadenie).

## 2. Zmeny podľa povrchov (pôvodné znenie → navrhované znenie)

### 2.1 VOP — `apps/crm/src/app/(public)/terms/page.tsx` (+ nový `terms-v2.ts`)
| Cesta:riadok (báza) | Pôvodné | Navrhované (len v2) |
|---|---|---|
| page.tsx:106 | „Posledná aktualizácia: 2. júna 2026.“ | „Posledná aktualizácia: DOPLNIŤ — rozhodnutie foundera (dátum účinnosti).“ + pruh „NÁVRH VOP pre nový cenník — čaká na odobrenie foundera a právnika…“ |
| page.tsx:132 | „Kapitola: Podrobný prehľad 4 programov“ | „Kapitola: Prehľad plánov a kreditov“ |
| page.tsx:134 | „orientačný prehľad seatov a modulov podľa L99 stratégie…“ | „orientačný prehľad plánov kancelárie a kreditov…“ (zvyšok vety zachovaný) |
| page.tsx:57 | „Solo Seat (79 €/mes/maklér)“ | „Start — 1 používateľ (25 € mesačne bez DPH; 30,75 € s DPH 23 %)“ |
| page.tsx:66 | „Team Seat (71 €/seat/mes, 3-9 seatov)“ | „Team — 2–6 používateľov (60 € … ; 73,80 € s DPH 23 %)“ |
| page.tsx:75 | „Office Seat (63 €/seat/mes, 10+ seatov)“ | „Kancelária — 7–25 používateľov (149 € … ; 183,27 € s DPH 23 %)“ |
| (nové) | — | „Sieť — 26 a viac používateľov (od 349 € … ; od 429,27 € s DPH 23 %)“, „cena sa dohodne podľa objemu“ |
| (nové) | — | „Kredity navyše“: mesačné balíky 60/120/180/240/300 s čistou aj konečnou cenou a jednorazové dokúpenie 0,70 € za kredit bez DPH (0,86 € s DPH) |
| page.tsx:87 | „CRM Sync (49 €/mes) — dostupné na vyžiadanie“ | „Ceny add-on modulov (CRM Sync, White Label): DOPLNIŤ — rozhodnutie foundera“ |
| page.tsx:88 | „White Label (299 €/mes) — dostupné na vyžiadanie“ | zlúčené do riadka vyššie (ceny 49 a 299 € sa vo v2 nezobrazujú; v cenníku v2 nie sú) |
| (nové, pred pätičkou, page.tsx:184) | — | Kapitola „5. Platby, kredity a zrušenie (návrh)“: DPH, mesačné opakované platby a zrušenie, kredity a ich platnosť, existujúci zákazníci, onboarding a vrátenie platby; všetko s placeholderom tam, kde nie je rozhodnutie |
Kapitoly 1–4 a „Mapovanie kapitol Legal Suite“ ostávajú nezmenené (neobsahujú ceny).

### 2.2 Landing — `apps/crm/src/app/(marketing)/landing/sections/FinalCTA.tsx` (+ nový `FinalCTAV2.tsx`, `page.tsx`)
| Cesta:riadok (báza) | Pôvodné | Navrhované (len v2) |
|---|---|---|
| FinalCTA.tsx:43–46 | „Váš AI obchodný pomocník. Za cenu obeda.“ | „Neprídete o províziu, lebo ste zabudli zavolať.“ + „Ráno otvoríte Revolis.AI a viete, komu volať a prečo. Platíte jeden mesačný paušál za celú kanceláriu…“ (výsledok, nie funkcie; `clay-positioning-reframe.md`) |
| FinalCTA.tsx:56,111,116,140,157,173,190 | €79 / €71 / 71 € / 63 € za seat | 4 karty pásiem z katalógu: čistá mesačná cena + konečná s DPH 23 % + kredity pre celú kanceláriu |
| FinalCTA.tsx:104,119,127 (CountdownTimer, SpotsCounter, „Odporúčané“, „10 % zľava“) | odpočet, počítadlo miest, zľava | vo v2 sa nezobrazuje (legacy tlak, nie je v cenníku v2) |
| FinalCTA.tsx:141,160,272 (30-dňová záruka, „Bez kreditnej karty“) | zárukový text | vo v2 vynechané do rozhodnutia foundera (viď otázky) |
| FinalCTA.tsx:233 | „Revolis.AI nestojí ani zlomok jedného strateného obchodu.“ | vo v2 vynechané |
CTA vo v2: `/register` (Start, Team, Kancelária), `/support` (Sieť, „od“ cena). Žiadny priamy Stripe odkaz. Owner Cockpit sa nezobrazuje.

### 2.3 Marketingové komponenty (`apps/crm/src/components/marketing/`)
| Súbor:riadok (báza) | Pôvodné | Navrhované (len v2) |
|---|---|---|
| UnifiedDemo.tsx:19–23,100–102,140 (ROI kalkulačka) | Smart Start 99 / Active Force 199 / Market Vision 449 €/mes | Start 25 / Team 60 / Kancelária 149 €/mes **bez DPH** z katalógu; „Náklady … bez DPH“ |
| CompetitionMap.tsx:54,57,66 | „Protocol Authority Required“, „…len pre Protocol Authority plán (449€/mes)“, „Upgradovať na Protocol Authority“ | „Dostupné vo vybraných plánoch“, „Competition Heatmap je súčasťou vybraných plánov.“, „Zobraziť plány“ |

### 2.4 Dashboard — `apps/crm/src/components/dashboard/AiInsightsPanel.tsx`
| Riadok (báza) | Pôvodné | Navrhované (len v2, prop `pricingV2`) |
|---|---|---|
| :224 | „Odomknúť Market Vision od 199 € mesačne“ | „Odomknúť ďalšie príležitosti — plány od {najnižšia cena z katalógu} mesačne bez DPH“ |
| :210 | „…odomkneš v programe Smart Start.“ | „…odomkneš v platenom pláne.“ |

### 2.5 Dokumenty
- `apps/crm/docs/onboarding/onboarding-email-pricing-v2.md` — **nový**, neaktívna šablóna s premennými `{{…}}` (cena z katalógu pri odosielaní), bez mena zákazníka, onboarding a záruka označené „DOPLNIŤ — rozhodnutie foundera“.
- Existujúci onboarding e-mail pre konkrétneho zákazníka (`apps/crm/docs/onboarding/*-onboarding-email.md`, riadky 16, 44, 69: „onboarding 99 € s DPH“, „30-dňová garancia“) **nezmenený**: je to dátumovaná (2026-05-27) interná šablóna pre konkrétneho zákazníka s dohodnutými podmienkami; prepísať ju by znamenalo zmeniť dohodu.
- `apps/crm/docs/pricing-v1.md` — **nezmenený**: názvom aj obsahom je to dokument v1 (zdroj pravdy pre `program-tier-pricing.ts`); v2 zdroj je `pricing-v2.ts`.

## 3. Povrchy, ktoré som NEMENIL (a prečo)
| Povrch | Dôvod | Stav |
|---|---|---|
| `apps/crm/src/components/billing/RozpisFunkcionalit.tsx` (49/99/199/449 €) | **Kolízia území:** kontrakt ho uvádza v D (`components/**/RozpisFunkcionalit*`), ale leží v `components/billing/**` = vetva B. Zákaz „nič z území A, B, C“ má prednosť. | Odovzdať vetve B (alebo koordinátor rozhodne) |
| `apps/crm/src/components/layout/sidebar.tsx:106–109` (49/99/199/449 €) | Pole `price` sa nikde nevykresľuje (overené: žiadne `.price`; zobrazuje sa len `label`). Zmena by neovplyvnila výstup. Plán „Smart Starter…“ je prepínač funkčných úrovní, nie cenník. | Mŕtve dáta; návrh odstrániť pri refaktore |
| `apps/crm/src/types/revolis.ts:13–16` (`PLAN_PRICES`, `PLAN_DESC`) | Importuje sa z neho len typ `Plan`; `PLAN_PRICES`/`PLAN_DESC` nemajú žiadneho používateľa (grep). | Mŕtve dáta; **neistý** (nemožno dokázať, že ich nepoužíva niečo mimo `src/`) |
| `apps/crm/src/app/(marketing)/demo/page.tsx`, `demo/live/page.tsx`, `(dashboard)/dashboard/**` | Mimo územia D. Tu treba prepojenie v2: obaliť `<UnifiedDemo />` / `<LiveDemoExperience />` do `<PricingV2Provider catalog={getPricingV2CatalogIfEnabled()}>` a poslať `pricingV2` do `AiInsightsPanel`. Kým sa to nespraví, tieto stránky ostávajú legacy. | **Blokuje úplné v2 na /demo a v dashboarde** |
| `IntelligenceHub.tsx:62`, `FeatureGrid.tsx`, `SmolkoDemo.tsx`, `AcquisitionHub.tsx:986` („Dostupné v Market Vision / Protocol Authority“) | Nie sú ceny, ale názvy legacy plánov a gating funkcií. V v2 nie je rozhodnuté, ktoré funkcie patria do ktorého pásma. | Otvorené rozhodnutie foundera |
| `RoiGuaranteeSection.tsx:80` („vrátime každý cent + 50 € navyše“), `landing/page.tsx` metadata („100 % garancia vrátenia poplatku prvých 30 dní“) | Garancia nie je rozhodnutá pre v2. | Otvorené |
| `apps/crm/src/components/landing/**`, `components/shared/**` | Mimo územia D. | — |

### Povrchy označené „neistý“ (nenechané zmenené, živosť/vlastníctvo nepotvrdené)
1. `apps/crm/src/types/revolis.ts` (`PLAN_PRICES`, `PLAN_DESC`) — nevykresľuje sa nikde v `src/`, ale zoznam užívateľov nie je dokázaný.
2. `apps/crm/src/components/layout/sidebar.tsx` pole `price` — živý komponent, ale nevykresľované pole.
3. `apps/crm/src/components/billing/RozpisFunkcionalit.tsx` — živosť neoverená a patrí do územia B.
4. `apps/crm/src/components/marketing/SmolkoDemo.tsx`, `FeatureGrid.tsx`, `IntelligenceHub.tsx`, `AcquisitionHub.tsx` — texty s legacy názvami plánov; `SmolkoDemo.tsx` navyše nesie v názve súboru meno referenčného klienta (premenovanie nie je v tomto bloku).
5. `apps/crm/src/app/(marketing)/landing/**` — W0 ho označil „UNVERIFIED živosť“; v kóde je `/home → /landing` presmerovanie (`next.config.js:55`) a odkaz z `login/page.tsx:71`, takže ho považujem za živý (TESTED len ako kód, nie ako produkčný web).

## 4. Otvorené právne a obchodné otázky (rozhodnutie foundera/právnika)
1. **Základ DPH.** Ceny sú bez DPH (rozhodnutie 5. 10.), konečná cena s 23 % z `pricing-v2.ts`. Chýba: potvrdenie sadzby a režimu, ako sa DPH uvádza v zmluve a faktúre, a či sa v Stripe nastaví `tax_behavior` exkluzívne (W0 §3 bod 5: v kóde dnes nie je). Do VOP: „DOPLNIŤ — rozhodnutie foundera“.
2. **Mesačné opakované platby a zrušenie.** Plán a mesačný balík sú opakované predplatné. Nerozhodnuté: výpovedná doba, kedy zrušenie nadobudne účinok (koniec obdobia?), vrátenie za nevyužité obdobie, následky nezaplatenia a zastavenie grantov. Všetko „DOPLNIŤ — rozhodnutie foundera“.
3. **Kredity a ich expirácia.** V kontrakte majú mesačné (grant) a jednorazové (purchased) kredity „odlišnú expiráciu ako dnes“; konkrétne lehoty nepoznám a nevymýšľam. Chýba aj politika po minutí kreditov (kontrakt: otvorené rozhodnutie).
4. **Jednorazové vs. opakované.** VOP musia rozlíšiť opakovaný plán, opakovaný balík a jednorazové dokúpenie (0,70 € za kredit); či sa jednorazové kredity pripisujú okamžite a ako sa vracajú, nie je určené.
5. **Ochrana existujúceho zákazníka.** Kód nikdy automaticky nepresúva legacy predplatiteľa (`resolvePricingModel`). Navrhnutá veta „ostáva pri dohodnutých podmienkach, automaticky sa nepresúva“ je **moja formulácia podľa správania kódu**, nie schválený záväzok; treba právne posúdiť (viazanosť dohodnutou cenou, kedy a ako sa dá prejsť na v2).
6. **Add-on moduly.** Ceny CRM Sync a White Label vo v2 cenníku nie sú; v v2 texte sú „DOPLNIŤ“. Rozhodnúť, či ostávajú, za akú cenu a či s DPH.
7. **Onboarding.** 99 € s DPH (legacy e-mail) vs. 0 € (DEC-20260924-001) vs. v2 nerozhodnuté. V v2 texte „DOPLNIŤ“.
8. **Záruka vrátenia peňazí.** Legacy landing a e-mail tvrdia 30-dňovú záruku. Či platí pre v2 a v akej forme, nie je rozhodnuté; vo v2 texte sa neuvádza.
9. **Owner Cockpit 349 €.** Vo v2 ponuke sa nezobrazuje (splnené v mnou menených povrchoch). Ktoré jeho funkcie patria do pásiem, je otvorené rozhodnutie.
10. **Pásmo Sieť „od“.** Text hovorí „cena sa dohodne podľa objemu“; formu dojednania (ponuka, zmluva) určí founder.
11. **Porovnanie s AIRAmax.** Základ DPH u AIRAmax je neoverený (roadmap §9.5); v textoch pre zákazníkov som žiadne tvrdenie „lacnejší než…“ nepoužil.
12. **Ilustračné čísla ROI kalkulačky.** `UnifiedDemo.tsx` násobí extra mandáty vymyslenými koeficientmi (1,3/1,7/2,4) a ukazuje ROI v tisíckach percent. Nemenené (mimo cenníka), ale pred zapnutím v2 treba rozhodnúť, či sa takýto demo-výpočet smie ukazovať.

## 5. Čo sa NEDÁ odviesť z W2-D bez zásahu mimo územia
- Prepojenie v2 na `/demo`, `/demo/live` a do dashboardu (viď §3).
- Rozhodnutie o `RozpisFunkcionalit.tsx` (vetva B).
- Prepis `apps/marketing/**` (vetva C) a Stripe/checkout (vetva A).
