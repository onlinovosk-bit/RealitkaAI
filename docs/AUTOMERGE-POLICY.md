# Auto-merge policy (Revolis CRM)

**Verzia:** 1.0 · **Dátum:** 2026-06-12 · **Vykonáva:** `.github/workflows/auto-merge-policy.yml`

Robot **vykonáva** pravidlá nižšie — neinterpretuje, nemení podmienky. Ak PR nespĺňa tier, **nemer­guje** a zanechá komentár.

---

## Povinné podmienky (všetky tiery)

1. Label `automerge` na PR (orchestrátor ho pridáva len pre Tier 1/2).
2. Required check **`Lint, test, build`** = success.
3. PR **up to date** s `main` (`mergeStateStatus` = CLEAN).
4. **Žiadny** súbor v diffe nesmie matchnúť **denylist** (ak áno → robot odstráni `automerge`, komentár „TIER 3 — vyžaduje Andyho", stop).
5. Label `hold` → Tier 2 **nikdy** nemerguje (Tier 1 tiež stop).

---

## Denylist (automaticky Tier 3 — Andy)

| Vzor | Dôvod |
|------|--------|
| `.github/**` | CI / governance |
| `**/vercel.json` | deploy |
| `apps/crm/supabase/migrations/**` | DB / RLS |
| `**/seat-pricing.ts`, `**/program-tier-pricing.ts` | verejné ceny |
| `apps/crm/src/middleware.ts`, `apps/crm/src/proxy.ts` | auth |
| `apps/crm/src/lib/credits-billing.ts`, `**/stripe/**` | billing |
| `**/*stealth-recruiter*` | legal hold |
| `**/*smolko*` (case-insensitive) | produkčný zákazník |

Zakázané akcie z vault `decisions.md` (arbitrage live, scraping, auto-send e-mailov zákazníkom) — orchestrátor **nepridáva** `automerge` na PR, ktoré ich dotýka.

---

## Tier 1 — okamžitý squash merge

Všetky zmenené súbory musia spadať do **aspoň jedného** allowlist vzoru:

| Vzor | Poznámka |
|------|----------|
| `docs/**` | vrátane `apps/crm/docs/**` |
| `**/*.md` | markdown kdekoľvek v repe |
| `**/tests/**` | pridanie/úprava testov |
| `apps/marketing/**` | **bez** cien — ak diff obsahuje `\d+€` alebo `seat-pricing`, robot zastaví |

**Výnimka kód za flagom OFF:** ak PR mení `.ts`/`.tsx` mimo allowlistu, robot grepne diff na `_ENABLED` / `default false` / `default OFF`; ak nenájde dôkaz flagu, klasifikuje ako Tier 2 (nie okamžitý merge).

---

## Tier 2 — squash merge po 6 h

- Všetky súbory mimo denylistu.
- PR vek ≥ **6 hodín** od `created_at`.
- Bez labelu `hold`.
- Inak robot čaká (re-run po ďalšom CI / cron).

---

## Tier 3 — len Andy

- Akýkoľvek denylist match.
- Label `tier-3-andy` (orchestrátor).
- Robot **nikdy** nemerguje.

---

## Labels (vytvorí Andy pred prvou nocou)

| Label | Účel |
|-------|------|
| `automerge` | Robot smie vyhodnotiť PR |
| `hold` | Veto Tier 2 |
| `tier-3-andy` | Informačný — ručný merge |

---

## Branch protection (Andy overí)

- `main`: required check `Lint, test, build`.
- **Require branches to be up to date** pred merge = **zapnuté**.

---

## Audit

Každý auto-merge = PR komentár: verzia politiky (v1.0), tier, zoznam matchnutých ciest, čas UTC.

---

## Súvisiace dokumenty

| Dokument | Odkaz |
|----------|--------|
| Overnight brief 9.0 | [overnight-master-brief-9.md](./briefs/overnight/overnight-master-brief-9.md) |
| Overnight report 9 | [OVERNIGHT-REPORT-9.md](../apps/crm/docs/OVERNIGHT-REPORT-9.md) |
| Briefs index | [docs/briefs/README.md](./briefs/README.md) |
| Robot implementácia | `.github/workflows/auto-merge-policy.yml`, `.github/scripts/automerge-policy.mjs` |
| Vault rozhodnutie | `memory/decisions.md` — Brief 9.0 automerge v1 |
| Agent prompting štandard | [AGENT_STANDARD.md](./AGENT_STANDARD.md) |
