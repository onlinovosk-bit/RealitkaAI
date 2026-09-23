# Build Order — Reality Smolko: oprava umiestnenia Voiceflow sprievodcu

**Status:** IN PROGRESS
**Cieľ:** Návštevník `realitysmolko.sk` začne v existujúcom Voiceflow widgete tromi otázkami o hľadanej nehnuteľnosti; v Revolise nezostane žiadny panel, ktorý sa za tento verejný sprievodca vydáva.

---

## 0. Gate check (Ústava + Prime Directive)

| # | Otázka | Záver |
|---|---|---|
| 1 | Zaplatil by za to dnešný klient? | Áno — p. Smolko dodal vlastný Voiceflow skript a konkrétny požadovaný tok. |
| 2 | Zarobí klient viac do 90 dní? | Pravdepodobne — návštevník sa dostane k relevantnejšiemu vyhľadávaniu ponúk rýchlejšie. |
| 3 | Skracuje Lead → provízia? | Áno, ale V1 iba skracuje prvý krok výberu; nevytvára lead ani booking. |
| 4 | Posilňuje moat? | Mierne — overuje opakovateľný verejný widget nad vlastným webom klienta. |
| 5 | Posilňuje flywheel? | Nie v tejto verzii; neukladá údaje ani analýzu. |
| 6 | Prináša unikátne dáta? | Nie; to je zámer, aby sa nespúšťal nový zber osobných údajov. |
| 7 | Má vyššie ROI než korekcia chybného panelu? | Nie je oddelené — odstránenie chybného panelu je bezprostredná oprava. |
| 8 | Je správny čas? | Áno — widget je už vložený na klientskom webe a zákazník uviedol presný tok. |
| 9 | MVP do dvoch týždňov? | Áno — tri voľby, lokalita a prechod na existujúci výpis. |
| 10 | Founder trap? | Nie; ide o priamu zákaznícku korekciu, nie o novú internú AI funkciu. |
| 11 | Najlepšie využitie času? | Áno — opravuje viditeľnú chybu u referenčného klienta. |
| 12 | Jedna vec v kvartáli? | Nie; preto je rozsah úzko obmedzený na opravu a prvý verejný tok. |

**Verdikt:** BUILD — odstránenie chybného CRM panela teraz; konfigurácia Voiceflow po prístupe do klientského projektu.

## 1. Integration Report

| Potreba | Existuje? | Rozhodnutie |
|---|---|---|
| Verejný chat widget | Áno | Voiceflow skript je vložený vo footeri `https://www.realitysmolko.sk/` a vykresľuje launcher „Poraďte sa!“. Použiť tento projekt, nevytvárať druhý widget v Revolise. |
| Verejný výpis ponúk | Áno | `https://www.realitysmolko.sk/nehnutelnosti` má vlastné vyhľadávanie podľa lokality, kategórie a typu. V1 naň vedie; nepredstiera filtrované výsledky, kým nie je potvrdený stabilný URL kontrakt. |
| Starý buyer onboarding | Áno | `apps/crm/src/app/(public)/buyer-onboarding/page.tsx` nepoužiť: vyžaduje meno a e-mail a zapisuje lead do CRM. |
| Interný CRM panel | Áno, ale chybný | `SmolkoChatbotPanel`, `/api/ai/smolko-chat` a engine odstrániť. Je to prihlásený dashboard, nie web Reality Smolko. |
| Databáza / API | Nie je potrebné | V1 nevytvára ani nečíta nový verejný Revolis endpoint; necháva zdroj ponúk na klientskom webe. |

**Jediná nová vec:** konfiguračný build package pre existujúci Voiceflow projekt v `docs/voiceflow/`.

## 2. Verification map

| # | Akceptačné kritérium | Dôkaz |
|---|---|---|
| 1 | `/revolis-ai` neimportuje ani nerenderuje chybný Smolko panel | targeted Vitest feature-registry suite + `rg` audit |
| 2 | `/api/ai/smolko-chat` ani jeho engine nezostanú v aplikácii | targeted Vitest feature-registry suite + `rg` audit |
| 3 | Voiceflow implementátor dostane presný tok a premenné bez PII | `docs/voiceflow/reality-smolko-property-guide-v1.md` review |
| 4 | Verejný web používa existujúci Voiceflow projekt | read-only browser audit: script, host `#voiceflow-chat`, launcher title |

## 3. Dáta a súkromie

- Zdroj ponúk ostáva vlastné verejné vyhľadávanie Reality Smolko; nejde o scraping ani nový import.
- V1 sa nepýta na meno, telefón, e-mail, presnú adresu ani iný osobný údaj a nič nezapisuje do Revolis CRM.
- Voiceflow pracuje ako externý widget. Pred publikovaním nového toku musí vlastník projektu potvrdiť, že jeho Privacy Notice uvádza Voiceflow a účel spracovania; uvítací text zároveň vyzve návštevníka, aby do chatu osobné údaje nepísal.

## 4. Scope

### IN

- odstránenie omylom nasadeného interného CRM chatbota;
- kopírovateľný Voiceflow tok: typ nehnuteľnosti → zámer → lokalita;
- transparentný prechod na aktuálny výpis ponúk Reality Smolko;
- read-only audit živého vloženia.

### OUT

- prihlásenie alebo zmena nastavení v klientskom Voiceflow projekte;
- nový verejný Revolis API endpoint, import ponúk, booking, callback, CRM lead alebo e-mail;
- zásah do CMS/Webex webu alebo jeho Privacy Notice.

## 5. Brány

| Brána | Stav |
|---|---|
| Lokálna oprava kódu a dokumentácie | AUTO-SAFE |
| Zmena dialógu v Voiceflow Creatore | vyžaduje prístup vlastníka projektu; pred publikovaním je to externá zmena |
| Zmena webu/CMS a Privacy Notice | vlastník webu alebo jeho správca |
| Merge do `main` / produkcia | founder |

## 6. Rollback

- Interný panel: revert samostatného commitu.
- Voiceflow tok: v Creatore publikovať predchádzajúcu verziu; žiadna DB migrácia ani CRM dáta sa nemenia.

## 7. Effort

- [x] S (<0.5 d) — oprava omylom nasadeného panelu a pripravený Voiceflow tok.
