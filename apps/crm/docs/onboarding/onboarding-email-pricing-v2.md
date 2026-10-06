# Onboarding e-mail — cenník v2 (šablóna, NEAKTÍVNA)

**Stav:** NÁVRH (W2-D, 2026-10-05). Nepoužívať, kým founder nezapne `PRICING_V2_ENABLED` a neodobrí text.
**Interné — neposielať tento súbor zákazníkovi.**
**Vzťah k existujúcej šablóne:** existujúci e-mail pre konkrétneho zákazníka (`*-onboarding-email.md` v tomto priečinku) ostáva nezmenený (legacy, „onboarding 99 € s DPH“). Táto šablóna je pre nových zákazníkov na cenníku v2. Zákazník s už dohodnutými podmienkami sa na v2 neprepisuje.

## Pred odoslaním (interné)

- [ ] Over, že `PRICING_V2_ENABLED` je zapnuté a founder odobril text (viď `docs/pricing/w2d-copy-and-legal-review.md`).
- [ ] Over, či účet už existuje; ak áno, CTA je prihlásenie, nie registrácia.
- [ ] Hodnoty `{{…}}` doplň z katalógu cenníka v2 (`buildPricingV2Catalog` v `apps/crm/src/lib/pricing-v2.ts`), **nikdy z pamäte ani ručne**.
- [ ] Onboarding poplatok: DOPLNIŤ — rozhodnutie foundera (výška alebo bez poplatku). Kým nie je rozhodnuté, riadok o onboardingu z e-mailu vynechaj.
- [ ] Záruka vrátenia platby: DOPLNIŤ — rozhodnutie foundera (platí aj pre v2?). Kým nie je rozhodnuté, vynechaj.

## E-mail (SK)

**Predmet:** {{NÁZOV_KANCELÁRIE}} × Revolis — aktivácia účtu a prvý krok

Dobrý deň,

pripravili sme pre **{{NÁZOV_KANCELÁRIE}}** prístup do Revolis.AI. Cieľ je jednoduchý: aby ste neprišli o províziu len preto, že sa na niekoho zabudlo zavolať. Ráno otvoríte aplikáciu a viete, komu volať a prečo.

### Čo urobíte teraz (cca 5 minút)

1. Otvorte registračný odkaz: **{{REGISTRAČNÝ_ODKAZ}}**
   Ak už účet existuje, prihláste sa na: **https://app.revolis.ai/login**
2. Prejdite krátkym nastavením kancelárie v aplikácii.
3. V sekcii **Predplatné** (`/billing`) potvrďte plán kancelárie.

### Váš plán

- Plán: **{{PÁSMO}}** ({{POČET_POUŽÍVATEĽOV}})
- Cena: **{{CENA_BEZ_DPH}} mesačne bez DPH**, konečná cena **{{CENA_S_DPH}} s DPH**
- Kredity: **{{KREDITY}} mesačne** pre celú kanceláriu

Cena je paušál za celú kanceláriu, nie za jednotlivého používateľa. Podmienky platby, zrušenia a platnosti kreditov nájdete vo VOP: https://app.revolis.ai/terms

### Podpora

Pri probléme s prihlásením odpovedzte na tento e-mail alebo napíšte na **podpora@revolis.ai** a uveďte názov kancelárie.

S pozdravom,
**Tím Revolis**
