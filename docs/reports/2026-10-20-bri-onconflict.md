# BRI: obe skórovacie funkcie padali na constraint, ktorý neexistuje

**Dátum:** 2026-10-20 · **PROD:** `ypgajkhqtbriqqmyawyv` · **Zápis do PROD:** nie. Migrácia je pripravená a **čaká na GO**.

## 1. Chyba

`compute_bri_score` aj `compute_bri_score_v2` upsertujú do `public.lead_scores` s `ON CONFLICT (profile_id, lead_id)`. Taký constraint na tabuľke **nie je**:

```sql
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid='public.lead_scores'::regclass;
```

| constraint | definícia |
|---|---|
| `lead_scores_pkey` | `PRIMARY KEY (id)` |
| `lead_scores_lead_id_key` | **`UNIQUE (lead_id)`** |
| `lead_scores_lead_id_fkey` | `FOREIGN KEY (lead_id) → leads(id)` |
| `lead_scores_agency_id_fkey` | `FOREIGN KEY (agency_id) → agencies(id)` |

Preto obe funkcie padajú pri každom volaní:

```
rpc compute_bri_score: there is no unique or exclusion constraint
matching the ON CONFLICT specification
```

**Zmerané:** cron `recompute-bri` má za 14 dní 3 z 3 pokusov `failed` s touto hláškou; `lead_scores` má **0 riadkov**. Žiadne BRI skóre teda nikdy nevzniklo.

## 2. Ako to vzniklo

Tabuľku zakladajú **dve** migrácie, obe `CREATE TABLE IF NOT EXISTS`:

| migrácia | kľúč | čo sa stalo |
|---|---|---|
| `20260418_enterprise_ai_intelligence.sql` | `UNIQUE (lead_id)` | **vyhrala** — bola prvá |
| `20260425231407_event_pipeline.sql` | `UNIQUE (profile_id, lead_id)` | tabuľka už existovala → prešli len jej `ADD COLUMN` |

Odtiaľ je aj `profile_id` nullable: pridal ho `ADD COLUMN` bez `NOT NULL`. Composite kľúč, na ktorý sa funkcia spolieha, **nebol nikdy založený**.

## 3. Prečo sa constraint nepridáva ani nemení

Na tabuľke sedia **traja zapisovatelia s dvoma nezlučiteľnými kľúčmi**:

| zapisovateľ | kľúč | cesta |
|---|---|---|
| `compute_bri_score` | `(profile_id, lead_id)` | cron `recompute-bri`, `/api/events` |
| `compute_bri_score_v2` | `(profile_id, lead_id)` | `/api/leads/bri-recompute`, `inbound/process-lead` |
| `enterprise-intelligence-store.ts` | **`lead_id`** (`onConflict: "lead_id"`) | `/api/ai/process-lead` |

- Pridať composite a nechať aj `UNIQUE (lead_id)` → druhý profil skórujúci ten istý lead porušil `UNIQUE (lead_id)`.
- Zahodiť `UNIQUE (lead_id)` → rozbije sa tretí zapisovateľ.

**Oba smery vymenia jednu rozbitú cestu za inú.**

## 4. Oprava: cieliť na kľúč, ktorý existuje

`ON CONFLICT (profile_id, lead_id)` → `ON CONFLICT (lead_id)`, plus `profile_id = EXCLUDED.profile_id` v `DO UPDATE`.

Je to aj **správny kľúč podľa dátového modelu**: `leads.assigned_profile_id` priraďuje lead práve jednému profilu a `batchRecomputeBRI(profileId)` skóruje len leady toho profilu (`.eq('assigned_profile_id', profileId)`). Na jeden lead teda patrí jeden riadok skóre.

Prepis `profile_id` rieši jediný zostávajúci prípad: po prepise leadu na iného makléra ide riadok za novým vlastníkom namiesto toho, aby zhodil zápis na `UNIQUE (lead_id)`.

Žiadny `ALTER TABLE`, žiadny `DROP` — tretí zapisovateľ ostáva nedotknutý.

## 5. Prečo migrácia patchuje a neprepisuje

V PROD je aplikovaných **78 zo 138** migrácií (zmerané 2026-10-19). Živé telo funkcie sa teda môže líšiť od ktoréhokoľvek súboru v repe a prepísanie kópiou by potichu vrátilo späť zmeny, o ktorých nevieme.

Migrácia preto berie `pg_get_functiondef`, vymení jeden podreťazec a funkciu znovu vytvorí. Keď podreťazec nenájde, `RAISE EXCEPTION`. Celé v `BEGIN/COMMIT`, s overením na konci, že ani jedna funkcia už necieli na neexistujúci kľúč.

## 6. Dôkaz (read-only dry run proti PROD)

Tá istá dvojica `replace()` spustená ako `SELECT`, bez zápisu:

| funkcia | pred | po | stále zlý cieľ | správny cieľ | prepisuje vlastníka | počet `DO UPDATE SET` |
|---|---|---|---|---|---|---|
| `compute_bri_score` | 3 133 | 3 165 | **nie** | áno | áno | **1** |
| `compute_bri_score_v2` | 9 383 | 9 415 | **nie** | áno | áno | **1** |

Zhodný prírastok +32 znakov v oboch a práve jeden `DO UPDATE SET` v každej sú dôkaz, že druhý `replace` nemal čo iné zasiahnuť (`v2` má ešte `ON CONFLICT DO NOTHING` pre `bri_config` a `INSERT` do `bri_score_history` — ani jeden `DO UPDATE SET` neobsahuje).

Repozitárové piny: 6 testov v `bri-onconflict.verification.test.ts`. Strážny regex overený oproti skutočným historickým previnilcom — chytí `20260425231407` aj `20260425231426`, a neoznačí túto opravu.

## 7. Čo zostáva NEZMERANÉ

Správanie migrácie po aplikovaní. Lokálna Supabase s Dockerom tu nie je, takže `prepush-gate.sh` hlási migrácie ako NEOVERENÉ. Dovtedy platí len textový dôkaz vyššie.

A ešte raz na rovinu: **oprava odstráni pád, neprinesie skóre.** `public.events` má 1 riadok, takže BRI by aj po oprave priradilo takmer všetkým leadom rovnakú hodnotu. Hodnotu to prinesie až vtedy, keď do `events` začne niečo tiecť.
