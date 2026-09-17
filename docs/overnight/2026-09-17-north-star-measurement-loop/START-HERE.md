# REVOLIS — Ruflo Swarm Runner · NORTH-STAR MEASUREMENT LOOP
## Balík `2026-09-17-north-star-measurement-loop`

Pripravené 15. 9. 2026. Interný pracovný balík pre foundera a orchestrátora.

**Stav: `PREPARED`.** Spúšťa sa až po vyplnení `launch-record.md`.
**Rozsah: `measurement`** — nový rozsah. Nie `implementation`.

---

## 0. Prečo tento balík a nie ďalší kódový

Máš pripravený `2026-09-16-typecheck-paydown-loop`, ktorý čaká na podpis.
Pridať k nemu druhú slučku, ktorá tiež vyrába PR, by bolo presne to, pred čím
som celý čas varoval — a čo `MAX_OPEN_PRS = 3` v tom balíku má brzdiť.

**Tento balík preto nevyrába kód.** Jeho výstupom sú **merania**, nie PR.
Za celý beh vznikne **najviac jeden** malý docs-only PR. Preto môže bežať
súbežne s typecheck slučkou bez toho, aby jej bral merge kapacitu.

A rieši jedinú vec, ktorá po dvoch behoch zostala nedoriešená:

> V `.ai/bus/ledger/` je `production_effect` **null v každom riadku.**
> Ledger teda dnes meria kód, nie produkt.

---

## 1. Čo tento beh robí

```
W0  baseline, read-only prístup, mapa území
      ↓
W1  seed — JEDEN SQL súbor, ktorý founder schváli v PR
      ↓
LOOP ──→ vyber deň bez merania ──→ spusti SQL ──→ zapíš riadok ──→ atribúcia
  ↑                                                                   │
  └───────────────────────────────────────────────────────────────────┘
      ↓  (backfill dobehol / stop podmienka)
W2  týždenný digest + doplnenie production_effect + jeden PR
```

Výstup slučky: `.ai/bus/metrics/north-star-YYYY-MM.jsonl`, append-only,
jeden riadok na deň.

---

## 2. Prečo sa vlny nemôžu skrížiť

### 2.1 Územie = jeden deň

Iterácia vlastní **jeden dátum**. Dva dni sa nikdy neprekryjú, lebo kľúč je
dátum. Rovnaký princíp ako súbor v typecheck slučke, len iná os.

```
územie iterácie = { "date": "2026-09-03" }
```

### 2.2 Append-only, žiadny prepis

`north-star-YYYY-MM.jsonl` sa iba dopĺňa. Iterácia, ktorá nájde riadok so
svojím dátumom, ho **nechá tak** a označí sa `SKIPPED (already_measured)`.
Žiadne dva zápisy sa nikdy nebijú o ten istý riadok.

### 2.3 Žiadne vetvy počas slučky

Slučka **necommituje a nepushuje**. Píše do pracovného stromu a všetko sa
zbalí do jedného PR až vo W2. Preto počas behu neexistujú žiadne otvorené PR,
ktoré by mohli kolidovať — ani medzi sebou, ani s typecheck slučkou.

### 2.4 Kolízia s druhým balíkom — overená

| balík | píše do |
|---|---|
| `typecheck-paydown-loop` | `apps/crm/src/**`, `apps/crm/scripts/**`, `.ai/bus/tasks/**` |
| **tento** | `.ai/bus/metrics/**`, `.ai/bus/ledger/**` (len dopĺňa `production_effect`), `docs/reports/**`, `scripts/sql/**` |

Prienik: **prázdny.** Oba balíky môžu bežať naraz.

---

## 3. Bezpečnosť: slučka nesmie písať SQL

Toto je jediné miesto, kde by sa tento balík dal zneužiť.

**Pravidlo: agent SQL neautoruje, iba spúšťa.**

- **W1** vytvorí **jeden** súbor `scripts/sql/north-star-day.sql` s jediným
  parametrom `:den`. Ten súbor ide do PR a **founder ho prečíta**, skôr než
  slučka začne.
- Slučka ho potom už **iba spúšťa** s iným dátumom. Nesmie ho meniť, nesmie
  skladať SQL reťazec, nesmie spustiť nič iné.
- Pripojenie je **read-only rola**. `SUPABASE_READONLY_URL` v launch recorde.

```
ZAKÁZANÉ: INSERT, UPDATE, DELETE, DDL, akékoľvek dynamicky skladané SQL,
          akýkoľvek iný .sql súbor než north-star-day.sql
```

Ak `SUPABASE_READONLY_URL` chýba alebo rola nie je read-only → **`NOT_LAUNCHED`**.
Nepoužívaj service-role kľúč. Nikdy.

**Ak read-only rola neexistuje**, balík má náhradný režim: slučka vygeneruje
dávku dotazov do `control/queries-to-run.sql`, founder ju spustí raz a výsledok
uloží ako `control/results.json`. Slučka potom beží nad tým súborom.
Je to pomalšie, ale nevyžaduje žiadne nové credentials.

---

## 4. Čo sa meria — jeden riadok na deň

```json
{
  "date": "2026-09-03",
  "measured_at": "2026-09-17T08:00:00+02:00",
  "signal":       { "realvia_webhooks": 0, "portal_leads": 0 },
  "lead":         { "new": 0, "new_real": 0, "new_seed": 0, "total": 506 },
  "intent":       { "new": 0, "total": 3 },
  "qualification":{ "new_matches": 0, "total": 0 },
  "warming":      { "not_implemented": true },
  "outreach":     { "auto_responses_sent": 0 },
  "response":     { "activities": 0 },
  "appointment":  { "viewings": 0 },
  "mandate":      { "closed_won": 0 },
  "ops":          { "notifications_created": 3, "unread_at_eod": null },
  "merged_prs_that_day": ["#549", "#550"],
  "config_changes_that_day": [],
  "source": "scripts/sql/north-star-day.sql",
  "run_id": "RUN-..."
}
```

`lead.new` = všetky nové leady daný deň. **`new_real`** = `source LIKE 'portal:%'`.
**`new_seed`** = ostatné (vrátane `source IS NULL`). Bez tohto rozdelenia seed dataset
znečistí rast (founder GO 2026-09-15: z +28 leadov boli 24 seed / 4 real).

`merged_prs_that_day` je git atribúcia (`git log origin/main --merges …`).
**`config_changes_that_day`** je atribúcia mimo gitu — načítava sa z
`docs/ops/config-changelog.md` podľa dátumu (Vercel env a pod.). Bez changelogu
je jediná merateľná produkčná zmena v okne (FOUNDER_EMAILS → unread 165→1)
pre atribúciu neviditeľná.

---

## 5. Front práce — 30 dní backfillu, potom denne

**Backfill: 2026-08-17 → 2026-09-16 = 31 iterácií.**

Ukážka toho, čo backfill nájde (zmerané 15. 9. za posledných 14 dní):

| deň | nové leady | aktivity | zhody | intenty | Realvia webhooky |
|---|---:|---:|---:|---:|---:|
| 02.–10. 9. | 2 spolu | 1 | 0 | 0 | 0 |
| **11. 9.** | 0 | 0 | 0 | 0 | **9** |
| 12.–14. 9. | 0 | 0 | 0 | 0 | 0 |
| **15. 9.** | **2** | 0 | 0 | 0 | **2** |

Dve veci, ktoré z toho vidno už teraz a ktoré by inak nikto nezachytil:

1. **Realvia sa nevrátila „do prevádzky", ale dvakrát krátko ozvala.**
   9 webhookov 11. 9., 2 dnes, inak nula. To nie je obnovený tok, to sú dva výkyvy.
2. **Za 14 dní vznikli 4 leady a 1 aktivita.** Zhody a intenty nula.

Slučka toto nemá „zistiť" — má to zapísať do súboru, ktorý sa dá porovnať
o mesiac. To je ten rozdiel oproti tomu, že to raz za čas zmeriam ja.

---

## 6. Jedna iterácia

```
1. načítaj north-star-YYYY-MM.jsonl a zisti, ktoré dni už majú riadok
2. ak žiadny deň nechýba              → STOP, dôvod "backfill_complete"
3. ak rozpočet/čas vyčerpaný          → STOP
4. vyber najstarší chýbajúci deň
5. spusti scripts/sql/north-star-day.sql s :den  (read-only)
6. git log origin/main --merges --since <den> --until <den+1>  → merged_prs_that_day
7. načítaj docs/ops/config-changelog.md → config_changes_that_day (riadky s date = den)
8. zostav riadok (vrátane lead.new_real / lead.new_seed), APPEND do jsonl
9. ak je deň starší než 7 dní A existuje ledger riadok s merged_at v tom dni:
     doplň mu production_effect (odkaz na tento riadok merania)
10. ďalšia iterácia
```

**Stop podmienky:** `backfill_complete` · `budget` · `deadline` ·
`two_consecutive_failures` · `readonly_access_lost`.

**Žiadny commit, žiadny push, žiadny PR počas slučky.**

---

## 7. W2 — záver, jeden PR

1. `docs/reports/<dátum>-north-star-backfill.md` — tabuľka 31 dní,
   a explicitne **ktoré kroky loopu sú celé na nule**.
2. Doplnené `production_effect` v ledgeri — koľko riadkov sa podarilo spárovať
   a koľko zostalo `null` (a prečo).
3. **Jeden PR**, docs + metrics + `scripts/sql/north-star-day.sql`. Nič viac.

Judge naň pustíš rovnako ako inde:

```yaml
acceptance:
  - id: N1
    desc: "kazdy den ma prave jeden riadok"
    cmd: "node apps/crm/scripts/north-star-validate.mjs --ci"
    expect: exit_code == 0
  - id: N2
    desc: "typova chyba nepribudla"
    cmd: "node apps/crm/scripts/typecheck-baseline.mjs"
    expect: exit_code == 0
  - id: N3
    desc: "diff nevysiel zo scope"
    cmd: "git diff --name-only origin/main...HEAD"
    expect: all_paths_in(scope.repo_paths)
risk: low
```

`north-star-validate.mjs` vzniká vo W1 a kontroluje jedinú vec: **žiadny dátum
dvakrát, žiadny chýbajúci deň v rozsahu.** Bez neho by sa duplicita nezistila.

---

## 8. Zákazy

```
NIKDY INSERT / UPDATE / DELETE / DDL proti produkcii. Iba SELECT.
NIKDY service-role kľúč. Iba read-only rola z launch recordu.
NIKDY neskladaj SQL dynamicky. Jediný povolený súbor je north-star-day.sql,
      a ten sa počas slučky nemení.
NIKDY neprepisuj existujúci riadok v jsonl. Append-only.
NIKDY nemergi do main. Jeden PR vo W2, merge robí founder.
NIKDY nevymýšľaj číslo, ktoré nevrátil dotaz. Chýbajúca hodnota je null,
      nie odhad.
NIKDY sa nedotýkaj území typecheck slučky (apps/crm/src/**, apps/crm/scripts/**
      okrem north-star-validate.mjs, .ai/bus/tasks/**).

ZAKÁZANÉ CESTY:
  apps/crm/src/**
  apps/crm/supabase/migrations/**
  apps/crm/vercel.json
  apps/crm/next.config.js
  .ai/bus/tasks/**
  .env*
```

## 9. Scope

```
.ai/bus/metrics/**
.ai/bus/ledger/**                       (iba doplnenie production_effect)
scripts/sql/north-star-day.sql          (nový, vzniká vo W1)
apps/crm/scripts/north-star-validate.mjs (nový, vzniká vo W1)
docs/ops/config-changelog.md            (zdroj config_changes_that_day)
docs/reports/<dátum>-north-star-backfill.md
```

---

## 10. Čo tým získaš

Dnes vieš povedať: *„zmergovali sme 88 PR."*
Po tomto behu budeš vedieť povedať: *„zmergovali sme 88 PR a za tie isté dni
sa QUALIFICATION nepohol z nuly ani raz"* — **s riadkami, ktoré to dokazujú,
a s dátumom pri každom.**

A keď sa niektoré číslo konečne pohne, Ledger bude vedieť povedať, **po ktorom
merge** sa to stalo. To je celý rozdiel medzi ledgerom, ktorý meria kód, a
ledgerom, ktorý meria produkt — a je to podmienka, bez ktorej Cost Governor
nikdy nebude router.
