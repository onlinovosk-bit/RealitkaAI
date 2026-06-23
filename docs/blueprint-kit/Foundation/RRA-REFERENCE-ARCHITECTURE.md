# RRA — Reference Architecture (Blueprint Kit artefakt #5, Foundation pack)
> Prešiel Blueprint Standard v1 (12 častí). Extrahovaný z produkčného Revolis CRM.
> Cesta: `docs/blueprint-kit/Foundation/RRA-REFERENCE-ARCHITECTURE.md`

## ČO JE RRA
Jedna strana + diagram vrstiev: **pevný stack a hranice zodpovednosti**, nie vízia.
Founder a agent vedia, kde patrí UI, kde dáta, kde integrácie, kde cron — bez
vymýšľania „Genome" alebo paralelných systémov.

---

## 1. PROBLÉM
Early-stage SaaS bez RRA skĺzne k chaotickému monolitu: auth v komponente, SQL v
route, cron bez tenant izolácie, „dočasný" webhook handler, ktorý nikdy nezmizne.
Každá feature pridáva vrstvu náhodne. Refaktor stojí týždne.

## 2. SCAR (jazva)
Revolis: viac integrácií (Realvia webhooks, Supabase RLS, capabilities demo) bez
jedného listu vrstiev → opakované otázky „kde to patrí?", duplicitné mapovanie
property row, Guardian FLAG z nesúladu text vs. štruktúrované polia (#235), PROD
write bez brány (A3 cleanup). Pattern: **kód existuje, hranice nie**.

## 3. COST OF SCAR
Opakované nočné swarmy na už hotové veci; flaky testy (AP-013); merge ≠ verified
zmätok; hodiny debugu area mismatch, ktorý bol dátový typ (167 zastavaná vs 120 úžitková),
nie HTML bug.

## 4. DECISION
RRA = 5 vrstiev + 3 pravidlá toku dát. Každá nová feature sa zaradí do vrstvy
**pred** kódom. Žiadna nová vrstva bez ADR alebo úpravy RRA.

## 5. PREČO (trade-off)
Obetuješ „cool" microservices a event bus na začiatku. Získaš: jeden deploy,
jeden tenant model, reprodukovateľný smoke. Alternatíva (k8s + message queue pri
1 zákazníkovi) = AP-012.

## 6. PRECONDITIONS
- **Používaj ak:** B2B SaaS, 1–50 tenantov, 1–3 integrácie, malý tím, Vercel-class deploy.
- **NEpoužívaj ak:** multi-region compliance banka, offline-first mobile core, alebo
  tím >30 bez platform eng — potrebuješ formálnejší C4/arc42 proces.

## 7. REFERENCE STACK (Revolis — overené v produkcii)

```
┌─────────────────────────────────────────────────────────┐
│ L5  Experience   Next.js App Router (dashboard, demo UI) │
├─────────────────────────────────────────────────────────┤
│ L4  Capabilities  lib/capabilities/* (pure, testable)    │
│     listing-score, guardian, vertical-pack-demo, …       │
├─────────────────────────────────────────────────────────┤
│ L3  API / Jobs    app/api/*, cron routes, webhooks      │
│     tenant scope, service role len kde musí             │
├─────────────────────────────────────────────────────────┤
│ L2  Data          Supabase Postgres + RLS (agency_id)   │
│     migrácie v repo, žiadny ad-hoc PROD DDL             │
├─────────────────────────────────────────────────────────┤
│ L1  Integrations  Realvia (webhook + import), email, …  │
│     audit log, idempotent processed flags               │
└─────────────────────────────────────────────────────────┘
         Deploy: Vercel (app) · CI: GitHub Actions
         Secrets: env per environment · Preview per PR
```

### Pravidlá toku (3)
1. **Capabilities nevolajú DB priamo v demo ceste** — route načíta row, capability
   dostane typed input (`RealviaPropertyRow` / `UcListingMapped`).
2. **Guardian sedí na výstupe generátora** — žiadny publish bez PASS (AP-001).
3. **PROD write = founder GO** — cron/SQL cleanup nie v autonómnom swarme.

### Tenant model
- `agency_id` na všetkých business tabuľkách · RLS cez `profile_agencies_for_auth()`.
- Smoke a verification testy musia assert cross-tenant deny.

## 8. NAJČASTEJŠIE CHYBY
- Business logika v `page.tsx` namiesto `lib/capabilities`.
- Guardian obídený „pre demo".
- Mapovanie polí z hunchu, nie z reálnej vzorky (AP-003).
- Stacked PR mergnuté mimo `main` (noc #232/#233 lekcia).

## 9. KONTROLÓR CHECKLIST
☐ Nová feature má priradenú vrstvu L1–L5?
☐ Má reálny vstup (nie mock), ak sľubuje live metriku?
☐ Prechádza Guardian / honest pending, ak chýbajú dáta?
☐ CI + smoke pred merge?
☐ PROD write explicitne za bránou?

## 10. ANTI-PATTERN
AP-012 (Architecture Inflation): RRA **nie je** povolenie stavať L6 „Intelligence
Factory". Ak vrstva nie je v diagrame, nepatrí do repa dnes.

AP-001: RRA neobchádza Guardian — „Reference" znamená **kde** beží pravda, nie že
text môže klamať.

## 11. EVIDENCE + CONFIDENCE
- **Evidence:** Vertical Pack Vlna 1+2 verified na Smolko PROD (reálny row `13303557`);
  completeness **44 %** (4/9 polí, `scoreListingCompleteness`); 6/6 capability Guardian PASS;
  #231 HTML strip + #235 multi-area (167/120/4500 m² legitímne PASS, nie FLAG);
  673 testov CI; Realvia webhook reconcile na `main`.
- **Confidence:** Medium (1 produkčný projekt — Revolis CRM).

## 12. GENERALIZÁCIA
| Univerzálne | Revolis-špecifické |
|-------------|-------------------|
| 5 vrstiev + tenant RLS | `agency_id`, Realvia webhook shape |
| Capabilities ako pure funkcie | Konkrétne capability názvy (listing-score, …) |
| Guardian na generovanom texte | SK copy, Smolko fixture `13303557` |
| Vercel + GitHub CI | Konkrétny monorepo layout `apps/crm` |

---

## RETIREMENT CRITERIA
Ak 3 po sebe idúce projekty potrebujú iný tenant model (napr. row-level ≠ agency)
alebo iný deploy target → RRA v2 alebo Deprecated. Neudržuj Revolis stack ako
dogma pre iné domény.

## DEŇ 1 — prvý krok
Nakresli 5 vrstiev pre svoj produkt (1 strana). Pri ďalšom PR spýtaj sa: **ktorá
vrstva?** Ak nevieš → STOP, uprav RRA, potom kód.
