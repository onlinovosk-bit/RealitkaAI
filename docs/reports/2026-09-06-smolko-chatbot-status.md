# Smolko chatbot / Website Concierge — status

**Dátum:** 2026-09-06  
**Otázka:** Ako sme na tom s požiadavkou na chatbota od p. Smolka?  
**Verdikt:** požiadavka je zachytená ako **Website Concierge**, ale verejný chatbot je dnes **BLOCKED**, nie pripravený na produkciu.

## 1. Čo vieme

- P. Smolko potvrdil, že pôvodný Realvia chatbot po novej verzii prestal fungovať.
- Pôvodný chatbot vedel filtrovať ponuky podľa prenájom/predaj a dom/byt/pozemok, zachytiť záujem o obhliadku, pracovať s Google kontaktmi/kalendárom a informovať príslušného makléra.
- V architektúre je náhrada pomenovaná ako **Website Concierge**: verejný AI asistent nad tenant-scoped ponukami, kvalifikáciou záujmu a bezpečným handoffom/bookingom.
- Najbližšia implementovaná Smolko hodnota je **Property Launch Pack V0**, nie chatbot. Launch Pack má vlastný endpoint a verification testy; je za flagom `PROPERTY_LAUNCH_PACK_V0` a výslovne nepíše do `portal_listings`.

## 2. Aktuálny stav blokátorov

| Oblasť | Stav | Dopad na chatbota |
|---|---|---|
| Realvia inventory | 132 Smolko properties v produkcii | Máme korpus, ale samotný počet riadkov nie je dôkaz tenant izolácie ani freshness. |
| SMO-B04 — Concierge public preview | `BLOCKED` | Chýba PROD cross-tenant negative test + active/freshness contract. PR #522 je len CODE dôkaz. |
| SMO-B05 — verejná AI/privacy/FAQ | `BLOCKED` | Chýba AI disclosure, controller/purpose/retention text, schválené FAQ a cesta k človeku. |
| SMO-B06 — callback handoff | `OPEN` | Treba routing matrix: broker pri ponuke, fallback broker, neprítomnosť, pracovné hodiny, SLA. |
| SMO-B07 — booking storage | `BLOCKED` | `scheduled_events` v produkcii neexistuje; história migrácie tvrdí opak, takže najprv RCA + DB GO. |
| SMO-B08 — Google Calendar | `BLOCKED` | Chýba OAuth/free-busy rozsah, pravidlá dostupnosti a timezone/buffer test. |
| SMO-B09 — potvrdený booking | `OPEN` | Treba idempotency, retry a notifikácie pred reálnym potvrdením termínu. |

## 3. Čo je overené dnes

Terminálové overenie:

```text
npx vitest run tests/verification/property-launch-pack-v0.verification.test.ts
Test Files  1 passed (1)
Tests       5 passed (5)
```

Interpretácia: existujúci Launch Pack test potvrdzuje flag, Guardian gate, export allowlist a zákaz mutácie Realvia queue / `portal_listings`. To nie je chatbot PASS, ale potvrdzuje, že najbližší Smolko feature nejde cez verejného bota.

## 4. Praktická odpoveď

**Nie sme v stave “nasadiť chatbot”.** Sme v stave:

1. požiadavka je zdokumentovaná a rozložená na bezpečné brány,
2. prvá zákaznícka hodnota ide cez Launch Pack, nie cez verejný bot,
3. read-only Concierge preview môže začať až po SMO-B04 + SMO-B05 + SMO-B06,
4. booking/kalendár je až ďalšia vrstva po vyriešení SMO-B07 až SMO-B09.

Najbezpečnejší prvý release chatbota je preto **read-only vyhľadanie ponúk + callback request**, nie automatická rezervácia termínu.

## 5. Jeden ďalší krok

**Ďalšia úloha:** `SMO-B04` — urobiť PROD cross-tenant negative test pre Realvia/property lookup a dopísať active/freshness contract.

**GO brána:** `GO REQUIRED`, lebo ide o produkčný dôkaz voči tenant izolácii. Bez mutácií, bez chat endpointu, bez OAuth a bez DB migrácie.

