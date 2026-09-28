# DAG — Smolko Website Concierge

```text
N00 reconcile
  │
  ├─► N01 cleanup misplaced CRM chat (#544 path)
  │
  └─► N04 B04 PROD evidence ─────────────────────┐
                                                  │
N05 B05 privacy/FAQ draft ──► GO-B05-COPY ───────┤
                                                  ├─► N07 public Concierge read MVP ──► GO-W3-SHIP ──► M1
N06 B06 routing matrix ─────► GO-B06-ROUTING ────┘

M1 ──► N08 B07 migration PREP ──► GO-B07-DB (apply = founder/ops, nie worker)
         │
         └─► N09 B08 calendar ──► GO-B08-OAUTH ──► N10 B09 idempotency+notify ──► M2
```

## Hrany (musí platiť)

| From | To | Prečo |
|---|---|---|
| N00 | všetky | bez zosúladenia registra sa nestavajú falošné PASS |
| N04 | N07 | bez PROD tenancy/freshness žiadny public property matcher |
| N05+GO | N07 | bez disclosure/FAQ žiadny public AI traffic |
| N06+GO | N07 | bez routingu žiadny spoľahlivý handoff |
| N01 | (nezávislé od N07) | cleanup môže ísť paralelne s N04; nesmie blokovať M1 ak Voiceflow drží web |
| N07+M1 | N08 | booking až po read MVP |
| N08+GO-B07 | N09 | calendar bez CRM úložiska = falošný booking |
| N09+GO-B08 | N10 | idempotency nad reálnym providerom |

## Paralelnosť

```
Paralelne OK:   N01 ∥ N04 ∥ N05 ∥ N06
Sériovo:        N07 až po N04∧N05∧N06 (+ príslušné GO)
Sériovo:        N08 → N09 → N10
```

## Mimostack (vedome mimo tohto DAG)

`SMO-B01` sample pack, `SMO-B02/B03` price-trail, `SMO-B10` inbound e-mail —
patria do Launch Studio / ingest stackov, **nie** do Concierge M1/M2.
