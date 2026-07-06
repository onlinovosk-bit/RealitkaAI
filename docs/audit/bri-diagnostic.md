# BRI / Lead Score — diagnostika (read-only)

> Dátum: 2026-06-19 · Smolko agency · 439 leadov `realvia_import_smolko` · **bez zmeny BRI kódu**

## 1. Dva skóre v systéme

| Metrika | Kde sa počíta | Zobrazuje sa ako |
|---------|---------------|------------------|
| **`leads.score`** | `calculateLeadAiScore()` — `apps/crm/src/lib/ai-scoring.ts` | Tabuľka / AI skóre |
| **BRI total** | `computeBuyerReadiness()` — `apps/crm/src/domain/buyer-readiness/engine.ts` | Playbook, call-script, BRI widget |

UI môže ukázať **„—“ / Nekvalifikované** (`score-display.ts`) keď `score=0` a chýba kontakt — nie nutne „50“.

## 2. BRI engine — polia, ktoré **reálne vstupujú do výpočtu**

| Vstup | Zdroj | Váha |
|-------|-------|------|
| `activities[].type` | tabuľka `activities` (`Obhliadka`, `Telefonát`, `Email`, …) | Intent **0–40** |
| `status` | `leads.status` | Fit **0–30** (Ponuka=30 … Nový=5) |
| `score` | `leads.score` | Fit **+0–12** (`score/100 × 12`) |
| `lastContactAt` | `last_contact_at` v kóde / `last_contact` v schéme | Timing **0–30** |
| `createdAt` | `leads.created_at` | penalizácia ak >60 dní bez aktivít |

`budget`, `property_type`, `rooms` sú v `BriLeadContext` type, ale **engine ich v matematike nepoužíva**.

## 3. `leads.score` — polia pre AI skóre (kŕmi BRI fit)

`calculateLeadAiScore()` používa:

- **`budget`**, **`financing`**, **`timeline`**, **`status`**
- **`note`** (>20 znakov), **`source`** (web)
- **`lead_property_matches`**, **`messages`**, **`tasks`**, **`recommendations`**

## 4. PROD fakt — prečo 439 leadov „spí“

Realvia import vzorka:

```
score=0, budget="", financing="", timeline="", last_contact=""
status="Nový", source="realvia_import_smolko"
```

Typický BRI pre taký lead: Intent≈0, Fit≈5, Timing≈2 → **~7/100**.

## 5. Minimálny set na oživenie (priorita)

| # | Pole / akcia | Efekt |
|---|--------------|-------|
| 1 | **`budget`** | +6–10 na `leads.score` |
| 2 | **`timeline`** | +6–14 |
| 3 | **`financing`** | +4–10 |
| 4 | **`last_contact`** (reálny dátum) + **`activities`** (Telefonát/Email) | Timing + Intent |

Potom **rescore/backfill** (`rescore-lead.ts`, `scripts/backfill-tenant-scoring.ts`) — score sa sám neprepočíta.

## 6. Známy bug (Playbook timing)

`generateDailyPlaybook.ts` selectuje **`last_contact_at`**, schéma má **`last_contact`** (text). → BRI timing v Playbooki môže byť vždy prázdny. Fix: PR **B3** `fix/playbook-last-contact-column`.

## 7. Záver

**BRI nie je pokazené** — čaká na kvalifikačné dáta a aktivity. Realvia import dodal meno/email, nie buying intent signály.
