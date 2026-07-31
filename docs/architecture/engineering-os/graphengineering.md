---
Module: graph-engineering
Status: Reviewed
Gate: Brána 2 (3 platiaci zákazníci ALEBO meratelný spúšťač v §Kill kritériá)
DependsOn: [memory-engine-brana-0]
RelatedModules: [hybrid-retrieval]
LastReview: 2026-07-28
---

# graph-engineering — vzťahový graf organizačnej pamäte

**Cieľová cesta:** `docs/architecture/engineering-os/graph-engineering.md`
**Jedna veta:** vzťahy medzi kontaktmi, nehnuteľnosťami, obchodmi a kanceláriami
ako bi-temporálne hrany v Postgrese (`entity_edges`), s vopred zapísaným
meratelným spúšťačom pre prechod na dedikovaný graph engine.

## Why does this create an unfair advantage?

Konkurencia nedokáže skopírovať **históriu vzťahov, len ich aktuálny stav.**
Každé CRM na trhu (Realvia, Realsoft, backOFFICE) vie, že kontakt X vlastní
nehnuteľnosť Y *dnes*. Nikto z nich nevie odpovedať na: „ktorí majitelia, ktorí
pred 6 mesiacmi odmietli predaj cez konkurenta, majú nehnuteľnosť v lokalite,
kde naše obchody uzatvárame o 30 dní rýchlejšie?" — lebo na to treba hrany
s `valid_from`/`valid_to` naviazané na výsledky obchodov (`deal_outcomes`),
zbierané od prvého dňa.

Výhoda teda nevzniká v engine (ten si kúpi ktokoľvek), ale v **dĺžke a čistote
zozbieraného grafu**. Preto zberná schéma ide teraz (Brána 0) a engine až na
spúšťač — každý mesiac zberu je náskok, ktorý sa nedá dobehnúť kapitálom.

## Evidence

- **Inspired by:** Graphiti (Zep) — dátový model epizóda/entita/bi-temporálny
  fakt. Preberáme model, nie knižnicu.
- **Validated by:** ADR `adr-2026-07-28-memory-engine.md` — Q1 (Graphiti nie
  ako základ), Q2 (žiadna druhá DB, `entity_edges` v Postgrese), Q3 (Supabase
  source of truth, graf je odvodená projekcia), §4.2 (DDL), §4.4 (2-hop CTE).
- **Business Need:** North Star — neskopírovateľná organizačná pamäť. Vzťahy
  sú jej kostra; bez hrán je pamäť len zoznam faktov bez súvislostí.
- **Customer Impact:** maklér pri otvorení kontaktu vidí súvislosti („vlastní
  aj byt na Levočskej, sesternica predávala cez nás v 2025, cenové očakávanie
  vtedy −8 % od odhadu") — kontext, ktorý dnes existuje len v hlave majiteľa
  kancelárie a odchádza s ním.

## Cieľová architektúra

```
Supabase (source of truth)
   │  doménová zmena + memory_events (tá istá transakcia)
   ▼
Projekčný worker (service-role, jediný zapisovateľ)
   │
   ├─► memory_facts   (bi-temporálne fakty)
   └─► entity_edges   (bi-temporálne hrany)  ◄── tento modul
            │
            ├─ čítanie: 2-hop rekurzívne CTE (ADR §4.4)
            └─ hybrid-retrieval: graph expansion kandidátov (Brána 2)
```

**Dátový model:** tabuľka `entity_edges` podľa ADR §4.2 — `agency_id` (RLS),
`src_type/src_id → rel → dst_type/dst_id`, `weight`, `valid_from/valid_to`
(hrana sa nemaže, invaliduje sa), `source_event` (provenance povinná, K2).

**Počiatočný slovník `rel`** (rozšírenie = PR + GO, nie ad hoc string):
`owns` · `sold` · `interested_in` · `represented_by` · `related_to` ·
`co_owner_of` · `similar_to` (váha = skóre podobnosti).

**API placeholder:**

```ts
// súčasť MemoryStore (ADR §4.3) — žiadny nový service
neighbors(agencyId, subject: SubjectRef, opts?: {
  rels?: string[]; maxHops?: 1 | 2; asOf?: Date; limit?: number;
}): Promise<EdgeHit[]>
```

**Dedikovaný graph engine:** ŽIADNY na tejto bráne. Ak spúšťač padne, poradie
kandidátov je zapísané v ADR Q2 (1. FalkorDB, 2. Neo4j Community, …) a graf sa
znovu postaví z `memory_events` — presne preto je projekciou, nie zdrojom pravdy.

## Kill kritériá pre prechod do Approved

Modul smie do `Approved`, len ak platí VŠETKO:

1. Brána 0 ADR je `Implemented` (PR-1..PR-4 zmergované, `rebuild()` CI test zelený).
2. Existuje ≥1 reálny produktový use-case, ktorý číta hrany (nie „bolo by pekné").
3. p95 2-hop CTE na reálnych dátach zmerané a zapísané sem.
4. Cross-tenant RLS test na `entity_edges` existuje a je zelený.

**Kill (modul sa zastaví a ide na promote/re-bet/kill):**

- Do **60 dní od prvého produkčného čítania hrán** nepribudne žiadne ďalšie
  produkčné použitie (nový use-case ani opakované čítanie existujúceho) →
  graf nikto nepotrebuje, zber beží ďalej, modul spí. *(Pripomienka review
  28.07: hodiny bežia od prvého produkčného čítania, nie od Brány 0.)*
- Slovník `rel` prekročí 15 typov bez use-casov → modeluje sa svet namiesto
  produktu.

**Spúšťač prechodu na dedikovaný engine (z ADR Q1, meratelný):**
interaktívny traverz ≥3 hopy A p95 CTE >300 ms, ALEBO >5 mil. hrán/tenant,
ALEBO on-prem požiadavka vylučujúca Supabase.
**Measured as:** `entity_edges` per tenant in production DB
(`select agency_id, count(*) from entity_edges where valid_to is null
group by agency_id`); p95 z produkčného query logu, nie z lokálneho merania.

## Exit Criteria

- **This module leaves Specified when:** founder review je vykonaný a výsledok
  zapísaný (Approved / Needs changes). ✔ Splnené 2026-07-28 — výsledok
  Reviewed, pripomienky zapracované.
- **This module leaves Reviewed when:** founder vydá explicitné GO (Approved)
  A všetky podmienky zo sekcie „Kill kritériá pre prechod do Approved" sú
  splnené a doložené (linky na PR, merania, testy priamo v tomto súbore).
- **This module leaves Approved when:** implementačné PR zmergované, CI
  zelené vrátane cross-tenant RLS testu → founder príkazom prepne na
  Implemented.

## Review Notes

**Review 2026-07-28 — výsledok: Reviewed. Ready for Founder Approval.**
Zapracované: (1) kill kritérium kotvené na prvé produkčné čítanie hrán,
(2) Measured as pre spúšťač engine, (3) sekcia Exit Criteria.

## Open Questions

1. Extrakcia hrán z voľného textu (poznámky makléra) — deterministické
   pravidlá vs. LLM extraktor s `origin='ai'`, `canonical=false` (K6)?
   Návrh: začať len deterministickými (lead→contact, deal→property).
2. `similar_to` hrany — počítať pri zápise (worker) alebo lazy pri čítaní?
3. Merge duplicitných entít (ten istý majiteľ, 2 telefóny) — kedy a kto
   rozhoduje o zlúčení uzlov?

## Known Risks

- **Znečistenie prvého datasetu:** `SYSTEM_USAGE_AGENCY_ID` = Smolkovo
  agency_id — systémové hrany by tiekli do zákazníckeho grafu. Blokátor
  riešený v PR-1, nie tu, ale tento modul na ňom závisí.
- **AI-extrahované hrany ako fakty:** bez K6 (nie kanonické bez potvrdenia)
  graf postupne stratí dôveryhodnosť — jediná nezotaviteľná porucha.
- **Ontológia-plazenie:** každý nový `rel` typ je lákavý a zadarmo; slovník
  bez brzdy skončí ako 50 typov, ktoré nikto nečíta (preto kill kritérium 15).

## Out of Scope

Dedikovaná graph DB (Neo4j/FalkorDB/Kuzu/Memgraph) · GraphRAG · vizualizácia
grafu v UI · cross-tenant hrany (vzory medzi kanceláriami — Brána 2+ a vlastný
ADR kvôli GDPR) · real-time graph updates do UI · automatický entity merge.

## Future Evolution

Brána 2: graph expansion v hybrid-retrieval (kandidáti ±1–2 hopy) →
ak spúšťač padne, FalkorDB ako projekcia (rebuild z event logu, žiadna
migrácia dát) → cross-tenant anonymizované vzory („v tejto lokalite predávajú
majitelia s hranou X o N dní rýchlejšie") ako súčasť Knowledge vrstvy (rebrík
ADR Q10) — to je moment, keď sa graf stane priamym predajným argumentom.
