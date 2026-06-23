# BUILD BRIEF — Smolko Dopyty CSV → CRM import mapper (1 PR)

> **Stav:** **VALIDATE CLOSED (2026-06-21)** — Klienti export = duplikát + maklér; Dopyty neexportovateľné. **Nespúšťať.** Detail: `memory/decisions.md`
> ~~BLOCKED na CSV od klienta~~ · Pôvodne: dorazí export z Realsoft admin (Klienti/Dopyty)  
> **Roadmap:** `docs/briefs/overnight/wave3-lead-discovery-roadmap.md` TOP #1  
> **Ústava:** Q1 áno (RK platí za CRM s dopytmi) · Q8 = správny čas **až s CSV** → potom BUILD

---

## ⛔ FÁZA 0 — HARD GATE (pred kódom)

Agent **NEZAČÍNA**, kým founder nedodá:

1. **Súbor CSV** (alebo redigovaná kópia: hlavička + 2 riadky, bez PII v repe).
2. **Screenshot cesty exportu** v Realsoft/Nehnuteľnosti admin (Klienti → Dopyty → Export).
3. **Potvrdenie rozsahu:** koľko riadkov (~439?) a či ide o dopyty k inzerátom Smolka.

Write-probe na vetve `test/write-probe` ak nová session (L99 štandard).

**Ak CSV chýba → ZASTAV.** Nepíš mapper „na odhad stĺpcov“.

---

## ROZSAH (1 PR = 1 logická zmena)

### STAVAŤ

| Modul | Cesta |
|-------|--------|
| CSV parser + normalizácia | `apps/crm/src/lib/import/smolko-dopyty/parse.ts` |
| Mapovanie CSV → `leads` row | `apps/crm/src/lib/import/smolko-dopyty/map-row.ts` |
| Orchestrátor (dry-run + apply) | `apps/crm/src/lib/import/smolko-dopyty/import-dopyty.ts` |
| API (auth + agency scope) | `apps/crm/src/app/api/import/smolko-dopyty/route.ts` |
| Fixture z reálnej hlavičky | `apps/crm/src/lib/import/smolko-dopyty/__fixtures__/sample-header.csv` |
| Unit testy | `apps/crm/src/lib/import/smolko-dopyty/__tests__/*.test.ts` |
| Ops smoke (PowerShell) | `apps/crm/docs/ops/smoke-smolko-dopyty-import.ps1` |

### NESTAVAŤ (iné PR / backlog)

- Meta/Google lead ads, attribution, dedup ML
- Hromadný OpenAI rescore 439 leadov v tom istom PR
- Scraping portálu, UC API pre klientov (neexistuje)
- Zmena BRI engine matematiky
- PROD import bez founder GO (Preview/staging first)

---

## PRAVNÝ / DÁTOVÝ ZÁKLAD

| Brána | Splnenie |
|-------|----------|
| GDPR 6(1)(b) | Dopyty = zmluvný vzťah RK ↔ záujemca cez portál |
| Pôvod | Oficiálny export, ktorý **vlastní klient** (Smolko) |
| ToS | Export z admina, nie scraping |
| Provenance | `source` = `realsoft_dopyty_csv` (+ ponechať pôvodný ak merge) |
| Audit | Log: imported / updated / skipped / errors + sample external_id |

Pred merge: 1-vetný záznam v PR (právny základ = zmluva RK + export vlastníka dát).

---

## MAPOVANIE (TBD — doplniť po doručení CSV)

Agent **nepredpokladá** stĺpce. Po CSV vytvorí tabuľku v PR popise:

| CSV stĺpec (skutočný názov) | → `leads` pole | Poznámka |
|----------------------------|----------------|----------|
| _TBD_ | `name` | povinné |
| _TBD_ | `email` | dedup kľúč |
| _TBD_ | `phone` | |
| _TBD_ | `budget` | normalizovať na text/číslo ako dnes v CRM |
| _TBD_ | `property_type` | |
| _TBD_ | `rooms` | |
| _TBD_ | `location` | |
| _TBD_ | `timeline` | kŕmi `calculateLeadAiScore` |
| _TBD_ | `financing` | kŕmi AI score |
| _TBD_ | `status` | mapovať na existujúce SK statusy alebo „Nový“ |
| _TBD_ | `note` | voliteľné polia → concat do note |
| _TBD_ | `import_meta.dopyt_id` | JSONB `import_meta` alebo note prefix — **len ak stĺpec existuje** |

**Hypotéza (overiť proti CSV):** Realsoft export môže obsahovať ID dopytu, ID inzerátu, dátum dopytu, makléra — zaznamenať do `note` / `import_meta`, nevymýšľať.

---

## REŽIM IMPORTU — ENRICHMENT, NIE DUplicita

439 leadov už existuje (`source=realvia_import_smolko`, identity only).

```
Pre každý CSV riadok:
  1. Match: email (case-insensitive), fallback phone ak email prázdny
  2. Ak match → UPDATE len prázdne polia (budget, timeline, financing, property_type, rooms, location, note)
     — AP-001: neprepísať neprázdne hodnoty bez explicitného flagu `overwrite=true` (default false)
  3. Ak no match → INSERT nový lead, source=realsoft_dopyty_csv
  4. Nikdy nevymýšľať budget/timeline — prázdne ostáva prázdne
```

Po UPDATE aspoň 1 kvalifikačné pole → voliteľne zavolať `rescoreLead(id)` **pre ten riadok** (nie batch v tomto PR).

---

## API KONTRAKT

`POST /api/import/smolko-dopyty`

```json
{
  "dryRun": true,
  "csvText": "…",
  "overwrite": false
}
```

Response:

```json
{
  "ok": true,
  "dryRun": true,
  "stats": { "scanned": 0, "matched": 0, "updated": 0, "inserted": 0, "skipped": 0, "errors": [] },
  "preview": [{ "email": "…", "action": "update", "fields": ["budget", "timeline"] }]
}
```

- Auth: authenticated user + `agency_id` z profile (RLS)
- Rate limit: rovnaký pattern ako `POST /api/import`
- Max riadkov: 500 (ako existujúci import)

---

## TESTY (POVINNÉ)

1. **Parser:** reálna hlavička z CSV fixture (redigovaná).
2. **Mapper:** 2 riadky → očakávané `leads` polia.
3. **Enrichment:** existujúci lead s prázdnym budget → UPDATE doplní budget z CSV.
4. **AP-001 guard:** lead s budget="" v CSV neprepíše existujúci budget v DB.
5. **Dedup:** rovnaký email → 1 update, nie 2 inserty.

`npm run test -- --run src/lib/import/smolko-dopyty`

---

## OPS — SMOKE (Preview, nie PROD first)

`apps/crm/docs/ops/smoke-smolko-dopyty-import.ps1`:

1. `dryRun=true` s lokálnym CSV
2. Over `stats.matched` > 0 proti známym emailom (ak staging má Smolko dáta)
3. **PROD import:** len po founder GO + `dryRun=false` + backup/export count pred importom

---

## PR CHECKLIST

- [ ] CSV fixture v repe (redigovaná, žiadne live PII)
- [ ] Mapovacia tabuľka stĺpcov v PR popise (skutočné názvy)
- [ ] CI zelené
- [ ] Kontrolór PASS (AP-001, GDPR, no scraping)
- [ ] Preview: dry-run + 1 riadok apply na staging
- [ ] Vercel Preview smoke

**Vetva:** `feat/smolko-dopyty-csv-import`  
**Commit:** `feat(crm): Smolko Dopyty CSV import mapper with enrichment merge`

---

## PO MERGE (founder, nie agent v noci)

1. PROD: export count leads pred importom (SELECT count WHERE agency_id=Smolko).
2. Preview/staging full dry-run.
3. PROD `dryRun=false` s GO.
4. SELECT sample 10 leadov — budget/timeline/financing vyplnené kde CSV malo dáta.
5. Playbook smoke: aspoň 1 lead s BRI ≥70 ak CSV obsahuje aktivity/status (voliteľné).

---

## ZHRNUTIE PRE AGENTA

| Položka | Hodnota |
|---------|---------|
| Trigger | CSV od Smolka dorazilo + Fáza 0 OK |
| Výstup | 1 PR, mapper + API + testy + ops script |
| Kľúčová logika | Enrich 439 existujúcich cez email match, no overwrite |
| Blokátor teraz | **Čaká na CSV** |

**HOTOVO =** git hash + CI + tabuľka stats z dry-run na reálnom CSV. Nie text bez commitu.
