# Vymyslené predvolené hodnoty v `leads` — oprava historických dát (PLÁN, čaká na GO)

**Dátum:** 2026-09-29 · **Súvisí:** #749 (oprava pipeline pri novom leade), `docs/architecture/matching-input-contract-v1.md`

Oprava pipeline (#749) a oprava historických dát sú **dve samostatné veci**.
#749 zabráni novým vymysleným hodnotám z `acquire/email`. Tento dokument rieši
riadky, ktoré už sú v PROD.

## Rozsah (PROD, iba počty)

Leady, ktoré majú **zároveň** `property_type = 'Byt'` a `financing = 'Hypotéka'`:

| Zdroj | Počet | Bez akejkoľvek úpravy po vzniku (`updated_at ≈ created_at`) | Neskôr upravené |
|---|---:|---:|---:|
| portal:Nehnuteľnosti.sk | 19 | 7 | 12 |
| portal:Reality.sk | 11 | 3 | 8 |
| portal:Topreality.sk | 7 | 0 | 7 |
| portal:Bazos.sk / Bazoš.sk | 5 | 2 | 3 |
| **portály spolu** | **42** | **12** | **30** |
| ručný formulár a iné (Odporúčanie, FB, Web formulár, Chatbot, Portál, web_form, Google Ads) | 17 | 1 | 16 |

„Neskôr upravené“ **neznamená**, že maklér potvrdil „Byt“. Rovnako to môže byť AI
triage alebo doplnenie majiteľa, ktoré menia `updated_at`. **Z dát sa to nedá
rozlíšiť** (história zmien polí sa neukladá), preto hromadný UPDATE nie je
bezpečný.

## Príčina

Hodnoty dosádzajú štyri miesta v kóde. Opravené je len prvé:

1. `api/acquire/email/route.ts`: „Byt“ + „Hypotéka“. **Opravené v #749.**
2. `components/leads/lead-create-form.tsx:52-56`: „Byt“, „2 izby“, „Hypotéka“, „Do 3 mesiacov“. Maklér ich pri odoslaní nevidí ako svoju voľbu.
3. `lib/universal-import/realvia/map-realvia-client.ts:221`: „Byt“.
4. `lib/integrations-store.ts:317` (Portal Import): „Byt“.

Body 2–4 sú v rozsahu D2 „Safety + Truth“ / D7 „Zero fake data“ a potrebujú
vlastné GO.

## Návrh opravy (dve vrstvy, poradie)

**A. Ochrana, bez zmeny dát (odporúčané hneď):** D4 podľa
`matching-input-contract-v1.md` tieto stĺpce **vôbec nečíta**. Kontaminácia
matchingu je tým vylúčená bez zásahu do riadkov.

**B. Oprava dokázateľných riadkov (vyžaduje GO):** iba 12 portálových leadov, ktoré
po vzniku nikto neupravil. Tam je hodnota dokázateľne predvolená:

```sql
begin;
-- očakávané: 12 riadkov; ak iné číslo → rollback a prešetriť
update public.leads
   set property_type = '', financing = ''
 where source like 'portal:%'
   and property_type = 'Byt' and financing = 'Hypotéka'
   and updated_at <= created_at + interval '1 minute'
returning id;
-- commit; / rollback;
```

**C. Zvyšných 47 riadkov:** nemeniť hromadne. Po D4 ich zobraziť maklérovi ako
„typ a financovanie neoverené“. Potvrdenie makléra sa uloží ako dopyt potvrdený
maklérom a má autora aj čas.

## Čo sa NErobí

- Žiadny UPDATE bez GO foundera.
- Žiadne mazanie a žiadne odhadovanie „správnej“ hodnoty z textu priamo do `leads`.
  Dopyt z textu patrí do `lead_demands`.
