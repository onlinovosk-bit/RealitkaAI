# Nocna vlna N1+N2 — 15.→16.8.2026

**Rezim:** vetva + PR + STOP. Ziadny merge. Ziadny push do main. Ziadne credentials. Ziadna aplikacia migracii.
**Gate:** `origin/main` mal `d6b9e351` (#416) a `b4e947580` (#417). Vsetky lanes spustene.
**Ruflo MCP:** nedostupny pocas startu — lanes isli ako izolovane Cursor worktrees. Vysledok je rovnaky kontrakt (jeden push / PR / STOP).
**Prompt:** `docs/prompts/ruflo-swarm-noc-2026-08-15.md`

Poradie review (z promptu): **L25 → L22 → L23 → L28 → L29 → L26 → L24 → L27**

| Poradie | Lane | Vetva | PR | Stav | Caka na foundera |
|---|---|---|---|---|---|
| 1 | L25 pagination | `fix/crm-lists-pagination` | [#425](https://github.com/onlinovosk-bit/RealitkaAI/pull/425) | hotove | Preview T2 `/dashboard` + `/leads`; merge az po review. Layout/nav netknute. |
| 2 | L22 Gmail pull | `feat/inbound-gmail-pull` | [#422](https://github.com/onlinovosk-bit/RealitkaAI/pull/422) | hotove | Mock-first, 10/10. Follow-up (vlastne GO): middleware/proxy allowlist `/api/inbound/`. Potom OAuth runbook na Preview. |
| 3 | L23 decisions dedup | `chore/decisions-dedup-variant-a` | [#421](https://github.com/onlinovosk-bit/RealitkaAI/pull/421) | hotove | Variant A: twin `brain/decisions/decisions.md` prec. SoT ostava `memory/decisions.md`. |
| 4 | L28 Playwright e2e | `test/acquisition-e2e-smoke` | [#420](https://github.com/onlinovosk-bit/RealitkaAI/pull/420) | report | Spec je. Tenant isolation skip bez lokalnych `ACQUISITION_E2E_*`. CI `test:smoke` spec nenaide, kym nie je Playwright project. Nemerge ako required gate. |
| 5 | L29 comms drafty | `docs/comms-drafts-2026-08-15` | [#419](https://github.com/onlinovosk-bit/RealitkaAI/pull/419) | hotove | Nic sa neodoslalo. Review + ty posles. RÚ email `[DOPLNIŤ]`. |
| 6 | L26 Stage 1 plan | `docs/stage1-plan-draft` | [#418](https://github.com/onlinovosk-bit/RealitkaAI/pull/418) | hotove | Draft, nie start. Odpovede na GO otazky v §12. Stage 1 kod az po vlastnom GO. |
| 7 | L24 genome_layer2 | `chore/genome-layer2-rename` | [#424](https://github.com/onlinovosk-bit/RealitkaAI/pull/424) | blocked merge | **NEmergovat** kym Dashboard SQL + INSERT `schema_migrations` `20260817120000`. Ziadny `db push`. |
| 8 | L27 sync persist | `feat/acquisition-sync-persistence-prep` | [#423](https://github.com/onlinovosk-bit/RealitkaAI/pull/423) | blocked merge | **NEaplikovat** migraciu ani `ACQUISITION_PERSIST_SYNC=true` bez GO. Rovnaky founder postup ako L24. |

## Konflikty (report, nie improvizacia)

- L28: `/acquisition` je RSC; `E2E_BYPASS_AUTH` stranku neotvori. Isolation bez secretov sa neda dokazat. Cudzie untracked e2e helpery v worktree **niesu v PR**.
- L27: pocas behu sa objavil stray duplikat migracie; pred commitom zmazany. Ak sa znova ukaze, paralelny writer.
- Ziadny lane nemergoval. Ziadny lane nepisal do `memory/`.

## Ranne poznamky (z promptu)

1. Review v tabulke vyssie.
2. L24/L27: kod zavisly od migracie az po Dashboard + `schema_migrations`.
3. V4-B (#422): az po allowlist follow-up + Preview OAuth; alias forward nechaj.
4. L29 drafty posielas ty.
5. Stage 1 sa nespusta.