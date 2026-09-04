# TASK: REALVIA ČÍSELNÍK — správne mapovanie + backfill

**Pre:** Cursor agent
**Repo:** `onlinovosk-bit/RealitkaAI` · main @ `e574cbe`
**Branch:** `fix/realvia-ciselnik-mapping`
**PR:** `fix(realvia): official číselník mapping, Dopyt transaction, rooms fallback`
**Merge:** NIKDY agentom. PR, merguje founder.
**Backfill:** spúšťa founder ručne, NIE agent. Viď sekcia 5.

---

## 0. Zdroj pravdy

Realvia poslala 4.9.2026 odkaz na verejnú dokumentáciu:
`https://dev.realvia.sk/doc/export/index.php#ciselniky`

Nižšie uvedené hodnoty sú z nej. **Nič nedopĺňaj z hlavy.** Kód, ktorý v tabuľke
nie je, ostáva `Neznáme` — to pravidlo z PR #520 platí ďalej.

---

## 1. Prečo — stav produkcie 2026-09-04

Prehnal som `payload_raw` cez nové mapovanie (read-only):

```
132 nehnuteľností s payloadom
├─ typ sa zmení            102  (77 %)
├─ transakcia sa zmení      64  (48 %)
└─ nezmení sa nič            4  (3 %)
```

Najväčšie skupiny:

| dnes | správne | ks |
|---|---|---:|
| Ostatné / Predaj | **Pozemok** / Predaj | 46 |
| Byt / Predaj | Byt / **Prenájom** | 21 |
| Ostatné / Predaj | **Komerčná** / **Prenájom** | 18 |
| Ostatné / Predaj | **Dom** / Predaj | 10 |
| **Dom** / Predaj | **Byt** / **Prenájom** | 9 |
| Byt / Predaj | Byt / **Dopyt** | 5 |

---

## 2. T1 — `lib/realvia/map-taxonomy.ts`

### Kategórie (nahradzujú celý `categoryMap`)

```
 9  Byt              štúdiový apartmán
11  Byt              1-izbový byt
12  Byt              2-izbový byt
13  Byt              3-izbový byt
14  Byt              4-izbový byt
20  Dom              rodinný dom
27  Chata            chata
28  Záhradný domček  záhradný domček
30  Pozemok          pozemok pre rodinný dom
34  Pozemok          komerčná zóna
35  Pozemok          priemyselná zóna
37  Pozemok          záhrada
41  Pozemok          orná pôda
46  Komerčná         kancelárske priestory
47  Komerčná         obchodné priestory
48  Komerčná         reštauračné priestory
57  Komerčná         kancelárska budova
60  Komerčná         polyfunkčná budova
61  Komerčná         sklad
65  Komerčná         hotel, penzión
```

**Kódy 15, 16, 17, 18, 19 z pôvodnej mapy ZMAŽ.** V číselníku ani v dátach
neexistujú — boli to odhady.

`Chata` a `Záhradný domček` sú **samostatné typy**, nie „Dom". Rozhodnutie foundera:
kupujúci, ktorý hľadá dom, nechce chatu. Zoskupenie pre používateľa rieši T3.

### Transakcie (nahradzujú celý `transactionMap`)

```
122  Dopyt      kúpa      ← inzerát HĽADÁ nehnuteľnosť, nie je to ponuka
123  Prenájom   hireout
124  Podnájom   podnájom
125  Výmena     výmena
127  Predaj     predaj
```

**Dve živé chyby na oprav:** dnešný kód má `124 → "Prenájom"` (má byť `Podnájom`)
a `125 → "Dražba"` (má byť `Výmena` — „dražba" sme si vymysleli, v číselníku nie je).

### Nové exporty

```ts
export const REALVIA_TRANSACTION_DEMAND = "Dopyt";
export function isDemandTransaction(value: string | null | undefined): boolean
export function roomsFromCategory(category: number): string | null
```

`roomsFromCategory`: `9 → "garsónka"`, `11 → "1 izba"`, `12 → "2 izby"`,
`13 → "3 izby"`, `14 → "4 izby"`, všetko ostatné `null`.

`REALVIA_MAPPING_UNKNOWN` a `isRealviaMappingUnknown` **nechaj tak, ako sú.**

---

## 3. T2 — `lib/realvia/processQueue.ts`

Riadok ~246 dnes vyplní `rooms` len keď príde `advert.rooms_count`:

```ts
rooms: advert.rooms_count ? `${advert.rooms_count} izby` : '',
```

Doplň fallback na `roomsFromCategory(advert.category)`, keď `rooms_count` chýba.
**Poradie: `rooms_count` má prednosť.** Ak nie je ani jedno, ostáva `''`.

**Rozsah dopadu (overené):** z 49 bytov chýba `rooms_count` pri **16**. Fallback
doplní tých 16, nie všetkých 49 — nepíš do PR väčšie číslo.

Existujúci `rooms_count` stĺpec nemeň.

---

## 4. T3 — Dopyty von z ponuky

Jedenásť záznamov má `transaction = 122`. Sú to inzeráty, ktorými kancelária
**hľadá** nehnuteľnosti pre klientov:

```
"Hľadám 2-3 izbový byt v Prešove."
"HĽADÁME 1- a 2-IZBOVÝ BYT NA KÚPU v PREŠOVE"
"Ponúknite rodinný dom v PREŠOVE a bližšom okolí"
```

Sedem z nich má cenu 0. **Sprievodca ich dnes ukazuje ako dostupné nehnuteľnosti.**

### Čo urob

V `lib/public-listings-partition.ts` (z PR #523) rozšír `partitionPublicListings`
tak, aby vracalo **tretiu skupinu**:

```ts
{ matched, unknown, demand }
```

Dopyt sa pozná cez `isDemandTransaction(p.transactionType)` a **nesmie** spadnúť
ani do `matched`, ani do `unknown`. Vlastnú kontrolu reťazca nepíš — použi tú funkciu.

V `(public)/nehnutelnosti/page.tsx` skupinu `demand` **nevykresľuj vôbec.**
Verejná stránka `/hladame` je samostatná úloha, nie táto.

### Zoskupenie typov vo filtri

Wizard má štyri voľby (`flat`, `house`, `land`, `commercial`). Pribudli dva typy,
ktoré do nich nepatria. Pridaj piatu voľbu **„Chata a rekreačné"**, ktorá filtruje
`type IN ('Chata', 'Záhradný domček')`.

To znamená, že filter typu prestáva byť rovnosť. Uprav `partitionPublicListings`
tak, aby `typeFilter` prijal jednu hodnotu **alebo pole hodnôt**. Databáza si drží
presný typ, používateľ dostane jednu zrozumiteľnú voľbu.

---

## 5. T4 — Backfill skript (agent NESPÚŠŤA)

**Súbor:** `scripts/backfill-realvia-taxonomy.ts`

Prečíta `properties` s neprázdnym `payload_raw->'advert'`, aplikuje **ten istý
mapper** z T1 (import, nie kópia logiky) a porovná s aktuálnymi hodnotami.

### Povinné správanie

- **`--dry-run` je predvolené.** Zápis len pri explicitnom `--apply`.
- Dry-run vypíše presne túto tabuľku: `teraz_typ | novy_typ | teraz_txn | novy_txn | počet`
  plus súhrn „zmení sa X zo 132".
- Zápis mení **výhradne** `type`, `transaction_type` a `rooms` (len keď je dnes prázdny).
  Nič iné. Žiadne `status`, `price`, `title`.
- Scope vždy `agency_id` — skript berie `--agency-id` ako povinný parameter
  a fail-closed, keď chýba. (Dôvod: incident z 3.9.2026,
  `docs/reports/2026-09-03-realvia-cross-tenant-source-id.md`.)
- Pred zápisom vypíše počet dotknutých riadkov a vyžiada potvrdenie z stdin.
- Loguje každú zmenu ako `id | pole | z | na` do
  `docs/reports/2026-09-04-backfill-realvia-taxonomy.md`.

### ZAKÁZANÉ
- agent skript **nespúšťa** ani v dry-run režime proti produkcii
- žiadne `db push`, žiadne DDL, žiadna nová tabuľka ani stĺpec
- žiadne odvodzovanie typu z názvu inzerátu (AP-005)
- nedotýkať sa `credit_ledger`, `leads`, `buyer_intents`

---

## 6. Akceptačné kritériá

- [ ] Unit test: všetkých 20 kategórií z číselníka → očakávaný typ
- [ ] Unit test: kódy 15–19 vracajú `Neznáme` (už nie sú v mape)
- [ ] Unit test: všetkých 5 transakcií, vrátane `125 → Výmena` a `124 → Podnájom`
- [ ] Unit test: neznámy kód nikdy nevráti `Ostatné`, `Predaj` ani `Dopyt`
- [ ] Unit test: `roomsFromCategory` pre 9/11/12/13/14, `null` pre zvyšok
- [ ] Test `partitionPublicListings`: dopyt nie je v `matched` ani v `unknown`
- [ ] Test: `typeFilter` ako pole vráti Chatu aj Záhradný domček
- [ ] `(public)/nehnutelnosti` nevykresľuje ani jeden dopyt
- [ ] Backfill skript v dry-run vypíše tabuľku a **nič nezapíše**
- [ ] `pnpm test` + `pnpm build` zelené

---

## 7. Do PR popisu napíš

```
Zdroj mapovania: https://dev.realvia.sk/doc/export/index.php#ciselniky
Dry-run backfillu NEBOL spustený agentom (spúšťa founder).

Očakávaný dopad podľa analýzy foundera zo 4.9.2026:
  typ sa zmení       102 / 132
  transakcia         64 / 132
  bez zmeny          4 / 132
  rooms fallback     16 bytov

Opravené živé chyby: 124 Prenájom→Podnájom, 125 Dražba→Výmena.
```

---

## 8. Čo NEROBIŤ v tomto PR

```
verejná stránka /hladame
prevod dopytov na leady + buyer_intents pre matching
spustenie párovania (recalculateAllMatches)
pridanie /api/cron/daily-match do vercel.json
akékoľvek zmeny v Sprievodcovi nad rámec filtra typov
```

Všetko sú to samostatné úlohy a idú **až po** tom, čo bude backfill hotový
a dáta pravdivé.
