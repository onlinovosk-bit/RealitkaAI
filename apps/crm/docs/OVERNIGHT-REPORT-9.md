# OVERNIGHT REPORT 9 — Brief 9.0

> **Baseline:** `origin/main` @ post-#184 · **Politika:** [AUTOMERGE-POLICY.md](../../docs/AUTOMERGE-POLICY.md) v1.0 · **Brief:** [overnight-master-brief-9.md](../../docs/briefs/overnight/overnight-master-brief-9.md)  
> **Pravidlo:** REPORTOVANÉ ≠ COMMITNUTÉ — overené `git branch -a` + open PRs @ 2026-06-12 ~06:00 UTC.

---

## Fáza 0 — auto-merge robot

| PR | Vetva | Tier | Stav |
|----|-------|------|------|
| [#185](https://github.com/onlinovosk-bit/RealitkaAI/pull/185) | `feat/automerge-policy` | 3 | **MERGED** — robot aktívny |

Andy pred spaním: labels `automerge` / `hold` / `tier-3-andy` + branch protection „require up to date".

---

## Pre-flight inventár (Brief 8.0 resty @ večer 2026-06-11)

| Agent 8.0 | Vetva | PR | Verdikt (večer) | Stav ráno |
|-----------|-------|-----|-----------------|-----------|
| B RLS | `chore/rls-tenant-isolation-suite` | #184 | CI zelené, čaká merge | **MERGED** |
| C onboarding | `feat/onboarding-activation-emails` | #183 | e-maily only | **CLOSED** — superseded W/W2 |
| A landing v2 | `feat/landing-v2-release` | — | nedobehlo | → [#188](https://github.com/onlinovosk-bit/RealitkaAI/pull/188) |
| D metrics | `feat/founder-metrics` | — | nedobehlo | → [#187](https://github.com/onlinovosk-bit/RealitkaAI/pull/187) |
| E nehnuteľnosti | `feat/nehnutelnosti-import` | — | nedobehlo | → [#186](https://github.com/onlinovosk-bit/RealitkaAI/pull/186) |
| F resty | `fix/w2-leftovers` | — | nedobehlo | stále bez vetvy |

---

## Vlna → agent → PR → tier → stav

### Vlna 1 (~22:00–01:30)

| Agent | PR | Vetva | Tier | Label | CI | Stav |
|-------|-----|-------|------|-------|-----|------|
| N | [#186](https://github.com/onlinovosk-bit/RealitkaAI/pull/186) | `feat/nehnutelnosti-import` | 2 | `automerge` | zelené | open — Tier 2 (6 h) |
| M | [#187](https://github.com/onlinovosk-bit/RealitkaAI/pull/187) | `feat/founder-metrics` | 2 | `automerge` | zelené | open — Tier 2 (6 h) |
| L | [#188](https://github.com/onlinovosk-bit/RealitkaAI/pull/188) | `feat/landing-v2-release` | **3** | `tier-3-andy` | zelené | open — **Andy merge** (ceny) |
| W | [#189](https://github.com/onlinovosk-bit/RealitkaAI/pull/189) | `feat/onboarding-wizard` | 2 | `automerge` | zelené | open — Tier 2 (6 h) |

### Vlna 2 (~01:30–04:30)

| Agent | PR | Vetva | Tier | Label | CI | Stack / poznámka |
|-------|-----|-------|------|-------|-----|------------------|
| H | [#190](https://github.com/onlinovosk-bit/RealitkaAI/pull/190) | `chore/brief9-housekeeping` | **1** | `automerge` | zelené | docs-only — okamžitý merge |
| M2 | [#191](https://github.com/onlinovosk-bit/RealitkaAI/pull/191) | `feat/founder-metrics-m2` | 2 | `automerge` | zelené | stacked na #187 |
| I | [#192](https://github.com/onlinovosk-bit/RealitkaAI/pull/192) | `feat/notifications-inbox` | 2 | `automerge` | pending/zelené | inbox UI |
| W2 | [#193](https://github.com/onlinovosk-bit/RealitkaAI/pull/193) | `feat/onboarding-wizard-w2` | 2 | `automerge` | zelené | stacked na #189; activation docs |

### Vlna 3 (~04:30–06:30) — Tier 1 docs

| Agent | PR | Scope | Tier |
|-------|-----|-------|------|
| S3 | _(tento PR)_ | AUTOMERGE cross-links, activation-emails.md, report finalizácia | **1** |

---

## RLS nálezy (kritické navrchu)

Z [#184](https://github.com/onlinovosk-bit/RealitkaAI/pull/184) — **merged**. Detail: [RLS-ISOLATION-REPORT.md](./audit/RLS-ISOLATION-REPORT.md).

| Tabuľka | Issue | Fix |
|---------|-------|-----|
| `credit_ledger` | RLS not enabled | migrácia `20260613000000` |
| `lead_action_scores` | RLS not enabled | migrácia `20260613000000` |

**Výsledok:** 56 tenant tabuliek v registry, 0 kritických isolation failures po fixe.

---

## Robot audit (ráno)

1. Skontroluj merged PRs cez GitHub Actions → workflow **Auto-merge robot** (komentáre s tier + cesty).
2. Open Tier 2 PRs (#186–#189, #191–#193): over vek ≥ 6 h a label `hold` absent.
3. Tier 1 docs (#190, S3): mali by byť už zmergované robotom ak CI zelené.

---

## Otázky pre Andyho

1. **#183 closed** — potvrdiť, že W2 (#193) je kanonický carrier activation e-mailov (nie re-open #183).
2. **Landing v2 (#188)** — release okno + preview cenník zo `seat-pricing.ts`; robot nikdy nemergne (Tier 3).
3. **Aktivačné flagy** — `ONBOARDING_WIZARD_ENABLED` / `ONBOARDING_EMAILS_ENABLED` ostávajú OFF v prod až po manuálnom smoke?
4. **Brief 6 gap** — chýba `overnight-master-brief-6.md` (TODO z Agent H #190).

---

## Ranný checklist pre Andyho

### 1. RLS & bezpečnosť (first)

- [x] #184 merged — overiť CI na `main` po merge
- [ ] Smoke: cross-tenant SELECT/INSERT blocked (seed 2 agentúr lokálne)
- [ ] Skontrolovať robot komentáre — žiadny automerge na denylist cestách

### 2. Tier 3 fronta (ručný merge)

- [ ] [#188](https://github.com/onlinovosk-bit/RealitkaAI/pull/188) Landing v2 — **len v release okne**, ceny zo `seat-pricing.ts`
- [ ] Akékoľvek PR s `supabase/migrations/**` v diffe — robot label odstráni; merge Andy

### 3. Tier 2 fronta (robot alebo Andy)

- [ ] #189 → potom rebase/merge #193 (W2 activation wiring)
- [ ] #187 → potom #191 (metrics CSV + trendy)
- [ ] #186 nehnuteľnosti import, #192 notifications inbox

### 4. Tier 1 docs (robot)

- [ ] #190 housekeeping docs
- [ ] S3 docs sync PR (tento report + activation-emails cross-links)

### 5. Obchod & komunikácia

- [ ] Intro e-maily **2 prospectom** (manuálne — nie auto-send z CRM, viz vault `decisions.md`)
- [ ] Screenshoty pre playbook `docs/playbooks/migracia-nehnutelnosti.md` (#186 TODO)

### 6. Aktivácia onboarding (po merge W/W2)

- [ ] Prečítať [activation-emails.md](./onboarding/activation-emails.md) + [ACTIVATION-AUDIT.md](./onboarding/ACTIVATION-AUDIT.md)
- [ ] Staging smoke: wizard 3 kroky + milestone log v checkliste

---

## Súvisiace dokumenty

| Dokument | Účel |
|----------|------|
| [AUTOMERGE-POLICY.md](../../docs/AUTOMERGE-POLICY.md) | Tier 1/2/3 pravidlá, denylist |
| [docs/briefs/README.md](../../docs/briefs/README.md) | Index overnight briefov |
| [activation-emails.md](./onboarding/activation-emails.md) | D0–D7 + wizard milestone špec |
| [RLS-ISOLATION-REPORT.md](./audit/RLS-ISOLATION-REPORT.md) | Tenant isolation audit |
