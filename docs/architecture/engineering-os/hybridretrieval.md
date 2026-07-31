---
Module: hybrid-retrieval
Status: Reviewed
Gate: Brána 1 (v1 po eval sete) · Brána 2 (v2 — graph expansion + rerank)
DependsOn: [memory-engine-brana-0]
RelatedModules: [graph-engineering]
LastReview: 2026-07-28
---

# hybrid-retrieval — vyhľadávanie v organizačnej pamäti

**Cieľová cesta:** `docs/architecture/engineering-os/hybrid-retrieval.md`
**Jedna veta:** jeden index, viac signálov — SQL filter + keyword + vektor,
fúzia cez RRF, provenance a recency ako boost; každá zmena meraná proti eval
setu 50 reálnych otázok, nikdy proti pocitu.

## Why does this create an unfair advantage?

Retrieval sám o sebe výhodu nevytvára — pgvector + RRF si postaví ktokoľvek
za víkend. Neskopírovateľné sú tri vstupy, ktoré doň tečú len u nás:

1. **Destiláty namiesto dokumentov** — vyhľadáva sa nad faktami s provenance
   a bi-temporálnou platnosťou (ADR Q7), nie nad chunkami PDF. Konkurencia
   indexuje texty; my indexujeme overené tvrdenia s pôvodom a časom platnosti.
2. **Provenance boost** — fakt potvrdený človekom alebo výsledkom obchodu
   (`canonical=true`) váži viac ako AI dohad (K6). Kvalita rankingu rastie
   s každým uzavretým obchodom — dáta, ktoré konkurent nemá.
3. **Eval set z reálnej prevádzky** — 50 otázok, ktoré si makléri naozaj
   kladú, s očakávanými odpoveďami. To je destilát 18 mesiacov kontaktu so
   zákazníkmi, nie prompt-inžinierstvo.

Advantage = dáta × disciplína merania, nie algoritmus.

## Evidence

- **Inspired by:** štandardný hybrid-search vzor (BM25 + dense + RRF fúzia,
  Reciprocal Rank Fusion — bez ladenia váh); bi-temporálne dotazy z Graphiti.
- **Validated by:** ADR `adr-2026-07-28-memory-engine.md` — Q8 (poradie podľa
  prínos/náklad, eval-first pravidlo), Q5 (typy pamäte ako filtre, nie
  samostatné retrievery), §4.3 (`MemoryStore.search/context`).
- **Business Need:** pamäť bez vyhľadania je archív. Každá AI funkcia produktu
  (triage, follow-up návrhy, kontext pre agenta) stojí na `context()`.
- **Customer Impact:** maklér/AI dostane pri práci s leadom správny kontext
  do 1 sekundy — vrátane „čo sme vedeli v marci" (asOf dotaz), čo žiadne
  CRM na trhu nevie.

## Cieľová architektúra

```
MemoryQuery { agencyId, query, subjectTypes?, layers?, asOf?, limit? }
   │
   ▼
1. SQL filter        tenant + subject + čas (tvrdé, vždy prvé — RLS + asOf)
2. Keyword (BM25)    pg_trgm / tsvector nad object_text
3. Vektor            pgvector HNSW nad destilátmi (nie raw chunkami)
   │
   ▼
4. Fúzia RRF         score = Σ 1/(60 + rank_i)   — bez ladených váh
5. Boosty            canonical=true ↑ · origin='human' ↑ · recency decay
   │
   ▼                                            [Brána 2]
6. Graph expansion   kandidáti ±1–2 hopy (entity_edges) — preskórovanie
7. Cross-encoder     rerank top-50 → top-10 — len ak eval ukáže potrebu
   │
   ▼
MemoryHit[]  — každý hit nesie sourceEventId; bez zdroja sa nezobrazuje
```

**Dátový model:** žiadne nové tabuľky — indexy z ADR §4.2 (`hnsw` na
`embedding`, `gin_trgm` na `object_text`, partial indexy na `valid_to is null`).

**API placeholder:** `MemoryStore.search(q)` a `MemoryStore.context(agencyId,
subject, asOf?)` podľa ADR §4.3. Interné kroky 1–5 nie sú verejný kontrakt —
smú sa meniť bez ADR, pokiaľ eval neklesne.

**Eval harness (podmienka existencie modulu):**
`evals/memory/questions.jsonl` — 50 otázok `{query, agencyId, expected_fact_ids,
asOf?}` · metriky recall@10 a MRR · beží v CI · každý PR do retrievalu ukazuje
pred/po. Baseline pre v1: recall@10 ≥ 0.8 na eval sete.

## Kill kritériá pre prechod do Approved

Modul smie do `Approved`, len ak platí VŠETKO:

1. Brána 0 ADR `Implemented` a `memory_facts` obsahuje reálne destiláty
   (nie fixtures) aspoň z 30 dní prevádzky.
2. Eval set 50 otázok existuje a je schválený founderom (otázky sú obchodne
   reálne, nie syntetické).
3. Kroky 1–2 (SQL + keyword) merané samostatne — ak samy dosiahnu
   recall@10 ≥ 0.8, vektorová vrstva sa odkladá a modul sa zužuje.
4. Odhad mesačného nákladu na embeddingy zapísaný sem (počet faktov × model).

**Kill (zastaviť a promote/re-bet/kill):**

- Do 1.9. nevznikol eval set (kill kritérium už zapísané v ADR §5 — znamená,
  že pamäť nikto reálne nepoužíva).
- RRF + boosty nedosiahnu recall@10 ≥ 0.8 ani po 2 iteráciách → problém je
  v destilátoch (vstupné dáta), nie v retrievale — vrátiť sa k Q7, nie
  pridávať kroky 6–7.
  **Measured against an approved evaluation dataset. Dataset requirements
  must be defined in ADR before approval.** *(Pripomienka review 28.07 —
  požiadavky na dataset: dodatok k ADR `adr-2026-07-28-memory-engine.md`,
  navrhnem ho pred prechodom do Approved.)*

**Spúšťač v2 (Brána 2):** eval preukáže triedu otázok, ktorú kroky 1–5
neriešia (multi-hop vzťahové otázky) A graph-engineering má use-case ≥1.

## Exit Criteria

- **This module leaves Specified when:** founder review je vykonaný a výsledok
  zapísaný (Approved / Needs changes). ✔ Splnené 2026-07-28 — výsledok
  Reviewed, pripomienky zapracované.
- **This module leaves Reviewed when:** founder vydá explicitné GO (Approved)
  A požiadavky na evaluačný dataset sú definované v ADR A všetky podmienky
  zo sekcie „Kill kritériá pre prechod do Approved" sú splnené a doložené.
- **This module leaves Approved when:** retrieval v1 zmergovaný, eval beží
  v CI s baseline recall@10 ≥ 0.8 → founder príkazom prepne na Implemented.

## Review Notes

**Review 2026-07-28 — výsledok: Reviewed. Ready for Founder Approval.**
Zapracované: (1) kill kritérium viazané na schválený evaluačný dataset
s požiadavkami definovanými v ADR pred approvalom, (2) sekcia Exit Criteria.

## Open Questions

1. Embedding model a dimenzia — ADR §4.1 predpokladá 1536; potvrdiť podľa
   reálne používaného modelu pred PR-1 (zmena dimenzie = reindex).
2. `context()` — fixný rozpočet hitov (top-K) alebo tokenový rozpočet podľa
   volajúceho promptu?
3. Kto píše prvých 50 eval otázok — founder sám, alebo AI návrh 100 → founder
   škrtá na 50? (Návrh: druhé.)
4. Recency decay polčas — 90 dní ako štart? Kalibrovať na eval sete, nie
   diskusiou.

## Known Risks

- **Otrava indexu prepismi:** ak sa do embeddingov dostanú raw epizódy
  namiesto destilátov, kvalita klesne plošne a ticho (najčastejšie zlyhanie
  RAG systémov — ADR Q7). Poistka: embedding vzniká len pre `layer != 'raw'`.
- **Eval set ako formalita:** 50 syntetických otázok od AI prejde vždy —
  a nemeria nič. Preto schválenie foundera v kill kritériách.
- **Predčasná optimalizácia krokov 6–7:** pri ~440 kontaktoch prvého zákazníka
  vyriešia kroky 1–2 veľkú väčšinu dotazov; každý ďalší krok je latencia
  a náklad, ktorý musí eval obhájiť.
- **asOf dotazy vs. výkon:** bi-temporálne čítanie obchádza partial indexy
  (`valid_to is null`) — merať samostatne, prípadne samostatný index.

## Out of Scope

Samostatné retrievery per typ pamäte (sú to filtre — ADR Q5) · fine-tuning
embedding modelu · query rewriting/HyDE · agentic multi-step retrieval ·
vyhľadávanie naprieč tenantmi · UI vyhľadávania pre koncového makléra
(tento modul je interná služba pre AI funkcie; produktové UI = Customer
Feature so zákazníckym signálom).

## Future Evolution

Brána 2: graph expansion (krok 6) → cross-encoder rerank (krok 7, len na
dôkaz z evalu) → retrieval nad Knowledge/Playbook vrstvou rebríka (ADR Q10),
kde odpoveď nie je fakt ale overený vzor → per-tenant kalibrácia boostov
podľa výsledkov obchodov — moment, keď sa ranking učí z moatu a stáva sa
sám neskopírovateľným.
