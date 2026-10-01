# Wall queue — W1 a W2 (návrh obálok, čakajú na GO)

**Dátum:** 2026-09-22 · **Formát:** scope envelope podľa
`docs/prompts/multi-agent-protocol-v0/07-work-block-execution-protocol.md` §3
**Stav:** NÁVRH. Ani jedna stena sa nezačala. Obálka je súčasťou zadania, nie výsledku —
executor ju navrhuje, founder ju potvrdzuje alebo mení.

Obe steny vychádzajú z nálezov overených dnes v produkcii
(`docs/reports/2026-09-22-ingest-envelope-and-recipient-guard.md`), nie z nápadov.

---

## Prečo práve tieto dve

Poradie určila Ústava (`docs/architecture/revolis-constitution-v2.md`), nie chuť. Kandidáti
boli traja; tretí je nižšie aj so skóre, aby bolo vidieť, prečo vypadol.

| Kandidát | Skóre | Výsledok |
|---|---|---|
| W1 — integrita kontaktu a priradenia | 10/12 | **BUILD** |
| W2 — živosť prijímacích adries | 9/12 | **BUILD** (viazané na stav, viď §8 nižšie) |
| Stráž nad driftom schémy | 7/12 | **BACKLOG** — chráni nás, nezískava ani neudržuje klienta |

Rozhodujúci argument pre obe: **e-mail deviatim maklérom bol odoslaný dnes.** Sľúbili sme
im, že dopyty budú chodiť priradené. Dnes má **nula** reálnych leadov majiteľa a jeden má
ako kontakt adresu samotného klienta. Stena W1 ten sľub kryje, stena W2 zisťuje, keď
prestane platiť.

---

# WALL W1 — INGEST-CONTACT-INTEGRITY

## Objective

Dopyt, ktorý dorazí do ingestu, vytvorí lead, ktorého **kontakt je záujemca — nikdy človek
od klienta** — a ktorého **majiteľ je správny maklér**, alebo poctivo prázdny stav.
A keď sa kontrakt Workera zmení, **CI to povie**, nie produkcia.

## Allowed files / areas

```
apps/crm/src/lib/acquire/email-adapter.ts
apps/crm/src/app/api/acquire/email/route.ts
apps/crm/src/lib/acquire/__tests__/…            (nové testy)
apps/crm/src/app/api/acquire/email/__tests__/…  (nové testy)
apps/crm/supabase/migrations/…                  (iba ak §„domény agentúry" vyžaduje stĺpec)
```

## Allowed operations

Čítanie repozitára, zmena uvedených súborov, nové testy, lokálny `next build` / `tsc` /
vitest, commit a push na vlastnú vetvu, draft PR, read-only dopyty do produkčnej DB.

## Forbidden operations

Merge, push do `main`, force-push, **akýkoľvek zápis do produkčnej DB**, zmena
`.github/workflows`, zmena pricing logiky, zásah do Cloudflare Workera (je mimo repozitára —
ak sa ukáže, že oprava patrí tam, stena sa zastaví a doručí nález).

## Čo sa spraví

1. **Vylúčenie podľa domén agentúry, nie podľa domény príjemcu.**
   Dnes `isNonLeadAddress` vylúči adresu, len keď sa jej doména rovná doméne príjemcu.
   Odkedy ingest beží na `revolis.ai`, doména klienta sa s ňou nikdy nezhoduje, takže stráž
   je mŕtva. Nahradí ju zoznam vlastných domén vedený na agentúre.
2. **Zrušenie fallbacku na vylúčenú adresu, keď lead má telefón.**
   `pickContactEmail` dnes končí `return labelled` aj potom, čo stráž adresu vylúčila.
   Prázdny e-mail je čitateľný stav; cudzí e-mail vyzerá ako platný kontakt a **spustí
   automatickú odpoveď** (zapnutá u 6 agentúr zo 6).
3. **Rozlíšiteľný log pre `to`.** Dnes „`to` chýba" a „`to` sa nezhodovalo so žiadnym
   riadkom" vyzerajú v dátach rovnako — obe nezapíšu heartbeat. Dva rozdielne kódy.
4. **Testy, ktoré nálezy držia.** Dopyt doručený na `…@revolis.ai`, v tele adresa na doméne
   klienta → kontakt musí byť NULL, nie tá adresa. Plus test na chýbajúce `to`.

## Expected deliverable

Jeden draft PR: oprava + testy + jedna veta v `memory/decisions.md` o zmene správania.
Automatická odpoveď sa od tejto steny prestane posielať na adresy klienta — **to je zmena
správania, nie oprava kozmetiky**, a preto je to checkpoint, nie micro-task.

## Verification criteria

- Nový test **najprv zlyhá** na dnešnom kóde a prejde po oprave (inak nemeria nič).
- `next build` a `tsc --noEmit` čisté.
- Existujúce testy ingestu zelené — vrátane tých, ktoré dnes chránia dedup a idempotenciu.
- Read-only prehratie dnešného leadu z 05:47 cez parser: kontakt musí vyjsť NULL.

## Escalation conditions (§7)

- **B — oprava patrí mimo repozitár** (ak sa ukáže, že `to` posiela Worker zle, stena
  končí nálezom, nie zásahom do Cloudflare).
- **D — potrebný zápis do produkčnej DB** (ak zoznam domén agentúry vyžaduje migráciu
  a naplnenie, migrácia sa napíše, ale **neaplikuje** — to je samostatné GO).

## Odhad

4–6 súborov, 150–250 riadkov vrátane testov, ~pol dňa. Strop 2× podľa §4.

---

# WALL W2 — INGEST-LIVENESS

## Objective

Keď prijímacia adresa **prestane doručovať**, nech sa to dá zistiť skôr, než to zistí
maklér tým, že mu tri týždne nechodia dopyty. A nech founder vie na jednej obrazovke
odpovedať na otázku, ktorú dnes vie zodpovedať len hádaním: **funguje to všetkým deviatim?**

## Prečo to nie je kozmetika

Dnes nie je rozdiel medzi „schránka funguje a nikto nepísal" a „preposielanie sa rozbilo".
Obe vyzerajú rovnako: ticho. Pri integrácii, ktorú sme práve sľúbili deviatim ľuďom, je
ticho najdrahší stav, aký existuje — klient stratí dôveru skôr, než my stratíme dáta.

## Allowed files / areas

```
apps/crm/src/app/(dashboard)/…      (jedna read-only obrazovka alebo sekcia)
apps/crm/src/lib/acquire/…          (výpočet stavu, bez zmeny ingest cesty)
apps/crm/src/app/api/…              (jeden read-only endpoint, ak treba)
apps/crm/src/**/__tests__/…
```

## Allowed operations

Ako W1. Navyše: read-only dopyty nad `inbound_mailboxes` a `leads`.

## Forbidden operations

Ako W1. Navyše: **žiadna zmena ingest cesty** (`route.ts` sa v tejto stene nemení —
to je W1), **žiadne posielanie notifikácií** v tejto stene (alert ako e-mail/SMS je
samostatné rozhodnutie o tom, koho a ako často budíme).

## Čo sa spraví

1. **Stav adresy počítaný z `last_received_at`**, ktorý zaviedla #633:
   `nikdy nedoručila` · `doručila pred N dňami` · `aktívna`.
   Prah „ticho" je konfigurovateľný, nie zahrabaný v kóde.
2. **Poctivé prázdne stavy.** Adresa bez `profile_id` sa zobrazí ako *nepriradená*, nie ako
   cudzia chyba. Adresa, ktorá nikdy nedoručila, sa zobrazí ako **„zatiaľ nikdy"** — nie
   ako nula, ktorá vyzerá ako meranie. (CLAUDE.md, pravidlo o nepripojenom zdroji.)
3. **Jeden riadok na adresu**, nie dashboard. Kto ju vlastní, kedy naposledy doručila,
   koľko leadov z nej vzniklo. Nič, čo nevieme spočítať z vlastnej DB.

## Expected deliverable

Jeden draft PR: read-only pohľad + test na výpočet stavu + screenshot z vyrenderovanej
stránky (nie tvrdenie, že to vyzerá dobre).

## Verification criteria

- Test na hraniciach prahu: deň pred, deň po, `NULL`.
- Vyrenderované v prehliadači na 1440 px aj 390 px, bez pretečenia — rovnako, ako sa
  overovala landing page (vtedy to odhalilo dve chyby, ktoré čítanie kódu nenašlo).
- Čísla v pohľade sedia s tým, čo vráti priamy `SELECT` — overené aspoň na jednom riadku.

## State binding (§8) — toto je podstatné

**`valid_for`:** `email.to` je obálkový príjemca, teda heartbeat sa zapisuje aj pri
**preposlanej** pošte.

**`on_state_change: abort`.** Ak sa ukáže, že Worker posiela hlavičku `To:`, potom
`last_received_at` pri preposlanej pošte **nikdy nenaskočí** a tento pohľad by ukazoval
všetkých deviatich ako mŕtvych, hoci dopyty chodia. To by bol horší stav než žiadny pohľad:
falošný poplach, ktorý sa tvári ako meranie.

**Preto W2 nezačína, kým nepadne test z §5 reportu** — jedna preposlaná správa od jedného
makléra. Ak dopadne zle, W2 sa ruší a namiesto nej ide oprava Workera.

## Escalation conditions (§7)

- **A — predpoklad neplatí** (envelope test dopadne zle → stena sa ruší, nie prerába).
- **C — rozsah rastie** (ak sa ukáže, že „jeden riadok na adresu" potrebuje agregácie cez
  leady za obdobie, stena sa zastaví na čiastkovom výsledku).

## Odhad

5–8 súborov, 250–400 riadkov vrátane testov, ~1 deň. Strop 2× podľa §4.

---

## Čo ani jedna stena nerobí

- **Nemení Cloudflare Worker.** Je mimo repozitára a mimo review. Ak oprava patrí tam,
  obe steny to ohlásia ako nález.
- **Nezapisuje do produkčnej DB.** Migrácia sa môže napísať, aplikovať ju je vlastné GO.
- **Neposiela nič maklérom ani klientovi.** Žiadna notifikácia, žiadny e-mail.
- **Nerieši drift schémy.** Ten je zaparkovaný so skóre 7/12 a vlastným odôvodnením.

## Poradie

W1 ide prvá a nezávisle. W2 čaká na výsledok envelope testu — ten môže prísť sám od seba,
keď prvý maklér zapne preposielanie.
