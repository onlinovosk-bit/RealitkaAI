# Report — bug hunt HIGH #2/#3/#4 applied via git am (2026-09-14)

**Stav:** patche aplikované, pushnuté, 3 PR otvorené. **Žiadny merge. Žiadna produkcia.**

Základ: `origin/main` @ `97655763b`.

## PR

| Bug | Vetva | PR |
|---|---|---|
| #2 outreach scoped lead | `fix/outreach-scoped-lead-lookup` | https://github.com/onlinovosk-bit/RealitkaAI/pull/548 |
| #3 playbook confirm viewing | `fix/playbook-confirm-viewing-scoped-lead` | https://github.com/onlinovosk-bit/RealitkaAI/pull/549 |
| #4 profiles scoped PATCH | `fix/profiles-patch-scoped-client` | https://github.com/onlinovosk-bit/RealitkaAI/pull/550 |

Bug #1: už PR https://github.com/onlinovosk-bit/RealitkaAI/pull/546 — neduplikované.

## Bezpečnosť

`/api/scheduled-outreach` ostáva **opt-in** za `SCHEDULED_OUTREACH_ENABLED=true`. Merge #548 sám o sebe nezačne posielať prospektom. Zapnutie = samostatné founder GO.

## Overenie (z pôvodnej session, nie znovu spustené tu)

- vitest: 1284 passed / 4 failed (main: 1257 / 4) → +27 testov, rovnaké 4 fail ako main
- tsc 69 = 69, eslint 0

Tu: `git am` clean na všetkých troch; push OK (táto session má auth).
