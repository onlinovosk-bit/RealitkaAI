# Smolko Website Concierge — PROMPT STACKS

**Cieľ:** dostať požiadavku p. Smolka (verejný chatbot / Website Concierge)
zo stavu „rozbité na brány“ do stavu, kde každá brána má **buď PASS s dôkazom,
alebo explicitný HUMAN/GO/BLOCKED** — bez falošného „už máme“.

**Autorita vrstiev (pri rozpore platí nižšie číslo):**

```
S0  docs/prompts/runner/00-system.md          + S0-system.md (Smolko doplnky)
S1  S1-project.md
S2–S7  nodes/N*.md                             (jeden uzol = jeden worker)
```

**Kanónické zdroje pravdy (read, neprepisuj bez GO):**

- `docs/briefs/reality-smolko-blocking-conditions-register.md`
- `docs/reports/2026-09-06-smolko-chatbot-status.md`
- `docs/architecture/reality-smolko-property-revenue-system-v1.md`
- `docs/prompts/runner/*` (ústava Runnera)

**Čo tento stack NIE JE:** jeden agent, ktorý „opraví všetko naraz“.
Je to **DAG + vlny + sedem vrstiev na uzol**, aby sa dalo paralelne stavať
len to, čo je disjunktné, a zastaviť sa na GO, ktoré agent nesmie obísť.

---

## Výsledok, ktorý znamená „hotové“

| Milestone | Podmienka |
|---|---|
| **M1 — Safe public read MVP** | N01 cleanup + N04 B04 PROD PASS + N05 B05 GO + N06 B06 PASS + N07 Concierge read-only live |
| **M2 — Booking** | M1 + N08 B07 PROD PASS + N09 B08 PASS + N10 B09 PASS |

Bez M1 sa **nesmie** sľubovať p. Smolkovi „chatbot funguje“.
Bez M2 sa **nesmie** sľubovať potvrdený termín v kalendári.

---

## Ako spustiť

1. **AUDIT MODE** (default): orchestrátor/agent načíta `dag.md` + `waves.md`,
   overí stav brán príkazmi, zapíše report do `docs/reports/`.
2. **EXECUTION MODE:** až po písomnom GO foundera nad konkrétnou vlnou
   (napr. „GO W1“). Worker dostane **iba jeden** `nodes/Nxx-*.md` + S0 + S1.
3. Push/PR/merge robí orchestrátor/founder podľa `docs/prompts/runner/00-system.md`.
   Worker **nepushuje do main**, **neaplikuje migrácie**, **nepíše do prod DB**.

Šablóna spustenia workera:

```text
Si worker uzla <Nxx>.
Načítaj v poradí:
  1) docs/prompts/runner/00-system.md
  2) docs/prompts/smolko-website-concierge/S0-system.md
  3) docs/prompts/smolko-website-concierge/S1-project.md
  4) docs/prompts/smolko-website-concierge/nodes/<Nxx-...>.md
Dodrž write-set. Na konci odovzdaj HANDOFF blok doslovne.
```

---

## Mapa súborov

| Súbor | Úloha |
|---|---|
| `S0-system.md` | Smolko doplnky k ústave (CODE≠PROD, GO map) |
| `S1-project.md` | Kontext Concierge, čo overiť pred prácou |
| `dag.md` | Závislosti uzlov |
| `waves.md` | Neskrížené vlny + write-probe |
| `nodes/N00-reconcile.md` | Zosúladiť register so stromom |
| `nodes/N01-cleanup-misplaced-crm-chat.md` | #544 — odstrániť dashboard chat |
| `nodes/N04-smo-b04-prod-evidence.md` | PROD dôkaz tenancy/freshness |
| `nodes/N05-smo-b05-privacy-faq.md` | Draft disclosure/FAQ → HUMAN GO |
| `nodes/N06-smo-b06-callback-routing.md` | Routing matrix + E2E kontrakt |
| `nodes/N07-public-concierge-read-mvp.md` | Verejný read-only Concierge |
| `nodes/N08-smo-b07-scheduled-events-prep.md` | Prep migrácie (bez apply) |
| `nodes/N09-smo-b08-google-calendar.md` | Calendar scopes + free/busy |
| `nodes/N10-smo-b09-idempotency-notify.md` | Idempotency + notifikácie |

---

## GO / HUMAN brány (agent ich nesmie „prejsť“ sám)

| Brána | Kto | Bez toho |
|---|---|---|
| GO-B04-PROD | Founder / ops s read-only prod prístupom | B04 ostáva BLOCKED |
| GO-B05-COPY | Founder + Privacy + Smolko | žiadny public traffic |
| GO-B06-ROUTING | p. Smolko + Product | callback fallback only |
| GO-B07-DB | Founder DB GO | žiadny booking write |
| GO-B08-OAUTH | Google admin + Smolko | žiadny real calendar |
| GO-W3-SHIP | Founder | N07 neide na produkčný web |

Ak uzol narazí na chýbajúce GO → výstup `BLOCKED` + čo presne treba podpísať.
**Nesimuluj PASS.**
