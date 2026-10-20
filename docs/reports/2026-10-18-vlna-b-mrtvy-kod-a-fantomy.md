# Vlna B — čo z nálezov obstálo: 1 reálny mŕtvy kód, 1 fantóm, 1 už opravené

**Dátum:** 2026-10-18 · **PROD:** Supabase `ypgajkhqtbriqqmyawyv` · **Zápis do PROD:** nie.

Vlnu B som zastavil spolu s vlnou A. Z jej nálezov som si **každý overil sám**
v tomto turne — v PROD cez `to_regclass` a v repozitári cez `grep`. Výsledok:
z troch „chýbajúcich tabuliek" je jedna skutočný problém, jedna fantóm a jedna
bola opravená pred trinástimi dňami. Píšem to takto natvrdo, pretože presne toto
je cena za prijímanie výstupov swarmu bez overenia.

---

## 0. Čo v PROD existuje a čo nie (ZMERANÉ)

```sql
SELECT 'events' AS t, to_regclass('public.events')::text
UNION ALL SELECT 'outbound_messages',        to_regclass('public.outbound_messages')::text
UNION ALL SELECT 'event_store',              to_regclass('public.event_store')::text
UNION ALL SELECT 'outreach_messages',        to_regclass('public.outreach_messages')::text
UNION ALL SELECT 'realvia_metrics',          to_regclass('public.realvia_metrics')::text
UNION ALL SELECT 'realvia_processing_queue', to_regclass('public.realvia_processing_queue')::text;
```

| tabuľka | v PROD |
|---|---|
| `events` | ✅ |
| `outbound_messages` | ✅ |
| `realvia_metrics` | ✅ |
| `realvia_processing_queue` | ✅ |
| **`event_store`** | ❌ **neexistuje** |
| **`outreach_messages`** | ❌ neexistuje |

---

## 1. NÁLEZ OBSTÁL — `event_store`: kód píše do tabuľky, ktorá na PROD nie je

`apps/crm/src/infra/db/eventstore/EventStore.ts` robí `insert` aj dva `select`
na `event_store` (riadky 19, 33, 44). Tá tabuľka v PROD **nie je**.

Prečo to dnes nepadá — zmerané `grep`om, nie odhadom:

```
EventStore importuje:  apps/crm/src/domain/leads/services/LeadService.ts:2
LeadService importuje: (nič — jediný výskyt je jeho vlastná definícia na riadku 13)
```

`LeadService` **nikto nepoužíva**. Je to mŕtvy kód, a `EventStore` je mŕtvy
spolu s ním. Keby ho ktokoľvek zapojil — a je to trieda, ktorá sa na zapojenie
priam ponúka — prvý zápis by spadol na chýbajúcej tabuľke.

Prečo tabuľka chýba, hoci migráciu máme: `apps/crm/src/infra/db/migrations/002_event_store.sql`
leží v adresári, **kam `supabase db reset` nesiaha**. Toto už je zachytené pinom
`apps/crm/tests/verification/schema-gap-ratchet.verification.test.ts:340`
(„SQL mimo adresára migrácií sa nepočíta (poučenie z event_store)"), takže sa to
nemôže zopakovať nepozorovane — ale samotný rozpor tým nezmizol.

**Odporúčanie:** zmazať `LeadService` + `EventStore` + `002_event_store.sql`.
Je to ~3 súbory mŕtveho kódu, ktorý sa tvári ako infrastruktúra a jedného dňa
niekoho zvedie. Alternatíva (dotiahnuť migráciu do `supabase/migrations/`) znamená
zaviesť event sourcing, ktorý nikto nežiada — podľa Prime Directive to nekupuje
ďalšieho platiaceho klienta. **Zmazanie je samostatná stena, čaká na GO.**

## 2. NÁLEZ VYVRÁTENÝ — `outreach_messages` je fantóm

```
grep -rl "outreach_messages" . --exclude-dir=node_modules --exclude-dir=.git  →  0 súborov
to_regclass('public.outreach_messages')                                      →  null
```

**Nulový výskyt v celom repozitári a nulová existencia v PROD.** Nie je to
„chýbajúca tabuľka"; je to názov, ktorý nikdy neexistoval. Skutočná tabuľka na
odchádzajúce správy sa volá `outbound_messages`, v PROD **je** a odkazujú na ňu
2 súbory v `apps/`.

Toto je presne ten typ nálezu, ktorý by sa bez overenia dostal do backlogu ako
„migrácia chýba" a zjedol by hodinu práce na niečom, čo nikdy nebolo rozbité.

## 3. NÁLEZ UŽ OPRAVENÝ — navigačné oprávnenia nie sú fail-open

Nález tvrdil, že pri neznámom tíme sa vracia solo default, čiže `can_export_contacts: true`
nad zdieľanými kontaktmi. **To bolo opravené 2026-10-05**, commit `d03cc47`
(„FAIL-OPEN-SWEEP + TRIAL-GATE-CLOSED", #817).

Stav dnes, zmerané `grep`om:

- `UNKNOWN_TEAM_PERMISSIONS` existuje ako **samostatná** konštanta
  (`apps/crm/src/types/navigation.ts:90`), všetkých 7 práv `false`.
- Používa sa na 3 miestach v `AppSidebar.tsx` (počiatočný stav, `!r.ok`, `catch`)
  a na 4 miestach v `apps/crm/src/app/api/nav/permissions/route.ts`
  (bez usera, bez tímu, chyba dotazu, `catch`).
- Pin, ktorý zabraňuje návratu: `trial-gate-closed.test.ts:94`
  — `expect(UNKNOWN_TEAM_PERMISSIONS).not.toEqual(DEFAULT_TEAM_PERMISSIONS)`,
  plus kontrola, že každá hodnota je `false`.
- Komentár pri definícii cituje priamo `docs/reports/2026-10-05-fail-open-sweep.md`, nález P2.

**Žiadna akcia.** Zapisujem to preto, aby sa ten istý „bezpečnostný nález"
neobjavil tretí raz.

---

## 4. Čo si z vĺn A + B odnášam o metóde

Vlna A + B spolu: **87 agentov, 729,5 k tokenov, 1 h 56 min.** Môj odhad pred
spustením bol „2 orchestrátori + 4–6 workerov". To nebol nepresný odhad, to bol
rádový omyl a je môj.

Výnos po mojom overení: **1 reálny nález** (mŕtvy `event_store`/`LeadService`),
**1 fantóm**, **1 trinásť dní staré opravené**, a vo vlne A **1 vyvrátený kauzálny
príbeh** (retry-slučka) + **1 oprava môjho vlastného agregátu** (september sa
skrýval v „jún – dnes 38,1 %").

Poučenie, ktoré ide do pamäte: výstup swarmu je **hypotéza so smerom**, nie
zistenie. Lacnejšie je pustiť 1–2 workerov na zúženie priestoru a nosné tvrdenie
si premerať sám, než platiť 87 agentov za nálezy, ktoré aj tak musím overiť
jeden po druhom.
