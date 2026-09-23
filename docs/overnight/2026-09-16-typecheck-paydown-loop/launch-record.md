# Launch record — `2026-09-16-typecheck-paydown-loop`

**Status: `NOT_LAUNCHED`**

Vyplň každé pole pred W0. Prázdna hodnota nie je autorizácia.

| Pole | Hodnota | Poznámka |
|---|---|---|
| `package_path` | `docs/overnight/2026-09-16-typecheck-paydown-loop/` | |
| `status` | `NOT_LAUNCHED` | → `LAUNCH_AUTHORIZED` po vyplnení |
| `scope` | `implementation` | balík mení kód |
| `pr_554_merged` | `true` | overené 2026-09-15: mergedAt 13:53:39Z — Judge + ratchet na main |
| `pr_555_merged` | `true` | overené 2026-09-15: mergedAt 13:54:07Z — acceptance T4 (bus-validate) povolené |
| `start_at` | _prázdne_ | s UTC offsetom |
| `deadline_at` | _prázdne_ | s UTC offsetom, **tvrdý** |
| `provider_policy` | `subscription-only` | prevzaté z behu 15. 9. |
| `spend_cap` | strop predplatného | |
| `daily_cap` | `USD 5/deň, tvrdý stop` | akákoľvek platená spotreba → STOP |
| `runner` | _prázdne_ | presný názov a verzia |
| `models` | `claude-opus-5` | jediný; eskalácia vypnutá |
| `max_open_prs` | **`3`** | zmeň len vedome, nie počas behu |
| `base_sha` | _prázdne_ | zvolený vo W0 po fetchi |
| `measured_baseline_at_w0` | _prázdne_ | **očakávané 69**; iné číslo → prepočítaj front |
| `run_id` | _vzniká vo W0_ | |
| `authorized_by` | _prázdne_ | |
| `authorized_at` | _prázdne_ | |

## Brány

1. `pr_554_merged != true` → **`NOT_LAUNCHED`**. Toto je tvrdá podmienka.
2. `measured_baseline_at_w0 != 69` → front v `queue.json` je zastaraný.
   Prepočítaj ho z čerstvého `tsc` a zapíš odchýlku; **nespúšťaj slučku na starom fronte.**
3. Ktorékoľvek povinné pole prázdne → **`NOT_LAUNCHED`**.
4. `deadline_at` je tvrdý. Slučka sa pri ňom zastaví a orchestrátor zapíše W2 report.
5. Akákoľvek platená spotreba pri `subscription-only` → **STOP**.

## Výslovné nezačatia

- `swarm_init` sa skúša **raz**; pri zlyhaní worktree, bez opakovania.
- `.mcp.json`, `tsconfig.json`, `next.config.js` sa počas behu **nemenia**.
- `typecheck-baseline.json` sa počas slučky **nemení**.
- Existujúce rozpracované vetvy sa **nesmú** `stash`/`reset`/`clean`-núť.
- Stealth-recruiter a `notification-digest` súbory sú mimo behu.

## Podpis foundera

```
Autorizujem typecheck paydown loop, rozsah implementation, MAX_OPEN_PRS = 3.
Beriem na vedomie, že slučka zastane pri troch otvorených PR a bude čakať na môj merge.

meno / dátum / čas s offsetom:
```
