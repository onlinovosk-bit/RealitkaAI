# Swarm aktivácia — post Wave 4 (2026-08-02)

**Aktivované:** 2026-08-02 ~22:24 UTC+2  
**Session:** `post-4vlny-activation-2026-08-02`  
**Základ:** `main` @ `8863e7667`  
**Predošlý beh:** Wave 1–4 **DONE** (playbook `2026-07-31-swarm-4-vlny.md`, verifikácia PASS)

---

## Ruflo stav (overené MCP `user-ruflo`)

| Položka | Hodnota |
|---|---|
| Nový swarm | `swarm-1785702221641-uqo8ac` — **running**, hierarchical, maxAgents=8 |
| Starý overnight swarm | `swarm-1785529408671-j4vxvt` — **terminated** |
| Hive-mind | `hive-1785529619368` — active (stale metrics z 31.07; queen load 0.5) |
| Session | `post-4vlny-activation-2026-08-02` (daemon **OFF** — žiadny token burn) |
| Claude CLI | `2.1.114` na PATH (`claude`, `claude.cmd`) |
| Coding agents | **NESPÚŠŤANÉ** — čaká founder GO + disjoint proof |

### Orchestrátori (registrovaní, bez execute)

| Agent ID | Typ | Model | Úloha |
|---|---|---|---|
| `chief-orchestrator-2026-08-02` | orchestrator | sonnet | koordinácia, anti-scope-creep |
| `wave-orchestrator-2026-08-02` | orchestrator | haiku | DAG + write-set ownership |
| `kontrolor-2026-08-02` | reviewer | haiku | brána pred coding spawn |

---

## Obsidian vault

| Položka | Stav |
|---|---|
| Cesta | **`C:\RealitkaAI-Memory\`** (potvrdené: `.obsidian` existuje) |
| Zdroj cesty | `brain/identity/COMPANY.md` + filesystem check |
| Cockpit | `00-Dashboard/Founder-Cockpit.md` (Ads/Harasim/Molnár termíny — čiastočne staršie) |
| Sales | `10-Sales/Pipeline.md` — autoritatívny tracker = `docs/sales/revolis-sales-tracker.xlsx` v repe |

**Poznámka:** Repo root / worktrees mali `.obsidian` stopy z iných kontextov; **kanonický vault je `C:\RealitkaAI-Memory\`**.

---

## Predošlý swarm (Wave 1–4) — uzavreté

| Vlna | Stav | Dôkaz |
|---|---|---|
| 1A–1C | MERGED | #336–#338 |
| 2A–2B | MERGED | #339–#340 |
| 3A | MERGED | #343 |
| 4A–4B | DONE | `2026-07-31-swarm-verifikacia.md`; #345 MERGED |
| Prod migrácie | ✅ | 2026-08-02 ~15:42 UTC+2 |
| Demo sandbox submit | PASS | `app.revolis.ai/odhad/demo` |

Playbook obnovený z gitu (`b1a999c86`) → `docs/briefs/overnight/2026-07-31-swarm-4-vlny.md`.

---

## Navrhovaný WAVE DAG (disjunktné write sety)

> Žiadna nová produktová featura. Scope = founder items z verifikácie + otvorené P0/P1 z evidence.  
> **Merge gate medzi vlnami = ľudský**, pokiaľ founder explicitne nepovolí autonómiu.

```
                    [DEMO GATE — pondelok]
                              │
         ┌────────────────────┴────────────────────┐
         │                                         │
   WAVE 5 (pre-demo)                         WAVE 6+ až PO deme
   docs + human smoke                        (founder GO)
         │
         └─► 5A docs │ 5B human-only smoke
```

### WAVE 5 — Pre-demo / aktivácia *(bez coding agentov)*

| Slot | Typ | Write set (exclusive) | Zadanie | Brána |
|---|---|---|---|---|
| **5A** | docs | `docs/briefs/overnight/` | Status + playbook restore (tento beh) | AUTO-SAFE ✅ done |
| **5B** | human | *(žiadny repo write)* | Smoke `https://app.revolis.ai/odhad/reality-smolko` (1 test submit) | Founder |
| **5C** | human | *(žiadny / sales xlsx len founder)* | Demo GARANT REAL pondelok 8:45 | Founder |

**Disjoint proof 5A↔5B:** 5B nepíše do repa → kolízia 0.

### WAVE 6 — Post-demo tech debt z verifikácie *(2 paralelné · GO REQUIRED)*

Zdroj: `2026-07-31-swarm-verifikacia.md` § „Po demo / rozhodnutia“ položky 5–6.

| Slot | Branch (návrh) | Write set (exclusive) | Zadanie | NEROB |
|---|---|---|---|---|
| **6A** | `swarm/w6a-credit-costs-unify` | `apps/crm/src/lib/program-tier-pricing.ts` · `apps/crm/src/lib/__tests__/program-tier-pricing.test.ts` · `apps/crm/src/lib/credits/credit-rates.ts` · `apps/crm/src/lib/credits/__tests__/credit-rates.test.ts` | Zosúladiť `CREDIT_ACTION_COSTS.leadUnlock` (4) → import/re-export z `credit-rates` (20). Call sites **nemeniť** (už importujú `CREDIT_ACTION_COSTS`). | Nespájať spendCredits; žiadny prod |
| **6B** | `swarm/w6b-progress-ico` | `docs/progress.md` | Opraviť IČO ONLINOVO na 54166942 (po právnej kontrole) | Nesiahať na `brain/` ani zmluvy |

**Disjoint proof 6A↔6B:** `apps/crm/src/lib/**` vs `docs/progress.md` — prienik ∅.

### WAVE 7 — Po merge Wave 6 *(GO + produktové rozhodnutie)*

Zdroj: verifikácia položky 4 + 7; playbook bonus.

| Slot | Write set (exclusive) | Zadanie | Blokér |
|---|---|---|---|
| **7A** | TBD podľa schválených call sites z PR #339 | Zapojenie `spendCredits()` — **ktoré akcie** rozhoduje founder | Bez GO = STOP |
| **7B** | `apps/crm/src/app/api/valuation/submit/` + nová migrácia RPC | `lead_consents` transakčný submit | Bez GO = STOP; **nespúšťať paralelne s 7A** ak zdieľajú valuation API (prienik riziko) |

**Odporúčanie:** 7A a 7B **sekvenčne** (nie paralelne), kým founder nepotvrdí disjoint file list pre 7A.

### WAVE 8 — Ops backlog (evidence `memory/open-tasks.md`) — GO REQUIRED

| Slot | Write set | Zadanie | Poznámka |
|---|---|---|---|
| **8A** | docs/ops alebo žiadny | Externý cron: overiť cron-job.org + Vercel `CRON_SECRET` | P0; často human/secrets |
| **8B** | žiadny / skript read-only | Guardian PROD smoke 5/5 | Vyžaduje credentials ≠ Smolko owner |
| **8C** | triage only | Staré OPEN PR (#189,#191,#186,#192,#198,#304,#326,#155) | Merge policy? |

**Nie v scope bez evidence:** nové features, Realvia re-arch, K3 UI route (VALIDATE v open-tasks).

---

## Blockers (teraz)

1. **Demo pondelok** — kód GO; zostáva human smoke Smolko widget + live demo.
2. **Žiadny GO** na Wave 6/7/8 coding — orchestrátori čakajú.
3. Ruflo `task_list` stále ukazuje Wave 1–4 tasky ako `pending` (stale registry) — treba founder rozhodnutie: označovať completed / ignorovať.
4. Hive `hive-1785529619368` je „active“ so starými taskami — či reštartovať nový hive alebo reuse.

---

## Pravidlá (nezmenené z 4-vlny)

- Žiadny deploy / prod migrácia / prod DELETE / email send agentom.
- Test agency only — nie Smolkov owner účet.
- 1 agent = 1 branch = exclusive write set; mimo = STOP + zápis do PR.
- Vlna N+1 až po merge Vlny N (alebo explicitný founder override).

---

## OPEN QUESTIONS pre foundera

Pozri koniec aktivácie (sekcia nižšie v chat odpovedi) — **bez odpovedí nespúšťame coding waves**.

---

## Update 2026-08-03 ~07:50 UTC+2 (founder „pokračuj“)

- Wave 5B checklist: 2026-08-03-DEMO-CHECKLIST-GARANT-REAL.md + smoke PASS (HTTP 200 + browser load-only).
- Wave 6 GO: YES — branches swarm/w6a-credit-rates-align, swarm/w6b-progress-ico (human merge).
- Stale Wave 1–4 Ruflo tasks: marked **completed**.
- Wave 7: STOP (no spendCredits call-site list).
- Detail: 2026-08-03-swarm-continue-status.md.
