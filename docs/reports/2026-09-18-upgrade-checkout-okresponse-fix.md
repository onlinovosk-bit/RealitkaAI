# fix(/upgrade): okResponse consumer + rebase #369

**Dátum:** 2026-09-18  
**PR:** [#369](https://github.com/onlinovosk-bit/RealitkaAI/pull/369)  
**Branch:** `cursor/critical-bug-management-ff95` (local rebase tip `pr-369-upgrade-checkout`)  
**Base:** `origin/main` @ `9c6fc4dd0`

## Bug (verified on main)

`okResponse({ result })` → `{ ok: true, result }` (spread).  
`/upgrade` čítal `data.data?.result?.url` a `d.data` → redirect/config nikdy.

## Zmena

- Rebase PR commit na aktuálny main (1/1, **bez konfliktu** — auto-merge verification testu).
- Konzument: `d.seatCheckoutAvailable` + `data.result?.url`.
- Verification: `upgrade page reads flattened okResponse…` v `billing-credits.verification.test.ts`.
- **Bez** zmeny `okResponse`.

## Overenie

```text
node assert: PASS flattened okResponse contract
vitest billing-credits.verification.test.ts: 10/10 PASS
PR #369: MERGEABLE @ d9cf2681f (rebased on 9c6fc4dd0)
```

## Merge

GO REQUIRED — merge do `main` nerobím bez pokynu.
