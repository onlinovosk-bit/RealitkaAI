# ⛔ SPOILER WARNING — NEOTVÁRAJ PRED HÁDANÍM

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   SPOILER / KĽÚČ K SLEPÉMU TESTU C2                          ║
║                                                              ║
║   Otvor AŽ PO tom, čo founder napísal verdikt                ║
║   (preferujem A/B + ktorý je ľudský).                        ║
║                                                              ║
║   Predčasné otvorenie = test neplatný.                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

# C2 blind KEY — listing generator

**Test list:** `docs/prompts/listing-generator-C2-blind-TEST.md`  
**Randomizácia:** `Math.random()` coin flip (Node), 2026-08-07.

## Kľúč

### 1) Teriakovce (dom)

| Slot | Zdroj |
|------|--------|
| **Text A** | promptová (`portal_text` z K3 / `t2-terakovce.json`) |
| **Text B** | ľudský golden (`docs/sales/smolko-inzeraty-3x-2026-08-06.md` §1 Hlavný text) |

### 2) Ľubotice (pozemok)

| Slot | Zdroj |
|------|--------|
| **Text A** | promptová (`portal_text` z K3 / `t3-lubotice.json`) |
| **Text B** | ľudský golden (`docs/sales/smolko-inzeraty-3x-2026-08-06.md` §2 Hlavný text) |

## Ako vyhodnotiť po hádani

- Founder **nepoznal** ľudský / **preferuje** Text A (prompt) → **PASS** pre daný pár
- Founder **na prvý pohľad** spoznal Text B ako ľudský → **FAIL** + zaznamenať čo prezradilo
- C2 celkovo: PASS len ak oba páry splnia PASS kritérium (alebo founder potvrdí celkový PASS podľa dohody)

## Poznámka pre scoring (po teste)

Žiadny zásah do promptu / PR-A z tohto súboru. Len verdikt foundera.
