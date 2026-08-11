# DAY 1–2 — klikací návod (Acquisition OS Stage 0 credentials)

**Cieľ:** na konci máš 5 hodnôt v tabuľke na konci dokumentu.
**Čas:** 40–60 minút. **Peniaze:** 0 € (test účty nemajú billing).
**Účet:** prihlás sa Google účtom, pod ktorým má žiť Revolis MCC.
Odporúčam `revoliscrm@gmail.com` (ten už používaš pre kalendár a n8n),
NIE osobný — MCC sa neskôr nedá presunúť medzi vlastníkmi.

> **Dôležité zistenie z L3:** service account funguje **bez Google Workspace
> domain-wide delegation**. Čiže ideme cestou service accountu podľa blueprintu,
> OAuth fallback nepotrebujeme. Kľúčový krok je **C5** — pridať service account
> ako používateľa do MCC. Bez toho SA nevidí žiadny účet.

---

## KROK A — Manager account (MCC) + developer token

*(~15 min. Toto je produkčný manager účet — bez neho neexistuje developer token.
Reklamy v ňom nikdy nespustíš, slúži ako strecha.)*

1. Otvor **https://ads.google.com/home/tools/manager-accounts/** → **Create a manager account**
2. Prihlás sa cieľovým Google účtom
3. Vyplň:
   - Account name: **Revolis ROOT MCC**
   - Billing country: **Slovakia**
   - Time zone: **(GMT+01:00) Bratislava**
   - Currency: **EUR**
   - „What will you use this account for" → **Manage other people's accounts**
4. **Submit** → dostaneš sa do MCC dashboardu
5. 📝 Zapíš **Customer ID** MCC (vpravo hore, formát `123-456-7890`)
6. V ľavom menu: **Admin → API Center**
   *(ak API Center nevidíš, si v klientskom účte, nie v manager účte — vráť sa
   cez prepínač účtov vpravo hore)*
7. Vyplň formulár žiadosti o developer token:
   - Company name: **ONLINOVO s.r.o.**
   - Company website: **https://revolis.ai**
   - Contact email: tvoj
   - „How will you use the API": *Read-only synchronizácia kampaňových dát
     do vlastného CRM pre realitné kancelárie, ktoré nás poverili správou
     svojich Google Ads účtov.*
8. **Submit** → token sa zobrazí okamžite so stavom **Test account access**
9. 📝 Zapíš **developer token**

> ✅ **Test access stačí na celý Stage 0.** Umožňuje volať API výhradne voči
> test účtom — presne to, čo Stage 0 robí. O **Basic access** (prístup
> k reálnym účtom) požiadaš až pred Stage 1. Nečakáš teda na žiadne schválenie.

---

## KROK B — Test MCC + 2 test účty

*(~10 min. Toto je krok, kde sa Google UI najčastejšie mení — ak sa obrazovka
nezhoduje, sprav screenshot a pošli mi ho, navedieme sa podľa reality.)*

1. Otvor **https://developers.google.com/google-ads/api/docs/best-practices/test-accounts**
2. Na tej stránke nájdi a klikni link na vytvorenie **test manager accountu**
   *(Google zámerne nedovoľuje vytvoriť test účet z bežného UI — musí ísť
   cez tento vstup)*
3. Prihlás sa **tým istým** Google účtom
4. Vyplň rovnaké údaje ako v kroku A, názov: **Revolis TEST MCC**
5. ⚠️ **KONTROLA:** po vytvorení musí byť v účte viditeľné označenie
   **„Test account"** (červený/oranžový banner alebo štítok pri názve).
   **Ak tam nie je, vytvoril si produkčný účet — nepokračuj a napíš mi.**
6. 📝 Zapíš **Customer ID Test MCC**
7. V Test MCC: ľavé menu **Accounts → Performance** → modré **+** →
   **Create new account**
   - Account name: **Test RK A**
   - Country: Slovakia · Currency: EUR · Time zone: Bratislava
   - **Preskoč** všetko o kampaniach a platbe (test účet billing nemá)
8. Zopakuj pre **Test RK B**
9. 📝 Zapíš oba **Customer ID** (formát `123-456-7890`)

---

## KROK C — Google Cloud + service account

*(~20 min)*

1. Otvor **https://console.cloud.google.com**
2. Vyber existujúci projekt **„Revolis AI"** (ten z n8n OAuth) — alebo vytvor nový
   s rovnakým názvom, ak ho nenájdeš
3. **APIs & Services → Library** → vyhľadaj **Google Ads API** → **Enable**
   *(POZOR: nie „Google Ads Data Hub", nie „Google Analytics" — presne
   „Google Ads API")*
4. **IAM & Admin → Service Accounts → + Create service account**
   - Name: **revolis-ads-backend**
   - Service account ID sa vyplní sám
   - **Grant this service account access to project** → **preskoč** (Continue)
   - **Grant users access** → **preskoč** (Done)
   > Service account nepotrebuje žiadnu IAM rolu v GCP. Prístup k Ads dátam
   > sa nastavuje v Google Ads, nie tu — to je krok C5.
5. 📝 Zapíš **email service accountu**
   (`revolis-ads-backend@revolis-ai.iam.gserviceaccount.com`)
6. Klikni na vytvorený service account → záložka **Keys** → **Add key →
   Create new key → JSON → Create** → kľúč sa stiahne
7. 🔒 **Presuň JSON zo Stiahnutých** do `C:\Users\aondr\.secrets\`
   (priečinok vytvor, ak nie je)
   - **NIKDY** do `C:\RealitkaAI\` — ani omylom, ani „dočasne"
   - **NIKDY** neposielaj obsah kľúča do žiadneho AI chatu, ani mne

### C5 — ⭐ Pridať service account do Test MCC (najdôležitejší a najprehliadanejší krok)

Bez tohto má service account platný kľúč, ale nevidí ani jeden účet.

1. Späť v **Google Ads → Revolis TEST MCC**
2. **Admin → Access and security → Users** → modré **+**
3. Vlož **email service accountu** z bodu C5
4. Úroveň prístupu: **Standard** *(Read only by na Stage 0 stačilo, ale
   Standard ušetrí opakovanie kroku v Stage 1; Stage 0 aj tak nič nezapisuje —
   read-only je vynútené kódom, nie oprávnením)*
5. **Send invitation**
6. Service accounty pozvánku neprijímajú klikom — v Ads UI sa objaví ako
   **Pending**. Ak po ~10 minútach nezmizne, napíš mi; existuje obchádzka
   cez linkovanie na úrovni manager účtu.

---

## KROK D — Odovzdávacia tabuľka

Keď máš všetkých 5, si hotový a Stage 0 môže kódovať:

| ✔ | Hodnota | Kam patrí |
|---|---|---|
| ⬜ | Developer token | Vercel env `GOOGLE_ADS_DEVELOPER_TOKEN` |
| ⬜ | Customer ID **Test MCC** | Vercel env `GOOGLE_ADS_LOGIN_CUSTOMER_ID` |
| ⬜ | Customer ID **Test RK A** + **Test RK B** | testovacie dáta v PR-S0.4 |
| ⬜ | Service account JSON v `C:\Users\aondr\.secrets\` | Vercel env (obsah ako string), NIKDY do repa |
| ⬜ | Google Ads API **Enabled** v projekte Revolis AI | — |

**Do Vercelu ich zatiaľ NEVKLADAJ.** Presné názvy premenných určí PR-S0.2
podľa toho, ako repo skladuje secrets (L3 potvrdila: Vercel env). Zapíš si
hodnoty do poznámok a počkaj na PR — inak vzniknú dva rôzne názvy tej istej
premennej.

---

## Ak sa niečo pokazí

| Príznak | Príčina | Riešenie |
|---|---|---|
| API Center nevidím | si v klientskom, nie manager účte | prepínač účtov vpravo hore |
| Test účet nemá banner „Test account" | vytvorený mimo test flow | nepoužívaj ho, vytvor nanovo cez odkaz v kroku B2 |
| „You need billing" pri test účte | omylom produkčný účet | to isté |
| Developer token má stav „Pending" | žiadosť o Basic access | na Stage 0 nevadí — test access funguje hneď |
| SA pozvánka visí Pending | očakávané správanie | napíš mi, máme obchádzku |
| Google UI vyzerá inak než návod | Google zmenil UI | screenshot → naviguem ťa podľa reality |
