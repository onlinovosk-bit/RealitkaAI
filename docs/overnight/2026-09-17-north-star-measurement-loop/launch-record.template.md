# Launch record — `2026-09-17-north-star-measurement-loop`

**Status: `NOT_LAUNCHED`**

| Pole | Hodnota | Poznámka |
|---|---|---|
| `package_path` | `docs/overnight/2026-09-17-north-star-measurement-loop/` | |
| `status` | `NOT_LAUNCHED` | |
| `scope` | `measurement` | **nie** `implementation` — beh nemení produkčný kód |
| `start_at` | _prázdne_ | s UTC offsetom |
| `deadline_at` | _prázdne_ | s UTC offsetom, tvrdý |
| `db_access_mode` | _prázdne_ | **`readonly_role`** alebo **`founder_batch`** — viď nižšie |
| `SUPABASE_READONLY_URL` | _prázdne_ | iba pri `readonly_role`; **nikdy service-role kľúč** |
| `provider_policy` | `subscription-only` | |
| `daily_cap` | `USD 5/deň, tvrdý stop` | |
| `runner` | _prázdne_ | presný názov a verzia |
| `models` | `claude-opus-5` | eskalácia vypnutá |
| `backfill_from` | `2026-08-17` | |
| `backfill_to` | `2026-09-16` | 31 iterácií |
| `max_prs_total` | **`1`** | docs-only, až vo W2 |
| `base_sha` | _prázdne_ | zvolený vo W0 |
| `run_id` | _vzniká vo W0_ | |
| `authorized_by` | _prázdne_ | |
| `authorized_at` | _prázdne_ | |

## Dva režimy prístupu k dátam — vyber jeden

### A) `readonly_role` — rýchlejší, vyžaduje nové credentials

Vytvor v Supabase rolu, ktorá má **iba `SELECT`** na tabuľkách
`leads`, `activities`, `routine_notifications`, `lead_property_matches`,
`buyer_intents`, `realvia_webhook_logs`. Connection string vlož ako
`SUPABASE_READONLY_URL`.

```
ŽIADNY service-role kľúč. Ak rola vie INSERT/UPDATE/DELETE, balík sa nespúšťa.
```

### B) `founder_batch` — pomalší, žiadne nové credentials

Slučka vygeneruje `control/queries-to-run.sql`, **ty ju spustíš raz** a výsledok
uložíš ako `control/results.json`. Slučka potom beží nad tým súborom bez
akéhokoľvek prístupu do produkcie.

Ak si nie si istý, zvoľ **B**. Je to pomalšie o jeden tvoj krok a odpadá tým
celá kategória rizika.

## Brány

1. `db_access_mode` prázdne → **`NOT_LAUNCHED`**.
2. `readonly_role` a rola nie je read-only → **`NOT_LAUNCHED`**.
3. Akýkoľvek pokus o `INSERT`/`UPDATE`/`DELETE`/DDL → **okamžitý STOP** behu.
4. Agent nesmie autorovať SQL. Jediný povolený súbor je
   `scripts/sql/north-star-day.sql` a počas slučky sa nemení.
5. `deadline_at` je tvrdý.

## Výslovné nezačatia

- Beh **nemení produkčný kód** ani produkčné dáta.
- Počas slučky sa **necommituje a nepushuje** — jeden PR až vo W2.
- Nedotýka sa území balíka `2026-09-16-typecheck-paydown-loop`.
- `swarm_init` sa skúša raz; pri zlyhaní worktree, bez opakovania.

## Podpis foundera

```
Autorizujem north-star measurement loop, rozsah measurement, režim prístupu <A/B>.
Beriem na vedomie, že beh číta produkciu iba cez SELECT a vyrobí najviac jeden docs-only PR.

meno / dátum / čas s offsetom:
```
