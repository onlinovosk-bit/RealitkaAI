# Leads Score Audit — Reality Smolko

**Dátum:** 2026-06-05  
**Agency ID:** `11111111-1111-1111-1111-111111111111`  
**Metóda:** Readonly SELECT cez `SUPABASE_SERVICE_ROLE_KEY` (žiadne UPDATE/DELETE)  
**Zdroj:** `scripts/audit-smolko-leads.mjs` (jednorazový audit skript, nie commitnutý)

---

## Súhrn

| Metrika | Hodnota |
|---------|---------|
| **Celkový počet leadov** | 439 |
| **Leady so `score` (NOT NULL)** | 439 (100 %) |
| **`bri_score` na `leads`** | Stĺpec **neexistuje** v prod schéme (BRI je v `lead_scores` / RPC) |
| **Leady s `ai_priority`** | 439 (100 %) — všetky **„Nízka“** |
| **Priemerné `score` (DB)** | 0 |
| **Min / Max `score` (DB)** | 0 / 0 |
| **`score = 22` v DB** | **0** (0 %) |
| **Zobrazené skóre 22/100 v UI** | **439** (100 %) — cez display mapovanie |

---

## Kľúčový záver: „22/100“ nie je vypočítané skóre

V databáze majú všetky importované kontakty **`score = 0`**. Číslo **22** v UI pochádza z **display vrstvy**, nie z scoring enginu:

```5:9:apps/crm/src/lib/leads/lead-display-score.ts
export function aiPriorityToDisplayScore(priority: string | null | undefined): number | null {
  if (priority === "Vysoká") return 85;
  if (priority === "Stredná") return 55;
  if (priority === "Nízka") return 22;
  return null;
}
```

Po importe cron **lead-ai-triage** nastavil všetkým `ai_priority = 'Nízka'` s dôvodom:

> *„Import alebo lead bez kontextu (skóre 0, bez kontaktu) — nízka priorita, kým nedoplníš údaje.“*

`getLeadDisplayScore()` potom mapuje „Nízka“ → **22** pre zobrazenie BRI ringu — **nie reálny buyer intent**.

| Vrstva | Hodnota | Význam |
|--------|---------|--------|
| DB `score` | 0 | Žiadny vypočítaný scoring |
| DB `ai_priority` | Nízka | W1 triáž po importe |
| UI display | 22 | Placeholder z `aiPriorityToDisplayScore` |

---

## Distribúcia `score` (DB)

| `score` | Počet | % |
|---------|-------|---|
| 0 | 439 | 100 % |
| 22 | 0 | 0 % |

---

## Prázdne / chýbajúce stĺpce

| Stĺpec | Prázdne / NULL | % | Poznámka |
|--------|----------------|---|----------|
| `budget` | 439 | 100 % | Import bez kvalifikačných údajov |
| `buyer_readiness_score` | 439 | 100 % | Žiadny onboarding flow |
| `bri_score` (na `leads`) | N/A | — | Stĺpec v prod tabuľke neexistuje |
| `segment` | N/A | — | Stĺpec v prod tabuľke neexistuje |
| `readiness_band` | N/A | — | Stĺpec v prod tabuľke neexistuje |
| `ai_priority` | 0 | 0 % | Všetky nastavené na „Nízka“ |

---

## Odporúčania (bez zmeny DB)

1. **UI:** Pre sparse/import leady zobraziť **„—"** alebo **„N/A"** namiesto **22/100**, aby broker neinterpretoval placeholder ako reálny intent.
2. **Copy:** Tooltip pri 22: *„Odhad z AI triáže (import bez údajov), nie vypočítané BRI.“*
3. **Dáta:** Po doplnení budget/timeline/kontaktu spustiť `POST /api/scoring/recalculate` (nie legacy `/api/scoring` — 410).
4. **Monitoring:** Sledovať podiel leadov s `score > 0` alebo `buyer_readiness_score IS NOT NULL` po kvalifikácii.

---

## SQL (referenčný dotaz)

```sql
SELECT 
  COUNT(*) AS total,
  COUNT(score) AS has_score,
  COUNT(ai_priority) AS has_ai_priority,
  AVG(score) AS avg_score,
  MIN(score) AS min_score,
  MAX(score) AS max_score,
  COUNT(CASE WHEN score = 22 THEN 1 END) AS default_22_count
FROM leads 
WHERE agency_id = '11111111-1111-1111-1111-111111111111';
```

Poznámka: `COUNT(bri_score)` zlyhá — stĺpec nie je na `public.leads`; BRI je v `lead_scores` / `compute_bri_score` RPC.

---

## Riziká

- **Falošná presnosť:** 22/100 vyzerá ako metrika, ale je konštanta z priority mapy.
- **Horúci lead filter:** `isSparseQualificationLead()` správne blokuje „horúci“ badge pre tieto leady — overiť po UI zmene display skóre.
- **Žiadna zmena produkčných dát** v tomto audite.
