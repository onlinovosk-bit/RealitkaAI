# PLATBY-END-TO-END: audit reality a kontrakt (RAU P00 → P03)

Stav: **audit hotový, kontrakt čaká na GO foundera.** Nič sa nezmenilo v kóde ani v PROD. Všetko nižšie je z čítania kódu na `origin/main` (`1d34d749`), nie z PROD databázy ani zo Stripe.

## P00 — Kontext

- **Cieľ:** po Stripe kroku C (ceny, ktoré vytvára founder) musí platba prejsť celou cestou: kúpa → webhook → odomknutie plánu → zrušenie alebo zlyhaná platba → odobratie plánu. Číslo `docs/STATUS.md` drží blok Predaj / platby na 0 % pri váhe 30.
- **Projekt:** `revolis`, kód je v tomto repe. Hranice: `WALL-ENV`, `WALL-DATA`, `WALL-EXTERNAL`, `WALL-FOUNDER`.
- **Nedostupné v tomto behu:** Stripe (žiadny kľúč, správne), PROD databáza, Stripe dashboard. Preto je každé tvrdenie o PROD nižšie `UNVERIFIED`.
- **Zákazy:** žiadny live kľúč, žiadna zmena cien, žiadny merge, žiadny zápis do PROD.

## P01 — Audit reality

Slovník: LIVE = existuje volajúci v produkčnej ceste; DEFINED = kód je, nikto ho nevolá; MISSING = neexistuje; UNVERIFIED = z repa sa nedá overiť; CONFLICT = zdroje si protirečia.

| vec | stav | dôkaz |
|---|---|---|
| Vytvorenie seat checkout | LIVE | `api/billing/credits/checkout/route.ts:32` volá `createSeatCheckoutSession` |
| Podpis webhooku | LIVE | `billing-store.ts:728` `constructEvent`; bez podpisu 400 (`webhook/route.ts`) |
| Splnenie seat checkoutu | LIVE | `webhook/route.ts` → `handlePricingCheckoutWebhook` → `applySeatCheckoutEntitlements` (`credits-billing.ts:190`) zapíše `agencies` (seats, tier, `subscription_status='active'`, `stripe_customer_id`, `stripe_subscription_id`) |
| Opakovaný webhook neduplikuje kredity | LIVE, testované | `applyTopupPurchase` s `idempotencyKey`; test „is idempotent" v `credits-billing.test.ts` |
| Zlyhané splnenie neodpovie 200 | LIVE, testované | `webhook/route.ts` vráti 500; test v `webhook/__tests__/route.test.ts` |
| **Zrušenie predplatného sa premietne do `agencies`** | **MISSING** | pozri F1 |
| **Zmena počtu miest zo Stripe portálu sa premietne do `agencies.seats`** | **MISSING** | pozri F1 |
| **Zlyhaná platba sa premietne do `agencies`** | **MISSING** | pozri F1 |
| `STRIPE_WEBHOOK_SECRET` je nastavený v PROD | UNVERIFIED | v kóde sa číta len v `billing-store.ts:730`, nikde sa nehlási (pozri F2) |
| Webhook endpoint a jeho zoznam udalostí v Stripe | UNVERIFIED | dá sa overiť len v Stripe dashboarde |
| Ceny `STRIPE_PRICE_*` v PROD | UNVERIFIED | `docs/STATUS.md`: 0 z 10 (meranie founder/CI); endpoint `/api/billing/checkout-config` hlási `missingPriceEnvKeys` |
| Vypršanie triálu → paywall | UNVERIFIED | `feature-gating.ts` číta `trialGrace`; neauditované v tomto behu |

### Nálezy

**F1 (vysoká): životný cyklus predplatného nikdy nedorazí k `agencies`.**
`handleStripeWebhookEvent` (`billing-store.ts:509`) na `customer.subscription.updated/deleted` volá iba `syncAccountTier`, ktorý mení tabuľku `profiles` (jeden používateľ), nie `agencies`. Seat checkout zapisuje entitlementy na `agencies` (`credits-billing.ts:212`). Jediné miesto v aplikácii, ktoré zapisuje `agencies.subscription_status` alebo `stripe_subscription_id`, je `applySeatCheckoutEntitlements` a zapisuje len `'active'`.
Dôsledok (z kódu): kancelária, ktorá zruší predplatné alebo jej zlyhá platba, si ponechá plán a miesta. MRR (`metrics/compute.ts`) pozná stav `canceled`, ale nikto ho nezapíše.
Reprodukcia: `grep -rn "subscription_status\|stripe_subscription_id" apps/crm/src --include=*.ts | grep -v __tests__`.
Čo nevidím: databázový trigger alebo iný proces v PROD. Preto stav nálezu je CONFIRMED v kóde, UNVERIFIED v PROD.

**F2 (vysoká): chýbajúci `STRIPE_WEBHOOK_SECRET` je tichý.**
Bez neho každý webhook zlyhá (400), zákazník zaplatí a nič sa neodomkne. Premenná je v schéme `config/env.ts` len `optional()`, nie je v `DEGRADED_WITHOUT`, takže ju nehlási ani `[env] degraded`, ani `/system`.

**F3 (stredná): `syncAccountTier` zahodí chybu a hľadá používateľa cez `listUsers()` bez stránkovania** (`billing-store.ts:103`, prvá stránka, predvolene 50 používateľov). Výsledok `update` sa nekontroluje (`:92`), takže zlyhaný zápis vráti 200 a Stripe nezopakuje. Týka sa starej cesty (`planKey`), nie seat cesty.

**F4 (nízka): `invoice.payment_failed` len zapíše aktivitu.** Stripe po zlyhaných pokusoch predplatné zruší sám (potom príde `deleted`), takže bez F1 sa to neprejaví nikdy.

Čo som overil a nie je nález: seat cesta pri chybe zápisu `agencies` vracia `false` a route odpovie 500, takže Stripe zopakuje (`credits-billing.ts:226`, test existuje).

## P02 — Ultrathink (zabi plán)

- **Verdikt:** stavať. Každá ďalšia hodina na iných funkciách je pri 0 % platieb predčasná, a platba, ktorú nevieme zrušiť, je najdrahšia chyba po prvom zákazníkovi (vracia sa ako reklamácia a skreslené MRR).
- **Najväčšie riziko:** konfigurácia mimo kódu. Webhook endpoint, jeho zoznam udalostí a `STRIPE_WEBHOOK_SECRET` môže overiť iba founder. Test s mockom dokáže správanie kódu, nie to, že Stripe naozaj volá endpoint.
- **Bottleneck:** Stripe krok C je founderov a kód ho neobíde.
- **Deterministické, nie LLM:** celý blok. Žiadne AI volania, žiadne nové dáta o osobách (GDPR: pracuje sa s identifikátormi Stripe a agentúry, ktoré už v systéme sú).
- **Možnosti:**
  1. **Plný blok (odporúčam):** F1 + F2 + test celej cesty + predletová kontrola.
  2. Len F2 a predletová kontrola: 1 hodina, ale zrušenie ostane bez efektu.
  3. Nič, kým nie sú ceny: ušetrí čas, ale prvý zákazník, ktorý zruší, odhalí F1 v produkcii.
- **Ústava v2 (návrh, nie finálne skóre):** Q1 platiaci klient, ktorý nevie zrušiť alebo mu neprejde platba, je reklamácia, takže áno. Q3 platby sú posledný krok reťazca Provízia → príjem, áno. Q8 správny čas (blokuje príjem). Q10–12 sú na founderovi, preto skóre nezapisujem.

## P03 — Kontrakt

**ID:** PLATBY-E2E · **PROJECT:** revolis · **MODE:** STANDARD · **WALLS:** WALL-ENV, WALL-DATA, WALL-EXTERNAL, WALL-FOUNDER

**FOUNDER BRIEF**
- Čo: webhook premietne zrušenie, zmenu počtu miest a zlyhanú platbu na kanceláriu; chýbajúci webhook secret sa začne hlásiť; jeden test prejde celú cestu.
- Prečo teraz: ceny nahráš ty, a kým to nie je hotové, prvý zrušený klient zostane s plnou licenciou a falošným MRR.
- Čo to stojí: jedna vetva, jeden PR, bez nových závislostí.
- Čo sa môže pokaziť: zlý zápis stavu by mohol odobrať plán platiacemu klientovi. Preto sa mení iba `agencies` podľa `stripe_subscription_id`, ktoré sa uložilo pri kúpe, a udalosť neznámej predplatenej kancelárie nič nemení.
- Čo od teba potrebujem: po merge nastaviť `STRIPE_WEBHOOK_SECRET` a overiť endpoint v Stripe (zoznam nižšie).

**OBJECTIVE:** po `customer.subscription.updated/deleted` a `invoice.payment_failed/paid` zodpovedá `agencies` stavu predplatného vo Stripe a chýbajúci webhook secret sa hlási v `[env] degraded` a na `/system`.

**SCOPE**
1. `handleStripeWebhookEvent`: pre predplatné nájdené podľa `stripe_subscription_id` (fallback `stripe_customer_id`) aktualizuj `agencies`: `subscription_status` (z `status` Stripe), `seats` (z množstva položky), pri `deleted` `account_tier='free'`, `billing_updated_at`. Chyba zápisu vráti non-2xx, aby Stripe zopakoval.
2. Ochrana poradia: udalosť staršia než `billing_updated_at` stav neprepíše.
3. `STRIPE_WEBHOOK_SECRET` do `DEGRADED_WITHOUT` a do kontrol `/system`; pole `webhookSecretConfigured` v `/api/billing/checkout-config` (len boolean).
4. Test celej cesty cez skutočný route handler s mockovaným Stripe a Supabase: kúpa → `active` → zmena miest → zrušenie → `free`; zlyhaný zápis → 500; neznáme predplatné → bez zmeny; opakovaná udalosť → rovnaký stav.

**NON-SCOPE:** ceny a ich vytváranie, live kľúče, stará cesta `planKey` (F3 ide do backlogu, bez zmeny teraz), logika triálu, dunning e-maily, UI na `/billing`, akýkoľvek zápis do PROD, merge.

**ACCEPTANCE (každé overiteľné príkazom)**
- `cd apps/crm && npx vitest run src/lib/__tests__/billing-lifecycle.test.ts` zelené.
- Mutation proof: vráť zápis `agencies` pri `deleted` na pôvodný stav, test zhasne; odstráň ochranu poradia, test zhasne; vyraď `STRIPE_WEBHOOK_SECRET` z `DEGRADED_WITHOUT`, test zhasne.
- `bash scripts/ci/prepush-gate.sh` prejde, typecheck ratchet sa nezvýši.
- `grep` reprodukcia z F1 ukáže zápis `subscription_status` aj mimo `applySeatCheckoutEntitlements`.

**CIEĽOVÝ STAV DÔKAZU:** TESTED. Nie PRODUCTION VERIFIED: to je možné až po tvojom kroku C a nastavení secretu.

**NEZÁVISLÝ OVEROVATEĽ:** ty (kontrola v Stripe a smoke test nákupu) a CI. Implementáciu ani testy nepíše overovateľ.

**FOUNDER-ONLY po merge (UNVERIFIED, overíš len ty):**
1. Stripe → Webhooks: endpoint `https://<produkčná doména>/api/billing/webhook` existuje a poslúcha `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
2. `STRIPE_WEBHOOK_SECRET` (`whsec_…`) vo Vercel production, potom redeploy. Hodnotu mi neposielaj.
3. Stripe krok C (ceny), potom smoke nákup a zrušenie.

**BUDGET:** jedna vetva, odhad 2 až 4 hodiny práce, bez nákladu na tokeny (`NEMERANÉ`, nič sa nevolá cez LLM).
**RISKS:** P1 zlý zápis odoberie plán platiacemu klientovi (mitigácia vyššie); P2 udalosti prichádzajú mimo poradia (ochrana poradia); P2 Stripe pošle stav, ktorý nepoznáme (neznámy stav sa nemapuje, nič nemení).
**ROLLBACK:** revert jedného PR; žiadna migrácia, preto bez zmeny schémy.
**STOP CONDITIONS:** ak `agencies` nemá stĺpce, ktoré scope predpokladá (stĺpce `subscription_status`, `stripe_subscription_id`, `billing_updated_at` sú v kóde zapisované, `seats` tiež); ak by riešenie vyžadovalo migráciu; ak test odhalí, že PROD má trigger, ktorý toto už robí.
**APPROVAL GATE:** slovo `GO PLATBY-E2E`. Merge a PROD sú vždy zvlášť.
