# Audit — Night Operations metriky

## `nodes-value.jsonl`

Append-only denný verdikt zakladateľa po prečítaní reportu uzla.

Jedna schéma (jeden JSON objekt na riadok):

```json
{"date":"2026-08-04","node":"morning-brief","verdict":"konal","action":"volal Kališovi"}
```

`verdict` ∈ `{ konal | vedel | zbytočné }`

- **konal** — report priviedol k akcii, ktorú by inak neurobil
- **vedel** — potvrdil známe; nič sa nezmenilo
- **zbytočné** — nepriniesol nič

30 dní bez verdiktu spúšťa vypnutie uzla (ADR-005). Súbor `nodes-value.jsonl` je zámerne prázdny na štarte — prvý riadok pridá founder.

## `guardian-history.jsonl`

Append-only história A1 (Architecture Guardian). Zapisuje nočný uzol A1 na vetvu `reports/guardian-history`, nie do `main`. Vytvorí sa pri prvom behu A1.
