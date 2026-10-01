# DEMO CHECKLIST — GARANT REAL · 2026-08-03 ~08:45 UTC+2

**Klient:** GARANT REAL  
**Cieľ:** Live demo valuačného widgetu (branded sandbox) — **žiadny** prod lead submit ako Smolko owner.  
**Pripravené:** 2026-08-03 ~07:45 UTC+2 · Wave 5B (pre-coding)

---

## URLs (otvor pred hovorom)

| Účel | URL | Poznámka |
|---|---|---|
| **Demo sandbox (primárne pre klientov)** | https://app.revolis.ai/odhad/demo | Submit OK → `sandbox_submissions`, **nie** `leads` |
| **Smolko branded (referencia)** | https://app.revolis.ai/odhad/reality-smolko | **LOAD-ONLY** — neodosielať ako founder/owner počas dema |
| Health | https://app.revolis.ai/api/healthz | Rýchly 200 check |

---

## Pred demom (5 min) — founder verify

- [ ] `/odhad/demo` načíta (nie 500 / blanká stránka)
- [ ] Branding / UI čitateľné (formulár, CTA, žiadny error banner)
- [ ] `/odhad/reality-smolko` načíta (load-only; **neodosielať**)
- [ ] Voliteľne: 1× **sandbox** submit na `/odhad/demo` (nie Smolko slug)
- [ ] Poznámka: prod migrácie Wave 1–4 **už aplikované** (2026-08-02 ~15:42 UTC+2) — **nerobiť** SQL dnes

---

## Počas dema — čo ukázať

1. Otvor `/odhad/demo` — „takto vyzerá widget pod značkou kancelárie“.
2. Vyplň parametre → odhad pásma (ŠÚ SR / NBS / regional prices).
3. Submit v **demo** → lead ostáva v sandboxe (GDPR-safe demo).
4. (Voliteľne) ukáž load `/odhad/reality-smolko` ako live branded príklad — **bez submitu**.
5. Ak sa pýtajú CRM: krátko cockpit / lead triage — bez menenia prod dát Smolka.

---

## NEROBIŤ dnes (pre-demo / počas dema)

- Prod lead submit na `/odhad/reality-smolko` (owner účet)
- Prod SQL / migrácie / DELETE
- Merge Wave 6+ PRs do `main` **pred** demom (PRs môžu existovať; human merge až po deme alebo keď CI zelené + founder OK)
- Wave 7 (`spendCredits` call sites) — **STOP** bez explicitného zoznamu

---

## Tech stav (kontext pre Q&A)

| Položka | Stav |
|---|---|
| Wave 1–4 | MERGED (#336–#345) |
| Prod migrácie | ✅ 2026-08-02 |
| Demo sandbox submit | PASS ( overnight verifikácia) |
| Credit rates SSOT | `credit-rates.ts` LEAD_UNLOCK=20; display align = Wave 6A (PR, post-demo merge OK) |
| Swarm | `swarm-1785702221641-uqo8ac` (orchestrátori; coding = Wave 6 PRs) |

---

## Agent smoke (load-only) — 2026-08-03

| URL | Výsledok | Čas |
|---|---|---|
| `/odhad/demo` | ✅ HTTP 200 · browser: „Ukážková kancelária“, formulár krok 1/3, CTA „Zobraziť môj odhad“ | ~07:46 UTC+2 |
| `/odhad/reality-smolko` | ✅ HTTP 200 · browser: branding Reality Smolko, formulár OK — **submit NErobený** | ~07:47 UTC+2 |
| `/api/healthz` | ✅ `{"ok":true,"status":"healthy"}` | ~07:46 UTC+2 |

---

## GO status

| Gate | Stav |
|---|---|
| Demo prep checklist | ✅ tento súbor |
| Wave 6 coding GO | ✅ founder „pokračuj“ 2026-08-03 (po checkliste) |
| Wave 6 merge | ⏸ human merge (nie auto) |
| Wave 7 | ❌ bez explicitného listu call sites |
