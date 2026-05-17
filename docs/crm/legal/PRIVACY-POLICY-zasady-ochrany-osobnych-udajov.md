# ZÁSADY OCHRANY OSOBNÝCH ÚDAJOV (PRIVACY POLICY)

**Prevádzkovateľ:** Revolis.AI
**Platforma:** https://app.revolis.ai
**Kontakt pre ochranu osobných údajov:** privacy@revolis.ai
**Účinnosť od:** 15. apríla 2026
**Verzia:** 2.0

---

## 1. KTO SME A ČO ROBÍME

Revolis.AI (ďalej „my", „nás" alebo „Poskytovateľ") prevádzkuje cloudovú CRM platformu s integrovanou umelou inteligenciou pre realitné kancelárie a maklérov (ďalej „Platforma"). Platforma pomáha spravovať obchodné príležitosti, kontakty, nehnuteľnosti a komunikáciu, pričom AI moduly poskytujú rozhodovaciu podporu formou skórovania, párovania a automatizovaných odporúčaní.

---

## 2. KOHO SA TIETO ZÁSADY TÝKAJÚ

Tieto zásady sa vzťahujú na:

- **Návštevníkov webovej stránky** (revolis.ai, app.revolis.ai) — osoby prehliadajúce naše stránky
- **Registrovaných používateľov** — makléri, manažéri a zamestnanci realitných kancelárií, ktorí používajú Platformu
- **Kontaktné osoby zákazníkov** — osoby, s ktorými komunikujeme v rámci obchodného vzťahu
- **Záujemcov o nehnuteľnosti** — osoby, ktorých údaje vkladajú používatelia Platformy (v tomto prípade je prevádzkovateľom ich údajov realitná kancelária, nie Revolis.AI)

---

## 3. AKÉ ÚDAJE ZBIERAME A PREČO

### 3.1 Údaje, ktoré nám poskytujete priamo

| Kategória | Konkrétne údaje | Účel | Právny základ |
|---|---|---|---|
| Registrácia a účet | Meno, e-mail, heslo (hashované), názov firmy, telefón | Vytvorenie a správa účtu | Plnenie zmluvy (čl. 6(1)(b) GDPR) |
| Fakturačné údaje | IČO, DIČ, IČ DPH, fakturačná adresa | Fakturácia a účtovníctvo | Právna povinnosť (čl. 6(1)(c) GDPR) |
| Komunikácia | E-maily, správy, požiadavky na podporu | Poskytovanie podpory | Plnenie zmluvy (čl. 6(1)(b) GDPR) |
| Demo formulár | Meno, e-mail, firma, veľkosť tímu | Spracovanie žiadosti o demo | Oprávnený záujem (čl. 6(1)(f) GDPR) |

### 3.2 Údaje zbierané automaticky

| Kategória | Konkrétne údaje | Účel | Právny základ |
|---|---|---|---|
| Technické údaje | IP adresa, typ prehliadača, operačný systém, rozlíšenie obrazovky | Bezpečnosť, diagnostika, kompatibilita | Oprávnený záujem (čl. 6(1)(f) GDPR) |
| Prístupové logy | Čas prístupu, navštívené stránky, HTTP status kódy | Bezpečnosť, prevencia zneužitia | Oprávnený záujem (čl. 6(1)(f) GDPR) |
| Cookies a analytika | Session ID, preferencie rozhrania, anonymizované návštevné metriky | Funkčnosť platformy, vylepšovanie UX | Súhlas (čl. 6(1)(a) GDPR) pre analytické cookies |

### 3.3 Údaje spracúvané v mene zákazníkov (procesor role)

Keď realitné kancelárie (naši zákazníci) vkladajú údaje o svojich klientoch do Platformy, vystupujeme ako **sprostredkovateľ (processor)**. Prevádzkovateľom týchto údajov je realitná kancelária. Spracúvanie sa riadi Zmluvou o spracúvaní osobných údajov (DPA).

Typické údaje: meno, e-mail, telefón, preferovaná lokalita, rozpočet, komunikačná história, aktivita na ponukách.

### 3.4 AI-generované údaje

Naše AI moduly generujú z údajov vložených zákazníkmi:
- **Index pripravenosti kupujúceho (IPK)** — skóre 0–100
- **Odporúčania ďalších krokov** — navrhované akcie pre makléra
- **Párovanie** — vhodné nehnuteľnosti pre záujemcu
- **Predikcie** — pravdepodobnosť uzavretia obchodu

Tieto údaje sú odvodené a pravdepodobnostné. Nepoužívame ich na automatizované rozhodovanie s právnymi účinkami (čl. 22 GDPR). Konečné rozhodnutie vždy robí človek (makléri).

---

## 4. S KÝM ZDIEĽAME ÚDAJE

Vaše údaje zdieľame výhradne v rozsahu nevyhnutnom na poskytovanie Služieb:

| Príjemca | Účel | Región | Záruky |
|---|---|---|---|
| Supabase Inc. | Databáza, autentifikácia | EU (Frankfurt) | SOC 2, DPA |
| Vercel Inc. | Hosting, CDN | EU (Frankfurt) | SOC 2, DPA |
| OpenAI / Anthropic | AI inference | EU endpoint | Zero retention, DPA |
| Stripe Inc. | Platby | EU (Dublin) | PCI DSS L1, DPA |
| Resend Inc. | E-maily | EU endpoint | DPA |

Vaše údaje **NEPREDÁVAME** tretím stranám. Vaše údaje **NEPOUŽÍVAME** na tréning AI modelov sprístupnených tretím stranám.

---

## 5. KDE SÚ VAŠE ÚDAJE ULOŽENÉ

Všetky údaje sú primárne uložené a spracúvané v dátových centrách na území **Európskej únie** (Frankfurt am Main, Nemecko).

V prípade nevyhnutného prenosu mimo EÚ (napr. AI inference) zabezpečujeme primeranú úroveň ochrany prostredníctvom:
- rozhodnutia Európskej komisie o primeranosti, alebo
- štandardných zmluvných doložiek (SCC) podľa rozhodnutia Komisie (EÚ) 2021/914.

---

## 6. AKO CHRÁNIME VAŠE ÚDAJE

- **Šifrovanie pri prenose:** TLS 1.3
- **Šifrovanie v pokoji:** AES-256
- **Kontrola prístupu:** RBAC, princíp najmenších oprávnení, MFA pre administrátorov
- **Zálohovanie:** Denné šifrované zálohy
- **Monitorovanie:** Kontinuálna detekcia bezpečnostných anomálií
- **Penetračné testy:** Minimálne ročne
- **Školenia:** Pravidelné GDPR a bezpečnostné školenia tímu

---

## 7. AKO DLHO UCHOVÁVAME ÚDAJE

| Typ údajov | Doba uchovávania |
|---|---|
| Údaje účtu | Po dobu trvania zmluvy + 30 dní na export |
| Fakturačné údaje | 10 rokov (zákonná povinnosť) |
| Prístupové logy | 12 mesiacov |
| Cookies analytické | 13 mesiacov |
| Údaje záujemcov (v CRM) | Podľa nastavenia zákazníka, maximálne do ukončenia zmluvy + 90 dní |
| Zálohy | 90 dní po vymazaní z produkcie |

---

## 8. VAŠE PRÁVA

Podľa GDPR máte nasledovné práva:

| Právo | Popis |
|---|---|
| **Prístup** (čl. 15) | Právo získať potvrdenie, či spracúvame vaše údaje, a prístup k nim |
| **Oprava** (čl. 16) | Právo na opravu nepresných údajov |
| **Vymazanie** (čl. 17) | Právo na vymazanie údajov, ak nie sú potrebné na účel spracúvania |
| **Obmedzenie** (čl. 18) | Právo požadovať obmedzenie spracúvania za určitých okolností |
| **Prenosnosť** (čl. 20) | Právo získať údaje v štruktúrovanom, strojovo čitateľnom formáte |
| **Námietka** (čl. 21) | Právo namietať proti spracúvaniu založenému na oprávnenom záujme |
| **Odvolanie súhlasu** | Právo kedykoľvek odvolať súhlas bez vplyvu na zákonnosť predchádzajúceho spracúvania |
| **Sťažnosť** | Právo podať sťažnosť dozornému orgánu (Úrad na ochranu osobných údajov SR) |

**Ako uplatniť práva:** Napíšte na privacy@revolis.ai. Odpovieme do 30 dní.

**Dotknuté osoby zákazníkov** (záujemcovia o nehnuteľnosti): Ak ste záujemca o nehnuteľnosť, vaše údaje spravuje realitná kancelária. Obráťte sa na ňu. My ako sprostredkovateľ postúpime vašu žiadosť príslušnému zákazníkovi.

---

## 9. AUTOMATIZOVANÉ ROZHODOVANIE A PROFILOVANIE

9.1. Naše AI moduly vykonávajú **profilovanie** v zmysle čl. 4(4) GDPR — automatizované spracúvanie údajov za účelom hodnotenia pripravenosti kupujúceho (IPK skóre).

9.2. Toto profilovanie **NEMÁ** právne účinky ani porovnateľne závažný vplyv na dotknuté osoby v zmysle čl. 22(1) GDPR, pretože:
- výstupy AI sú odporúčania, nie finálne rozhodnutia;
- konečné rozhodnutie (kontaktovanie, ponuka) vždy robí človek;
- dotknutá osoba nie je na základe skóre automaticky vylúčená z žiadnej služby.

9.3. Na vyžiadanie poskytneme vysvetlenie hlavných faktorov, ktoré ovplyvnili konkrétny AI výstup.

---

## 10. COOKIES

### Nevyhnutné cookies (bez súhlasu)
- Session cookies pre prihlásenie a bezpečnosť
- CSRF tokeny

### Analytické cookies (so súhlasom)
- Anonymizované návštevné štatistiky na vylepšovanie UX

Nepoužívame reklamné cookies ani retargeting. Nastavenia cookies môžete zmeniť kedykoľvek.

---

## 11. ZMENY ZÁSAD

O podstatných zmenách týchto zásad informujeme registrovaných používateľov e-mailom alebo notifikáciou v Platforme najmenej 14 dní pred účinnosťou zmeny. Aktuálnu verziu vždy nájdete na tejto stránke.

---

## 12. KONTAKT

**Revolis.AI**
E-mail: privacy@revolis.ai
Web: https://revolis.ai

**Dozorný orgán:**
Úrad na ochranu osobných údajov Slovenskej republiky
Hraničná 12, 820 07 Bratislava 27
Tel.: +421 2 3231 3214
Web: https://dataprotection.gov.sk

---

**Účinné od:** 15. apríla 2026
**Verzia:** 2.0
