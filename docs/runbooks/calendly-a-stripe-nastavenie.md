# Runbook: Calendly webhook a Stripe fakturácia

**Dátum:** 2026-09-28
**Pre koho:** founder (kroky v Calendly, Stripe a Vercel UI)
**Stav pred začiatkom:** zmeraný, nie odhadnutý — viď „Čo je dnes naozaj nastavené"

---

## Čo je dnes naozaj nastavené

Zmerané cez Vercel API (iba názvy premenných, hodnoty som nedešifroval) a čítaním kódu.

### Calendly: NIE JE nastavený

| | stav |
|---|---|
| `CALENDLY_WEBHOOK_SECRET` vo Vercel projekte | **chýba vo všetkých troch prostrediach** |
| tabuľka `demo_bookings` na PROD | **neexistuje** |
| tabuľka `demo_prospects` na PROD | **neexistuje** |
| cron `/api/cron/demo-brief` v `apps/crm/vercel.json` | nie je |
| cron `/api/cron/demo-recap` v `apps/crm/vercel.json` | nie je |

**Dôsledok:** `POST /api/webhooks/calendly` skončí na **500** už na prvom riadku,
skôr než sa dotkne databázy:

```ts
const secret = process.env.CALENDLY_WEBHOOK_SECRET;
if (!secret) {
  return NextResponse.json({ error: "CALENDLY_WEBHOOK_SECRET not configured" }, { status: 500 });
}
```

Takže **žiadne objednanie dema nebolo nikdy zaznamenané**. Zároveň to znamená,
že formulácia „strácame akvizičné dáta každý deň" je podmienená: strata nastáva
len vtedy, ak je v Calendly ten endpoint naozaj nastavený a doručuje. Keďže
secret chýba, webhook sa nedal úspešne overiť ani raz — Calendly by dostával 500
a po niekoľkých pokusoch subscription sám zneaktívni. Koniec je v oboch
prípadoch rovnaký (nula záznamov), ale príčina je iná a treba to vedieť.

### Stripe: čiastočne nastavený, 7 z 21 kľúčov

| premenná | prostredia |
|---|---|
| `STRIPE_SECRET_KEY` | development, preview, production |
| `STRIPE_WEBHOOK_SECRET` | development, preview, production |
| `STRIPE_PRICE_STARTER` | production, preview, development |
| `STRIPE_PRICE_PRO` | production |
| `STRIPE_PRICE_ONBOARDING` | preview, production |
| `STRIPE_PRICE_MARKET_VISION` | development, preview, production |
| `STRIPE_PRICE_PROTOCOL_AUTH` | production |

**Chýba 14 price ID**, ktoré kód číta — a bez nich tie checkouty nemôžu fungovať:

| chýbajúca premenná | čo tým padá | cena v kóde |
|---|---|---|
| `STRIPE_PRICE_CREDITS_START` | top-up Štart | 49 € / 50 kreditov |
| `STRIPE_PRICE_CREDITS_RAST` | top-up Rast (featured) | 129 € / 150 kreditov |
| `STRIPE_PRICE_CREDITS_PRO` | top-up Pro | 379 € / 500 kreditov |
| `STRIPE_PRICE_CREDITS_MEGA` | top-up Mega | 999 € / 1500 kreditov |
| `STRIPE_PRICE_STARTER_PACK` | Maklérsky štartovací balík (`/balik`) | 47 € |
| `STRIPE_PRICE_OWNER_COCKPIT` | Owner Cockpit | 349 € |
| `STRIPE_PRICE_OWNER_COCKPIT_FOUNDER` | Owner Cockpit founder cena | 249 € |
| `STRIPE_PRICE_SCALE` | tier Scale | — |
| `STRIPE_PRICE_ENTERPRISE` | tier Enterprise | — |
| `STRIPE_PRICE_ADDON_LEADS_ENGINE` | add-on | — |
| `STRIPE_PRICE_ADDON_MARKET_INTELLIGENCE` | add-on | — |
| `STRIPE_PRICE_ADDON_PROTOCOL_AI` | add-on | — |
| `STRIPE_PRICE_ADDON_ACTIVE_FORCE_CALLS` | add-on | — |

Zdroj cien: `apps/crm/src/lib/program-tier-pricing.ts` (`TOPUP_PACKAGES`,
`STARTER_PACK`, `COCKPIT_PRODUCTS`). **Cenník v kóde teda existuje** — chýba mu
napojenie na Stripe SKU.

Stripe webhook endpoint je **`/api/billing/webhook`** (nie pod `/api/webhooks/`)
a spracúva: `checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`,
`invoice.payment_failed`.

---

## ČASŤ A — Calendly webhook

**Poradie je dôležité.** Ak nastavíš webhook v Calendly skôr, než existuje
tabuľka, každé doručenie skončí na 500 a Calendly subscription po sérii chýb
zneaktívni.

### A1. Doplniť chýbajúce tabuľky na PROD (moja práca, potrebuje bránu)

Migrácia `20260612000000_demo_ops.sql` v repozitári zakladá `demo_bookings`,
`demo_prospects` aj ich indexy a RLS. Na PROD nikdy nedobehla (je medzi 64
nezaznamenanými, viď AP-024). Bez `demo_bookings` sa krok A4 nedá overiť.

→ **Toto nerob ty.** Povedz `GO DEMO-OPS-TABLES` a spravím to rovnakým postupom
ako pri `leads` a `IS NULL` únikoch: meranie pred/po, história pod verziou
súboru, sonda z pohľadu service role, a nič iné sa nemení.

### A2. Vygenerovať a uložiť signing key

Calendly pri vytvorení webhook subscription vracia **signing key**. Kód ho
očakáva v `CALENDLY_WEBHOOK_SECRET` a overuje podpis takto
(`apps/crm/src/lib/demo-ops/calendly-verify.ts`):

- hlavička: `Calendly-Webhook-Signature`
- formát: `t=<unix timestamp>,v1=<hex hmac>`
- algoritmus: `HMAC-SHA256` nad stringom `` `${t}.${rawBody}` ``
- tolerancia veku podpisu: **300 s**
- porovnanie: `crypto.timingSafeEqual`

To je presne schéma, ktorú Calendly používa — nemusíš nič prepočítavať, len
uložiť kľúč, ktorý Calendly vypíše.

**Vo Vercel:** Project `realitka-ai` → Settings → Environment Variables → Add
- Key: `CALENDLY_WEBHOOK_SECRET`
- Value: signing key z kroku A3
- Environments: **Production** (Preview pridaj len ak chceš testovať na preview URL)
- Type: Sensitive / Encrypted

Po pridaní premennej treba **redeploy** — Next.js si server-side env načíta pri
builde/bootstrape funkcie, nie za behu.

### A3. Vytvoriť webhook subscription v Calendly

Calendly to nemá v bežnom UI pre všetky plány — robí sa to cez API a vyžaduje
platený plán s prístupom k webhookom. Potrebuješ Personal Access Token z
Calendly (Integrations → API & Webhooks).

```bash
# 1) zisti svoje organization a user URI
curl -s https://api.calendly.com/users/me \
  -H "Authorization: Bearer <CALENDLY_PERSONAL_ACCESS_TOKEN>"
# z odpovede si vezmi resource.uri (user) a resource.current_organization

# 2) vytvor subscription
curl -s -X POST https://api.calendly.com/webhook_subscriptions \
  -H "Authorization: Bearer <CALENDLY_PERSONAL_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://app.revolis.ai/api/webhooks/calendly",
    "events": ["invitee.created"],
    "organization": "<current_organization URI>",
    "scope": "organization"
  }'
```

**Dôležité:**
- `events` — kód spracúva iba `invitee.created`. Iné typy vráti ako
  `{ok: true, skipped: true, reason: "not_invitee_created"}`, teda neuškodia,
  ale netreba ich posielať.
- Odpoveď obsahuje `resource.signing_key` → **to je hodnota pre A2.** Calendly ju
  vypíše iba raz.
- URL musí byť produkčná doména, nie preview.
- `scope: "organization"` zachytí všetkých členov; `"user"` len teba.

### A4. Overiť, že to funguje

1. Objednaj si testovacie demo cez svoj vlastný Calendly link (použi firemný
   e-mail, nie gmail — matching prospekta ignoruje osobné domény: `gmail.com`,
   `azet.sk`, `zoznam.sk`, `yahoo.com`, `outlook.com`, `hotmail.com`).
2. Skontroluj doručenie v Calendly: `GET https://api.calendly.com/webhook_subscriptions/<uuid>`
   → `state` musí byť `active`, nie `disabled`.
3. Napíš mi „over Calendly" a ja to potvrdím dotazom na PROD:

```sql
select id, invitee_email, scheduled_at, utm_source, utm_campaign,
       prospect_id, unknown_prospect, created_at
from public.demo_bookings
order by created_at desc
limit 5;
```

Očakávaný stav po úspechu: jeden riadok, `unknown_prospect = true` (kým
`demo_prospects` nemá tvoju domému), UTM parametre vyplnené, ak prišli
z Calendly `tracking`.

### A5. Čo vedome NEriešime teraz

`/api/cron/demo-brief` a `/api/cron/demo-recap` v `vercel.json` nie sú, takže
z tých rezervácií sa zatiaľ nič automaticky nespracuje — len sa zbierajú.
Registrovať crony má zmysel až keď v tabuľke niečo je; inak by len denne bežali
naprázdno. Samostatná brána.

---

## ČASŤ B — Stripe: aby sa dalo vyfakturovať

Fakturácia stojí na dvoch nezávislých veciach. **Jedna je tvoja (KYB), druhá je
konfiguračná (price ID).** Ani jedna nefunguje bez druhej.

### B1. KYB / aktivácia účtu — iba ty

Stripe nepustí live platby, kým nie je účet aktivovaný. Bez toho ti `STRIPE_SECRET_KEY`
funguje len v test mode.

V Stripe Dashboard → **Activate account** (alebo Settings → Business settings →
Account details). Pripravené mať:

- **IČO, DIČ, IČ DPH** (ak si plátca) a presný obchodný názov podľa ORSR
- **adresa spoločnosti** zhodná s registrom
- **IBAN** firemného účtu na výplaty (payouts)
- **doklad totožnosti** konateľa / beneficial ownera
- **popis podnikania** — čo predávate, komu, priemerná cena, mesačný objem
- **web** s viditeľnými obchodnými podmienkami, cenníkom, kontaktom a reklamačným
  poriadkom (Stripe to kontroluje; chýbajúce ToS je najčastejší dôvod zdržania)

Presné znenie krokov v Stripe UI sa mení a nebudem ti ho tu vymýšľať — v
Dashboarde ťa prevedie checklist. Schvaľovanie býva hodiny až dni; ak niečo
dožiada, príde e-mail a v Dashboarde svieti „Action required".

**Kontrola, že je hotovo:** v Dashboarde sa dá prepnúť na **live mode** a
Settings → Payouts zobrazuje účet a plán výplat, nie výzvu na doplnenie.

### B2. Vytvoriť produkty a ceny v Stripe (live mode)

Až po B1, a **v live mode** — test-mode price ID v produkcii nefunguje.

Pre každý riadok z tabuľky chýbajúcich premenných vyššie: Stripe → Product
catalog → Add product. Nastav:

- **Name** = label z `program-tier-pricing.ts` (napr. „Rast", „Maklérsky
  štartovací balík", „Owner Cockpit")
- **Price** = suma z tabuľky, **EUR**
- **Billing** — pozor na typ, kód s tým počíta:
  - top-up balíčky (`start`, `rast`, `pro`, `mega`) a starter pack = **One-time**
  - tiery (Starter, Pro, Scale, Enterprise, Owner Cockpit) = **Recurring, monthly**
- **Tax behavior** — ak si plátca DPH, rozhodni raz, či sú ceny **s DPH
  (inclusive)** alebo **bez (exclusive)**, a drž to rovnako pri všetkých. V kóde
  sú čísla ako `priceEur: 49`; ak ich myslíš s DPH, nastav inclusive, inak Stripe
  pripočíta DPH navrch a zákazník zaplatí 58,80 € tam, kde si sľúbil 49 €.

Po vytvorení skopíruj **Price ID** (tvar `price_...`, nie `prod_...`).

### B3. Doplniť price ID do Vercel

Vercel → `realitka-ai` → Settings → Environment Variables. Pre každú chýbajúcu
premennú z tabuľky: Key = názov premennej, Value = `price_...`, Environment =
**Production** (a Preview, ak chceš vedieť testovať na preview buildoch).

Potom **redeploy**.

Poznámka k už existujúcim: `STRIPE_PRICE_PRO` a `STRIPE_PRICE_PROTOCOL_AUTH` sú
nastavené len v **production**. Ak testuješ checkout na preview URL, tie dva tam
padnú. Nie je to chyba, len to treba vedieť.

### B4. Stripe webhook na náš endpoint

Stripe → Developers → Webhooks → Add endpoint:

- **URL:** `https://app.revolis.ai/api/billing/webhook`
- **Events** (presne tie, ktoré kód spracúva):
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

Skopíruj **Signing secret** (`whsec_...`) → to je hodnota `STRIPE_WEBHOOK_SECRET`.
Tá premenná už existuje, takže ju **prepíš**, nie pridávaj druhú — a pozor, ak
bola z test mode, live endpoint má iný secret.

Endpoint vracia **500, keď fulfillment seat/top-up/starter-pack checkoutu
zlyhá** — vedome, aby Stripe skúšal znova a nezostal zaplatený checkout bez
pripísaných kreditov. Takže červené doručenia v Stripe Dashboarde po platbe
nie sú kozmetika, treba ich riešiť.

### B5. Overiť end-to-end

1. V live mode kúp najlacnejšiu položku (starter pack 47 € alebo top-up Štart 49 €)
   naozaj — vlastnou kartou, a potom refund. Test mode neoverí live price ID.
2. Stripe → Webhooks → tvoj endpoint → **posledné doručenie musí byť 2xx**.
3. Napíš mi „over Stripe" a potvrdím dotazom na PROD:

```sql
select agency_id, delta, reason, source, ref, created_at
from public.credit_ledger
order by created_at desc
limit 5;
```

Kredity sa pripisujú cez `credit_ledger`; ak je tam riadok s `source` z
checkoutu, fulfillment dobehol. **Pozor:** `credit_ledger` má dnes RLS zapnutú
a **nula politík** — čítať sa dá len service rolou, čo tento dotaz robí. Nie je
to chyba (všetci volajúci v kóde idú cez service rolu), ale je to na zozname
otvorených vecí.

---

## Čo z tohto blokuje čo

```
KYB (B1) ──────────────► live price ID (B2) ──► env (B3) ──► checkout funguje
                                                    │
Stripe webhook (B4) ────────────────────────────────┴──► kredity sa pripíšu

demo_ops tabuľky (A1) ──► CALENDLY_WEBHOOK_SECRET (A2) ──► subscription (A3) ──► rezervácie sa ukladajú
```

Dve veci sa dajú robiť paralelne: KYB je na Stripe strane (hodiny–dni), tabuľky
a Calendly sú nezávislé.

## Rozhodnutie, ktoré je stále na tebe

Cenník v kóde má **monthly + kredity** (49/129/379/999 € top-upy, 349 € Owner
Cockpit, 47 € starter pack). Otvorené z predchádzajúcich sessions bolo, či ide
model **monthly + kredity, alebo monthly bez kreditov**, a či onboarding zostáva
99 € alebo ide na 49 € s DPH. **Kým to nerozhodneš, nedá sa vytvoriť B2** —
vytvorené a použité Stripe ceny sa nedajú len tak zmeniť, cena sa archivuje
a nahrádza novou, čo špiní katalóg. Rozhodni to pred B2, nie po ňom.

---

*Stav nastavenia zmeraný 2026-09-28: Vercel env (iba názvy premenných, hodnoty
nedešifrované), `apps/crm/vercel.json`, a kód rout `/api/webhooks/calendly`
a `/api/billing/webhook`.*
